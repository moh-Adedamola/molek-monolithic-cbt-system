const { get, all, run } = require('../utils/db');
const { verifyPassword } = require('../services/authService');
const { getQuestionsWithAnswers, gradeExam } = require('../services/examService');
const { logAudit, ACTIONS } = require('../services/auditService');

// Helper to get IP address
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        'unknown';
}

/**
 * Student Login
 * POST /api/students/login
 */
async function login(req, res) {
    try {
        const { admission_number, password } = req.body;

        if (!admission_number || !password) {
            return res.status(400).json({
                error: 'Admission number and password are required'
            });
        }

        console.log(`🔐 Login attempt: ${admission_number}`);

        // Find student by admission number
        const student = await get(
            'SELECT * FROM students WHERE admission_number = ?',
            [admission_number.toUpperCase()]
        );

        if (!student) {
            console.log(`❌ Student not found: ${admission_number}`);

            await logAudit({
                action: ACTIONS.STUDENT_LOGIN_FAILED,
                userType: 'student',
                userIdentifier: admission_number,
                details: 'Invalid admission number',
                ipAddress: getClientIp(req),
                status: 'failure'
            });

            return res.status(404).json({
                error: 'Student not found'
            });
        }

        // Verify password
        const isValid = await verifyPassword(password, student.password_hash);

        if (!isValid) {
            console.log(`❌ Invalid password for: ${admission_number}`);

            await logAudit({
                action: ACTIONS.STUDENT_LOGIN_FAILED,
                userType: 'student',
                userIdentifier: admission_number,
                details: 'Invalid password',
                ipAddress: getClientIp(req),
                status: 'failure'
            });

            return res.status(401).json({
                error: 'Invalid password'
            });
        }

        // Get active exams for this student's class
        const activeExams = await all(
            'SELECT subject, duration_minutes FROM exams WHERE class = ? AND is_active = 1',
            [student.class]
        );

        console.log(`✅ Login successful: ${admission_number}`);

        await logAudit({
            action: ACTIONS.STUDENT_LOGIN,
            userType: 'student',
            userIdentifier: admission_number,
            details: `Login successful: ${student.first_name} ${student.last_name}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { class: student.class, activeExamsCount: activeExams.length }
        });

        res.json({
            success: true,
            student_id: student.id,
            admission_number: student.admission_number,
            full_name: `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim(),
            class: student.class,
            active_exams: activeExams
        });

    } catch (error) {
        console.error('❌ Student login error:', error);
        res.status(500).json({
            error: 'Login failed. Please try again.'
        });
    }
}

/**
 * Get Exam Questions - ✅ UPDATED to use admission_number
 * GET /api/students/exam/:subject/questions?admission_number=...
 */
async function getExamQuestions(req, res) {
    try {
        const { subject } = req.params;
        const { admission_number } = req.query;

        if (!admission_number) {
            return res.status(400).json({ error: 'Admission number required' });
        }

        console.log(`📚 Loading exam: ${subject} for ${admission_number}`);

        // Get student info
        const student = await get(
            'SELECT id, class, first_name, last_name FROM students WHERE admission_number = ?',
            [admission_number.toUpperCase()]
        );

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Get exam
        const exam = await get(
            'SELECT * FROM exams WHERE subject = ? AND class = ? AND is_active = 1',
            [subject, student.class]
        );

        if (!exam) {
            return res.status(404).json({
                error: 'No active exam found for this subject'
            });
        }

        // Get questions (including theory questions)
        const questions = await all(
            `SELECT id, question_text, option_a, option_b, option_c, option_d, 
                    question_type, image_url, points 
             FROM questions 
             WHERE exam_id = ?
             ORDER BY id`,
            [exam.id]
        );

        console.log(`📝 Loaded ${questions.length} questions`);

        // Check if student already submitted
        const existingSubmission = await get(
            'SELECT id FROM submissions WHERE student_id = ? AND subject = ?',
            [student.id, subject]
        );

        if (existingSubmission) {
            return res.status(400).json({
                error: 'You have already submitted this exam',
                already_submitted: true
            });
        }

        // Get or create exam session
        let session = await get(
            'SELECT * FROM exam_sessions WHERE student_id = ? AND subject = ?',
            [student.id, subject]
        );

        if (!session) {
            // Create new session
            await run(
                `INSERT INTO exam_sessions (student_id, subject, start_time, time_remaining)
                 VALUES (?, ?, datetime('now'), ?)`,
                [student.id, subject, exam.duration_minutes * 60]
            );

            session = await get(
                'SELECT * FROM exam_sessions WHERE student_id = ? AND subject = ?',
                [student.id, subject]
            );

            console.log(`✅ Started new exam session`);

            await logAudit({
                action: ACTIONS.EXAM_STARTED,
                userType: 'student',
                userIdentifier: admission_number,
                details: `Started exam: ${subject}`,
                ipAddress: getClientIp(req),
                status: 'success',
                metadata: { subject, examId: exam.id }
            });
        } else {
            console.log(`🔄 Resumed existing exam session`);

            await logAudit({
                action: ACTIONS.EXAM_RESUMED,
                userType: 'student',
                userIdentifier: admission_number,
                details: `Resumed exam: ${subject}`,
                ipAddress: getClientIp(req),
                status: 'success',
                metadata: { subject, sessionId: session.id }
            });
        }

        res.json({
            exam: {
                id: exam.id,
                subject: exam.subject,
                duration_minutes: exam.duration_minutes,
                total_questions: questions.length
            },
            questions: questions.map(q => ({
                id: q.id,
                question_text: q.question_text,
                option_a: q.option_a,
                option_b: q.option_b,
                option_c: q.option_c,
                option_d: q.option_d,
                question_type: q.question_type || 'mcq',
                image_url: q.image_url ? `/uploads/questions/${q.image_url}` : null,
                points: q.points || 1
            })),
            time_remaining: session.time_remaining,
            saved_answers: session.answers ? JSON.parse(session.answers) : {},
            exam_started_at: session.start_time
        });

    } catch (error) {
        console.error('❌ Get exam questions error:', error);
        res.status(500).json({ error: 'Failed to load exam' });
    }
}

/**
 * Save Exam Progress - ✅ UPDATED to use admission_number
 * POST /api/students/exam/save-progress
 */
async function saveExamProgress(req, res) {
    try {
        const { admission_number, subject, answers } = req.body;

        if (!admission_number || !subject) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const student = await get(
            'SELECT id FROM students WHERE admission_number = ?',
            [admission_number.toUpperCase()]
        );

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Update session with answers
        await run(
            `UPDATE exam_sessions
             SET answers = ?, last_activity = datetime('now')
             WHERE student_id = ? AND subject = ?`,
            [JSON.stringify(answers), student.id, subject]
        );

        console.log(`💾 Saved progress for ${admission_number} - ${subject}`);

        res.json({ success: true, message: 'Progress saved' });

    } catch (error) {
        console.error('❌ Save progress error:', error);
        res.status(500).json({ error: 'Failed to save progress' });
    }
}

/**
 * Submit Exam - ✅ UPDATED to use admission_number and support theory questions
 * POST /api/students/exam/submit
 */
async function submitExam(req, res) {
    try {
        const { admission_number, subject, answers, is_auto_submit } = req.body;

        if (!admission_number || !subject || !answers) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log(`📤 Submitting exam: ${subject} for ${admission_number}`);

        const student = await get(
            'SELECT * FROM students WHERE admission_number = ?',
            [admission_number.toUpperCase()]
        );

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Check if already submitted
        const existingSubmission = await get(
            'SELECT id FROM submissions WHERE student_id = ? AND subject = ?',
            [student.id, subject]
        );

        if (existingSubmission) {
            return res.status(400).json({
                error: 'Exam already submitted',
                already_submitted: true
            });
        }

        // Get questions with answers for grading
        const questions = await getQuestionsWithAnswers(subject, student.class);

        if (questions.length === 0) {
            return res.status(404).json({ error: 'No questions found for this exam' });
        }

        // Grade exam (handles both MCQ and Theory with fuzzy matching)
        const gradingResult = gradeExam(answers, questions);

        console.log(`✅ Grading complete:`);
        console.log(`   MCQ Score: ${gradingResult.mcqScore}`);
        console.log(`   Theory Score: ${gradingResult.theoryScore}`);
        console.log(`   Total: ${gradingResult.totalScore}/${gradingResult.totalPoints}`);

        // Save submission
        await run(
            `INSERT INTO submissions (
                student_id, subject, answers, score, total_questions,
                total_possible_points, theory_pending, auto_submitted, submitted_at
            )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
                student.id,
                subject,
                JSON.stringify(answers),
                gradingResult.totalScore,
                questions.length,
                gradingResult.totalPoints,
                0, // theory_pending (auto-graded with fuzzy matching)
                is_auto_submit ? 1 : 0
            ]
        );

        // Delete exam session
        await run(
            'DELETE FROM exam_sessions WHERE student_id = ? AND subject = ?',
            [student.id, subject]
        );

        await logAudit({
            action: is_auto_submit ? ACTIONS.EXAM_AUTO_SUBMITTED : ACTIONS.EXAM_SUBMITTED,
            userType: 'student',
            userIdentifier: admission_number,
            details: `Submitted exam: ${subject} - Score: ${gradingResult.totalScore}/${gradingResult.totalPoints}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: {
                subject,
                score: gradingResult.totalScore,
                totalPoints: gradingResult.totalPoints,
                mcqScore: gradingResult.mcqScore,
                theoryScore: gradingResult.theoryScore,
                autoSubmitted: is_auto_submit || false
            }
        });

        res.json({
            success: true,
            score: gradingResult.totalScore,
            total_questions: questions.length,
            total_possible_points: gradingResult.totalPoints,
            percentage: Math.round((gradingResult.totalScore / gradingResult.totalPoints) * 100),
            mcq_score: gradingResult.mcqScore,
            theory_score: gradingResult.theoryScore
        });

    } catch (error) {
        console.error('❌ Submit exam error:', error);

        await logAudit({
            action: ACTIONS.EXAM_SUBMISSION_FAILED,
            userType: 'student',
            userIdentifier: req.body.admission_number || 'unknown',
            details: `Submission failed: ${error.message}`,
            ipAddress: getClientIp(req),
            status: 'failure'
        });

        res.status(500).json({ error: 'Failed to submit exam' });
    }
}

module.exports = {
    login,
    getExamQuestions,
    saveExamProgress,
    submitExam
};