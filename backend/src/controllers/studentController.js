const { getDb } = require('../utils/db');
const { verifyPassword } = require('../services/authService');
const { getCorrectAnswers, gradeExam } = require('../services/examService');
const { logAudit, ACTIONS } = require('../services/auditService');

// Helper to get IP address
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        'unknown';
}

async function studentLogin(req, res) {
    let db;
    const { exam_code, password } = req.body;

    if (!exam_code || !password) {
        logAudit({
            action: ACTIONS.STUDENT_LOGIN_FAILED,
            userType: 'student',
            userIdentifier: exam_code || 'unknown',
            details: 'Login failed: Missing exam_code or password',
            ipAddress: getClientIp(req),
            status: 'failure'
        });
        return res.status(400).json({ error: 'Exam code and password required' });
    }

    try {
        db = getDb();
        const stmt = db.prepare('SELECT * FROM students WHERE exam_code = ?');
        const student = stmt.get(exam_code);

        if (!student) {
            logAudit({
                action: ACTIONS.STUDENT_LOGIN_FAILED,
                userType: 'student',
                userIdentifier: exam_code,
                details: 'Login failed: Invalid exam code',
                ipAddress: getClientIp(req),
                status: 'failure'
            });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!student.password_hash) {
            return res.status(500).json({ error: 'Student record missing password hash' });
        }

        const isValid = await verifyPassword(password, student.password_hash);
        if (!isValid) {
            logAudit({
                action: ACTIONS.STUDENT_LOGIN_FAILED,
                userType: 'student',
                userIdentifier: exam_code,
                details: 'Login failed: Invalid password',
                ipAddress: getClientIp(req),
                status: 'failure',
                metadata: { studentId: student.id }
            });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const examStmt = db.prepare(`
            SELECT e.subject, e.duration_minutes
            FROM exams e
                     LEFT JOIN submissions sub ON sub.student_id = ? AND sub.subject = e.subject
            WHERE e.class = ? AND e.is_active = 1 AND sub.id IS NULL
        `);
        const activeExams = examStmt.all(student.id, student.class);

        if (activeExams.length === 0) {
            return res.status(404).json({ error: 'No active untaken exams' });
        }

        const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim();

        // Audit log - successful login
        logAudit({
            action: ACTIONS.STUDENT_LOGIN,
            userType: 'student',
            userIdentifier: exam_code,
            details: `Student logged in: ${fullName}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: {
                studentId: student.id,
                class: student.class,
                availableExams: activeExams.length
            }
        });

        res.json({
            student_id: student.id,
            full_name: fullName,
            class: student.class,
            active_exams: activeExams
        });
    } catch (error) {
        console.error('💥 StudentLogin - Error details:', error);
        res.status(500).json({ error: 'Server error during login' });
    } finally {
        if (db) db.close();
    }
}

function getExamQuestions(req, res) {
    let db;
    try {
        const { subject } = req.params;
        const { exam_code } = req.query;
        if (!exam_code) {
            return res.status(400).json({ error: 'exam_code required' });
        }

        db = getDb();

        const studentStmt = db.prepare(`
            SELECT s.id, s.class, s.first_name, s.last_name
            FROM students s
            JOIN exams e ON s.class = e.class
            LEFT JOIN submissions sub ON sub.student_id = s.id AND sub.subject = e.subject
            WHERE s.exam_code = ? AND e.subject = ? AND e.is_active = 1 AND sub.id IS NULL
        `);
        const student = studentStmt.get(exam_code, subject);

        if (!student) {
            return res.status(403).json({ error: 'Access denied or already submitted for this subject' });
        }

        const questionsStmt = db.prepare(`
            SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d
            FROM questions q
            JOIN exams e ON q.exam_id = e.id
            WHERE e.subject = ? AND e.class = ?
        `);
        const questions = questionsStmt.all(subject, student.class);

        // Audit log
        logAudit({
            action: ACTIONS.EXAM_STARTED,
            userType: 'student',
            userIdentifier: exam_code,
            details: `Started exam: ${subject}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: {
                studentId: student.id,
                subject,
                questionCount: questions.length
            }
        });

        res.json({ subject, questions });
    } catch (error) {
        console.error('💥 getExamQuestions - Error details:', error);
        res.status(500).json({ error: 'Questions fetch failed' });
    } finally {
        if (db) db.close();
    }
}

async function submitExam(req, res) {
    let db;
    try {
        const {exam_code, answers, subject} = req.body;
        if (!exam_code || !answers || !subject) {
            return res.status(400).json({error: 'exam_code, answers, and subject required'});
        }

        db = getDb();

        const studentStmt = db.prepare(`
            SELECT s.id, s.class, s.first_name, s.last_name
            FROM students s
            LEFT JOIN submissions sub ON sub.student_id = s.id AND sub.subject = ?
            WHERE s.exam_code = ?
              AND sub.id IS NULL
        `);
        const student = studentStmt.get(subject, exam_code);

        if (!student) {
            logAudit({
                action: ACTIONS.EXAM_SUBMISSION_FAILED,
                userType: 'student',
                userIdentifier: exam_code,
                details: `Submission failed: Invalid or already submitted for ${subject}`,
                ipAddress: getClientIp(req),
                status: 'failure'
            });
            return res.status(403).json({error: 'Invalid or already submitted for this subject'});
        }

        const examStmt = db.prepare('SELECT subject FROM exams WHERE class = ? AND subject = ? AND is_active = 1');
        const exam = examStmt.get(student.class, subject);

        if (!exam) {
            return res.status(400).json({error: 'No active exam for this subject'});
        }

        const correctAnswers = await getCorrectAnswers(exam.subject, student.class);
        const total = Object.keys(correctAnswers).length;
        const score = gradeExam(answers, correctAnswers);

        const subStmt = db.prepare(`
            INSERT INTO submissions (student_id, subject, answers, score, total_questions)
            VALUES (?, ?, ?, ?, ?)
        `);
        subStmt.run(student.id, exam.subject, JSON.stringify(answers), score, total);

        const percentage = total ? Math.round((score / total) * 100) : 0;

        // Audit log - successful submission
        logAudit({
            action: ACTIONS.EXAM_SUBMITTED,
            userType: 'student',
            userIdentifier: exam_code,
            details: `Submitted ${subject} exam: ${score}/${total} (${percentage}%)`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: {
                studentId: student.id,
                studentName: `${student.first_name} ${student.last_name}`,
                subject,
                score,
                total,
                percentage
            }
        });

        res.json({score, total, percentage});
    } catch (error) {
        console.error('💥 submitExam - Error details:', error);
        logAudit({
            action: ACTIONS.EXAM_SUBMISSION_FAILED,
            userType: 'student',
            userIdentifier: exam_code,
            details: `Submission error: ${error.message}`,
            ipAddress: getClientIp(req),
            status: 'failure'
        });
        res.status(500).json({error: 'Grading failed'});
    } finally {
        if (db) db.close();
    }
}

module.exports = { studentLogin, getExamQuestions, submitExam };