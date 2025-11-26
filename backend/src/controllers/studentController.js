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
    const { exam_code, password } = req.body;
    if (!exam_code || !password) return res.status(400).json({ error: 'Credentials required' });

    try {
        const student = await get('SELECT * FROM students WHERE exam_code = ?', [exam_code]);
        if (!student || !(await verifyPassword(password, student.password_hash))) {
            logAudit({ action: ACTIONS.STUDENT_LOGIN_FAILED, userType: 'student', userIdentifier: exam_code, ipAddress: getClientIp(req), status: 'failure' });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const activeExams = await all(`
            SELECT e.subject, e.duration_minutes
            FROM exams e
            LEFT JOIN submissions sub ON sub.student_id = ? AND sub.subject = e.subject
            WHERE e.class = ? AND e.is_active = 1 AND sub.id IS NULL
        `, [student.id, student.class]);

        logAudit({ action: ACTIONS.STUDENT_LOGIN, userType: 'student', userIdentifier: exam_code, ipAddress: getClientIp(req), status: 'success' });

        res.json({
            student_id: student.id,
            full_name: `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim(),
            class: student.class,
            exams: activeExams
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
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
    const { exam_code, answers, subject } = req.body;
    if (!exam_code || !answers || !subject) return res.status(400).json({ error: 'Missing data' });

    try {
        const student = await get(`
            SELECT s.id, s.class FROM students s
            LEFT JOIN submissions sub ON sub.student_id = s.id AND sub.subject = ?
            WHERE s.exam_code = ? AND sub.id IS NULL
        `, [subject, exam_code]);

        if (!student) return res.status(403).json({ error: 'Invalid or already submitted' });

        const correctAnswers = await getCorrectAnswers(subject, student.class);
        const score = gradeExam(answers, correctAnswers);
        const total = Object.keys(correctAnswers).length;

        await run(`
            INSERT INTO submissions (student_id, subject, answers, score, total_questions)
            VALUES (?, ?, ?, ?, ?)
        `, [student.id, subject, JSON.stringify(answers), score, total]);

        logAudit({ action: ACTIONS.EXAM_SUBMITTED, userType: 'student', userIdentifier: exam_code, status: 'success' });

        res.json({ score, total, percentage: Math.round((score / total) * 100) });
    } catch (error) {
        logAudit({ action: ACTIONS.EXAM_SUBMISSION_FAILED, userType: 'student', userIdentifier: exam_code || 'unknown', status: 'failure' });
        res.status(500).json({ error: 'Submission failed' });
    }
}
module.exports = { studentLogin, getExamQuestions, submitExam };