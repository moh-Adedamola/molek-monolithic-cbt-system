const { run, get, all } = require('../utils/db');
const { verifyPassword } = require('../services/authService');
const { getCorrectAnswers, gradeExam } = require('../services/examService');
const { logAudit, ACTIONS } = require('../services/auditService');
const { getSettings } = require('../services/settingsService'); // ✅ ADD THIS

// ✅ ADD: Shuffle function
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Helper to get IP address
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        'unknown';
}

async function studentLogin(req, res) {
    const { exam_code, password } = req.body;

    if (!exam_code || !password) {
        return res.status(400).json({
            error: 'Please provide both exam code and password'
        });
    }

    try {
        const student = await get('SELECT * FROM students WHERE exam_code = ?', [exam_code]);

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

        const activeExams = await all(`
            SELECT e.subject, e.duration_minutes, e.class
            FROM exams e
                     LEFT JOIN submissions sub ON sub.student_id = ? AND sub.subject = e.subject AND sub.submitted_at IS NOT NULL
            WHERE e.class = ? AND e.is_active = 1
        `, [student.id, student.class]);

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

        res.json({
            student_id: student.id,
            full_name: `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim(),
            class: student.class,
            exam_code: student.exam_code,
            active_exams: activeExams
        });
    } catch (error) {
        console.error('studentLogin error:', error);
        await logAudit({
            action: ACTIONS.STUDENT_LOGIN_FAILED,
            userType: 'student',
            userIdentifier: exam_code || 'unknown',
            details: 'System error during login',
            ipAddress: getClientIp(req),
            status: 'failure'
        });
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
}

// ✅ FIXED: Using req.params and req.query like your original
async function getExamQuestions(req, res) {
    try {
        const { subject } = req.params;
        const { exam_code } = req.query;

        console.log('📝 getExamQuestions:', { subject, exam_code });

        if (!subject || !exam_code) {
            return res.status(400).json({ error: 'Subject and exam code are required' });
        }

        const student = await get('SELECT * FROM students WHERE exam_code = ?', [exam_code]);
        if (!student) {
            return res.status(404).json({ error: 'Student not found with this exam code' });
        }

        const exam = await get(
            'SELECT * FROM exams WHERE subject = ? AND class = ? AND is_active = 1',
            [subject, student.class]
        );

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found or not active for your class' });
        }

        // Get questions
        let questions = await all(
            'SELECT id, question_text, option_a, option_b, option_c, option_d FROM questions WHERE exam_id = ?',
            [exam.id]
        );

        if (!questions || questions.length === 0) {
            return res.status(404).json({ error: 'No questions found for this exam' });
        }

        // ✅ NEW: Get settings and shuffle if enabled
        const settings = await getSettings();
        if (settings.shuffleQuestions) {
            questions = shuffleArray(questions);
            console.log('🔀 Questions shuffled for student:', exam_code);
        } else {
            console.log('📋 Questions NOT shuffled (setting disabled)');
        }

        const existingSubmission = await get(
            'SELECT * FROM submissions WHERE student_id = ? AND subject = ?',
            [student.id, subject]
        );

        let timeRemaining = exam.duration_minutes * 60;
        let examStartedAt = null;
        let savedAnswers = null;

        if (existingSubmission) {
            if (existingSubmission.submitted_at) {
                return res.status(400).json({ error: 'You have already submitted this exam. You cannot retake it.' });
            }

            if (existingSubmission.exam_started_at) {
                examStartedAt = new Date(existingSubmission.exam_started_at);
                const now = Date.now();
                const elapsedMillis = now - examStartedAt.getTime();
                const elapsedSeconds = Math.floor(elapsedMillis / 1000);
                const totalSeconds = exam.duration_minutes * 60;
                timeRemaining = Math.max(0, totalSeconds - elapsedSeconds);

                if (timeRemaining === 0) {
                    return res.status(400).json({
                        error: 'Time has expired for this exam. Please contact your administrator.',
                        timeExpired: true
                    });
                }

                if (existingSubmission.answers) {
                    try {
                        savedAnswers = JSON.parse(existingSubmission.answers);
                    } catch (e) {
                        console.error('Failed to parse saved answers:', e);
                    }
                }

                console.log(`⏱️  Exam resumed for ${exam_code} - ${subject}: Elapsed: ${elapsedSeconds}s, Remaining: ${timeRemaining}s`);
            }
        } else {
            examStartedAt = new Date();
            await run(
                `INSERT INTO submissions
                 (student_id, subject, exam_started_at, duration_minutes, answers, score, total_questions, submitted_at)
                 VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL)`,
                [student.id, subject, examStartedAt.toISOString(), exam.duration_minutes]
            );
            console.log(`🆕 New exam session started for ${exam_code} - ${subject}`);
        }

        // ✅ Log audit
        await logAudit({
            action: ACTIONS.EXAM_STARTED,
            userType: 'student',
            userIdentifier: exam_code,
            details: `Started/resumed ${subject} exam`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: {
                subject,
                questionCount: questions.length,
                timeRemaining,
                isResume: !!existingSubmission?.exam_started_at,
                shuffled: settings.shuffleQuestions
            }
        });

        res.json({
            questions,
            time_remaining: timeRemaining,
            exam_started_at: examStartedAt?.toISOString(),
            duration_minutes: exam.duration_minutes,
            saved_answers: savedAnswers,
            shuffled: settings.shuffleQuestions
        });

    } catch (error) {
        console.error('❌ getExamQuestions error:', error);
        res.status(500).json({ error: 'Failed to load exam questions. Please try again.' });
    }
}

async function saveExamProgress(req, res) {
    try {
        const { exam_code, subject, answers } = req.body;

        if (!exam_code || !subject || !answers) {
            return res.status(400).json({ error: 'Exam code, subject, and answers are required' });
        }

        const student = await get('SELECT * FROM students WHERE exam_code = ?', [exam_code]);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const submission = await get(
            'SELECT * FROM submissions WHERE student_id = ? AND subject = ?',
            [student.id, subject]
        );

        if (!submission) {
            return res.status(400).json({ error: 'No exam session found. Please start the exam first.' });
        }

        if (submission.submitted_at) {
            return res.status(400).json({ error: 'Exam already submitted. Cannot save progress.' });
        }

        if (submission.exam_started_at) {
            const startTime = new Date(submission.exam_started_at).getTime();
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            const totalSeconds = submission.duration_minutes * 60;

            if (elapsedSeconds > totalSeconds) {
                return res.status(400).json({
                    error: 'Time expired. Cannot save progress.',
                    timeExpired: true
                });
            }
        }

        await run(
            'UPDATE submissions SET answers = ? WHERE student_id = ? AND subject = ?',
            [JSON.stringify(answers), student.id, subject]
        );

        console.log(`💾 Auto-saved ${Object.keys(answers).length} answers for ${exam_code} - ${subject}`);

        res.json({
            success: true,
            saved: Object.keys(answers).length,
            message: 'Progress saved successfully'
        });

    } catch (error) {
        console.error('❌ saveExamProgress error:', error);
        res.status(500).json({ error: 'Failed to save progress. Your answers may not be saved.' });
    }
}

async function submitExam(req, res) {
    try {
        const { exam_code, subject, answers } = req.body;

        console.log('📤 submitExam:', { exam_code, subject, answerCount: Object.keys(answers || {}).length });

        if (!exam_code || !subject || !answers) {
            return res.status(400).json({ error: 'Exam code, subject, and answers are required' });
        }

        const student = await get('SELECT * FROM students WHERE exam_code = ?', [exam_code]);
        if (!student) {
            return res.status(404).json({ error: 'Student not found with this exam code' });
        }

        const submission = await get(
            'SELECT * FROM submissions WHERE student_id = ? AND subject = ?',
            [student.id, subject]
        );

        if (!submission) {
            return res.status(400).json({ error: 'No exam session found. Please start the exam first.' });
        }

        if (submission.submitted_at) {
            return res.status(400).json({ error: 'Exam already submitted. You cannot submit twice.' });
        }

        if (submission.exam_started_at) {
            const startTime = new Date(submission.exam_started_at).getTime();
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            const totalSeconds = submission.duration_minutes * 60;

            if (elapsedSeconds > totalSeconds + 60) {
                return res.status(400).json({
                    error: 'Time has expired. Your answers have been auto-saved.',
                    timeExpired: true
                });
            }
        }

        // ✅ FIXED: Use getCorrectAnswers like the original
        const correctAnswers = await getCorrectAnswers(subject, student.class);

        if (!correctAnswers || Object.keys(correctAnswers).length === 0) {
            return res.status(500).json({
                error: 'Unable to grade exam. Please contact your administrator.'
            });
        }

        // ✅ FIXED: Use gradeExam with correct signature
        const score = gradeExam(answers, correctAnswers);
        const total = Object.keys(correctAnswers).length;
        const percentage = Math.round((score / total) * 100);

        await run(
            `UPDATE submissions
             SET answers = ?, score = ?, total_questions = ?, submitted_at = CURRENT_TIMESTAMP
             WHERE student_id = ? AND subject = ?`,
            [JSON.stringify(answers), score, total, student.id, subject]
        );

        // ✅ Log audit
        await logAudit({
            action: ACTIONS.EXAM_SUBMITTED,
            userType: 'student',
            userIdentifier: exam_code,
            details: `Submitted ${subject} exam: ${score}/${total} (${percentage}%)`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: {
                subject,
                score,
                total,
                percentage,
                answeredCount: Object.keys(answers).length
            }
        });

        console.log(`✅ Exam submitted: ${exam_code} - ${subject}: ${score}/${total} (${percentage}%)`);

        // ✅ NEW: Check settings for showing results
        const settings = await getSettings();

        const response = {
            success: true,
            message: 'Exam submitted successfully'
        };

        // Only include score if setting is enabled
        if (settings.showResults) {
            response.score = score;
            response.total = total;
            response.percentage = percentage;
            console.log(`✅ Results shown to student (setting enabled)`);
        } else {
            console.log(`✅ Results hidden from student (setting disabled)`);
        }

        res.json(response);

    } catch (error) {
        console.error('❌ submitExam error:', error);
        res.status(500).json({ error: 'Failed to submit exam. Please try again or contact your administrator.' });
    }
}

module.exports = {
    studentLogin,
    getExamQuestions,
    saveExamProgress,
    submitExam
};