const { run, get, all } = require('../utils/db');
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

    // Validate input
    if (!exam_code || !password) {
        return res.status(400).json({
            error: 'Please provide both exam code and password'
        });
    }

    try {
        // Find student
        const student = await get('SELECT * FROM students WHERE exam_code = ?', [exam_code]);

        // Check if student exists
        if (!student) {
            await logAudit({
                action: ACTIONS.STUDENT_LOGIN_FAILED,
                userType: 'student',
                userIdentifier: exam_code,
                details: 'Student not found',
                ipAddress: getClientIp(req),
                status: 'failure'
            });
            return res.status(401).json({
                error: 'Invalid exam code or password. Please check your credentials.'
            });
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, student.password_hash);
        if (!isPasswordValid) {
            await logAudit({
                action: ACTIONS.STUDENT_LOGIN_FAILED,
                userType: 'student',
                userIdentifier: exam_code,
                details: 'Invalid password',
                ipAddress: getClientIp(req),
                status: 'failure'
            });
            return res.status(401).json({
                error: 'Invalid exam code or password. Please check your credentials.'
            });
        }

        // Check for active exams for this student's class
        const activeExams = await all(`
            SELECT e.subject, e.duration_minutes, e.class
            FROM exams e
            LEFT JOIN submissions sub ON sub.student_id = ? AND sub.subject = e.subject
            WHERE e.class = ? AND e.is_active = 1 AND sub.id IS NULL
        `, [student.id, student.class]);

        // Check if there are any active exams available
        if (!activeExams || activeExams.length === 0) {
            await logAudit({
                action: ACTIONS.STUDENT_LOGIN_FAILED,
                userType: 'student',
                userIdentifier: exam_code,
                details: 'No active exams available',
                ipAddress: getClientIp(req),
                status: 'failure'
            });
            return res.status(403).json({
                error: 'No active exams available for your class at this time. Please contact your administrator.'
            });
        }

        // Successful login
        await logAudit({
            action: ACTIONS.STUDENT_LOGIN,
            userType: 'student',
            userIdentifier: exam_code,
            details: `Successful login - ${activeExams.length} exam(s) available`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: {
                studentId: student.id,
                class: student.class,
                examCount: activeExams.length
            }
        });

        // Return student data with active_exams (IMPORTANT: Frontend expects 'active_exams' not 'exams')
        res.json({
            student_id: student.id,
            full_name: `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim(),
            class: student.class,
            exam_code: student.exam_code,
            active_exams: activeExams  // ✅ FIXED: Changed from 'exams' to 'active_exams'
        });
    } catch (error) {
        console.error('studentLogin error:', error);
        await logAudit({
            action: ACTIONS.STUDENT_LOGIN_FAILED,
            userType: 'student',
            userIdentifier: exam_code || 'unknown',
            details: 'System error during login',
            ipAddress: getClientIp(req),
            status: 'failure',
            metadata: { error: error.message }
        });
        res.status(500).json({
            error: 'Login failed due to a system error. Please try again or contact your administrator.'
        });
    }
}

async function getExamQuestions(req, res) {
    try {
        const { subject } = req.params;
        const { exam_code } = req.query;

        if (!exam_code) {
            return res.status(400).json({
                error: 'Exam code is required'
            });
        }

        // Verify student and exam access
        const student = await get(`
            SELECT s.id, s.class, s.first_name, s.last_name
            FROM students s
                     JOIN exams e ON s.class = e.class
                     LEFT JOIN submissions sub ON sub.student_id = s.id AND sub.subject = e.subject
            WHERE s.exam_code = ? AND e.subject = ? AND e.is_active = 1 AND sub.id IS NULL
        `, [exam_code, subject]);

        if (!student) {
            return res.status(403).json({
                error: 'You do not have access to this exam, or you have already submitted it.'
            });
        }

        // Get questions
        const questions = await all(`
            SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d
            FROM questions q
                     JOIN exams e ON q.exam_id = e.id
            WHERE e.subject = ? AND e.class = ?
        `, [subject, student.class]);

        if (!questions || questions.length === 0) {
            return res.status(404).json({
                error: 'No questions found for this exam. Please contact your administrator.'
            });
        }

        // Audit log
        await logAudit({
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

        res.json({
            subject,
            questions,
            student_name: `${student.first_name} ${student.last_name}`,
            class: student.class
        });
    } catch (error) {
        console.error('getExamQuestions error:', error);
        res.status(500).json({
            error: 'Failed to load exam questions. Please try again or contact your administrator.'
        });
    }
}

async function submitExam(req, res) {
    const { exam_code, answers, subject } = req.body;

    if (!exam_code || !answers || !subject) {
        return res.status(400).json({
            error: 'Missing required information. Please try again.'
        });
    }

    try {
        // Verify student and check for duplicate submission
        const student = await get(`
            SELECT s.id, s.class FROM students s
                                          LEFT JOIN submissions sub ON sub.student_id = s.id AND sub.subject = ?
            WHERE s.exam_code = ? AND sub.id IS NULL
        `, [subject, exam_code]);

        if (!student) {
            return res.status(403).json({
                error: 'Invalid submission or you have already submitted this exam.'
            });
        }

        // Get correct answers and grade
        const correctAnswers = await getCorrectAnswers(subject, student.class);

        if (!correctAnswers || Object.keys(correctAnswers).length === 0) {
            return res.status(500).json({
                error: 'Unable to grade exam. Please contact your administrator.'
            });
        }

        const score = gradeExam(answers, correctAnswers);
        const total = Object.keys(correctAnswers).length;
        const percentage = Math.round((score / total) * 100);

        // Save submission
        await run(`
            INSERT INTO submissions (student_id, subject, answers, score, total_questions)
            VALUES (?, ?, ?, ?, ?)
        `, [student.id, subject, JSON.stringify(answers), score, total]);

        // Audit log
        await logAudit({
            action: ACTIONS.EXAM_SUBMITTED,
            userType: 'student',
            userIdentifier: exam_code,
            details: `Submitted ${subject} - Score: ${score}/${total} (${percentage}%)`,
            status: 'success',
            metadata: {
                studentId: student.id,
                subject,
                score,
                total,
                percentage
            }
        });

        res.json({
            success: true,
            score,
            total,
            percentage,
            message: `Exam submitted successfully! You scored ${score} out of ${total} (${percentage}%)`
        });
    } catch (error) {
        console.error('submitExam error:', error);
        await logAudit({
            action: ACTIONS.EXAM_SUBMISSION_FAILED,
            userType: 'student',
            userIdentifier: exam_code || 'unknown',
            details: 'Submission failed due to system error',
            status: 'failure',
            metadata: { error: error.message }
        });
        res.status(500).json({
            error: 'Failed to submit exam. Please try again or contact your administrator.'
        });
    }
}

module.exports = { studentLogin, getExamQuestions, submitExam };