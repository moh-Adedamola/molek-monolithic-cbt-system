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
            status: 'failure',
            metadata: { error: error.message }
        });
        res.status(500).json({
            error: 'Login failed due to a system error. Please try again or contact your administrator.'
        });
    }
}

/**
 * Get exam questions and track start time
 * ✅ Returns saved answers if student is resuming
 */
async function getExamQuestions(req, res) {
    try {
        const { subject } = req.params;
        const { exam_code } = req.query;

        if (!exam_code) {
            return res.status(400).json({
                error: 'Exam code is required'
            });
        }

        const student = await get(`
            SELECT s.id, s.class, s.first_name, s.last_name
            FROM students s
            WHERE s.exam_code = ?
        `, [exam_code]);

        if (!student) {
            return res.status(403).json({
                error: 'Invalid exam code.'
            });
        }

        const exam = await get(`
            SELECT id, duration_minutes, is_active
            FROM exams
            WHERE subject = ? AND class = ? AND is_active = 1
        `, [subject, student.class]);

        if (!exam) {
            return res.status(403).json({
                error: 'This exam is not currently active or does not exist for your class.'
            });
        }

        // ✅ Check if student already started this exam
        let examSession = await get(`
            SELECT id, exam_started_at, duration_minutes, answers, submitted_at
            FROM submissions
            WHERE student_id = ? AND subject = ?
        `, [student.id, subject]);

        let timeRemaining;
        let examStartedAt;
        let isResume = false;
        let savedAnswers = {}; // ✅ NEW: Store saved answers

        if (examSession) {
            // Check if already submitted
            if (examSession.submitted_at !== null) {
                return res.status(403).json({
                    error: 'You have already submitted this exam.'
                });
            }

            // ✅ NEW: Load saved answers if they exist
            if (examSession.answers) {
                try {
                    savedAnswers = JSON.parse(examSession.answers);
                    console.log(`📝 Loaded ${Object.keys(savedAnswers).length} saved answers`);
                } catch (e) {
                    console.warn('Failed to parse saved answers:', e);
                    savedAnswers = {};
                }
            }

            if (examSession.exam_started_at) {
                examStartedAt = examSession.exam_started_at;
                const startTime = new Date(examStartedAt).getTime();
                const currentTime = Date.now();
                const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
                const totalSeconds = (examSession.duration_minutes || exam.duration_minutes) * 60;
                timeRemaining = Math.max(0, totalSeconds - elapsedSeconds);
                isResume = true;

                console.log(`⏱️  Exam resumed for ${exam_code} - ${subject}:`);
                console.log(`   Started at: ${examStartedAt}`);
                console.log(`   Elapsed: ${elapsedSeconds}s (${Math.floor(elapsedSeconds / 60)} mins)`);
                console.log(`   Remaining: ${timeRemaining}s (${Math.floor(timeRemaining / 60)} mins)`);
                console.log(`   Saved answers: ${Object.keys(savedAnswers).length}`);

                if (timeRemaining <= 0) {
                    console.log(`⏰ Time expired for ${exam_code} - ${subject}`);
                    return res.status(403).json({
                        error: 'Your exam time has expired. The exam will be auto-submitted.',
                        timeExpired: true
                    });
                }
            } else {
                examStartedAt = new Date().toISOString();
                await run(`
                    UPDATE submissions 
                    SET exam_started_at = ?, duration_minutes = ?
                    WHERE id = ?
                `, [examStartedAt, exam.duration_minutes, examSession.id]);
                timeRemaining = exam.duration_minutes * 60;
                console.log(`🔧 Fixed session for ${exam_code} - ${subject}: Added start time`);
            }
        } else {
            // First time starting exam
            examStartedAt = new Date().toISOString();

            const result = await run(`
                INSERT INTO submissions (
                    student_id, subject, exam_started_at, duration_minutes,
                    answers, score, total_questions, submitted_at
                )
                VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL)
            `, [student.id, subject, examStartedAt, exam.duration_minutes]);

            timeRemaining = exam.duration_minutes * 60;

            console.log(`🆕 Exam started for ${exam_code} - ${subject}:`);
            console.log(`   Subject: ${subject}`);
            console.log(`   Duration: ${exam.duration_minutes} minutes`);
            console.log(`   Started at: ${examStartedAt}`);
            console.log(`   Submission ID: ${result.lastID}`);
        }

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

        if (!isResume) {
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
                    questionCount: questions.length,
                    startedAt: examStartedAt
                }
            });
        }

        res.json({
            subject,
            questions,
            student_name: `${student.first_name} ${student.last_name}`,
            class: student.class,
            time_remaining: timeRemaining,
            exam_started_at: examStartedAt,
            duration_minutes: exam.duration_minutes,
            saved_answers: savedAnswers // ✅ NEW: Send saved answers to frontend
        });
    } catch (error) {
        console.error('❌ getExamQuestions error:', error);
        res.status(500).json({
            error: 'Failed to load exam questions. Please try again or contact your administrator.'
        });
    }
}

/**
 * ✅ NEW: Auto-save answers during exam (not final submission)
 */
async function saveExamProgress(req, res) {
    const { exam_code, answers, subject } = req.body;

    if (!exam_code || !answers || !subject) {
        return res.status(400).json({
            error: 'Missing required information.'
        });
    }

    try {
        const student = await get(`
            SELECT s.id, s.class
            FROM students s
            WHERE s.exam_code = ?
        `, [exam_code]);

        if (!student) {
            return res.status(403).json({
                error: 'Invalid exam code.'
            });
        }

        // Find existing session
        const existingSubmission = await get(`
            SELECT id, exam_started_at, duration_minutes, submitted_at
            FROM submissions
            WHERE student_id = ? AND subject = ?
        `, [student.id, subject]);

        if (!existingSubmission) {
            return res.status(403).json({
                error: 'No active exam session found.'
            });
        }

        // Check if already submitted
        if (existingSubmission.submitted_at !== null) {
            return res.status(403).json({
                error: 'Exam already submitted.'
            });
        }

        // Verify time hasn't expired
        if (existingSubmission.exam_started_at) {
            const startTime = new Date(existingSubmission.exam_started_at).getTime();
            const currentTime = Date.now();
            const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);

            let durationMinutes = existingSubmission.duration_minutes;
            if (!durationMinutes) {
                const exam = await get(`
                    SELECT duration_minutes FROM exams WHERE subject = ? AND class = ?
                `, [subject, student.class]);
                durationMinutes = exam ? exam.duration_minutes : 60;
            }

            const totalSeconds = durationMinutes * 60;

            if (elapsedSeconds > totalSeconds + 60) {
                return res.status(403).json({
                    error: 'Exam time has expired.',
                    timeExpired: true
                });
            }
        }

        // ✅ Save answers (without scoring or marking as submitted)
        await run(`
            UPDATE submissions 
            SET answers = ?
            WHERE id = ?
        `, [JSON.stringify(answers), existingSubmission.id]);

        console.log(`💾 Auto-saved ${Object.keys(answers).length} answers for ${exam_code} - ${subject}`);

        res.json({
            success: true,
            message: 'Progress saved',
            saved_count: Object.keys(answers).length
        });
    } catch (error) {
        console.error('❌ saveExamProgress error:', error);
        res.status(500).json({
            error: 'Failed to save progress.'
        });
    }
}

/**
 * Submit exam answers (FINAL submission)
 */
async function submitExam(req, res) {
    const { exam_code, answers, subject } = req.body;

    if (!exam_code || !answers || !subject) {
        return res.status(400).json({
            error: 'Missing required information. Please try again.'
        });
    }

    try {
        const student = await get(`
            SELECT s.id, s.class 
            FROM students s
            WHERE s.exam_code = ?
        `, [exam_code]);

        if (!student) {
            return res.status(403).json({
                error: 'Invalid exam code.'
            });
        }

        const existingSubmission = await get(`
            SELECT id, answers, exam_started_at, duration_minutes, submitted_at
            FROM submissions
            WHERE student_id = ? AND subject = ?
        `, [student.id, subject]);

        if (!existingSubmission) {
            return res.status(403).json({
                error: 'No active exam session found. Please start the exam first.'
            });
        }

        // Check if already submitted
        if (existingSubmission.submitted_at !== null) {
            return res.status(403).json({
                error: 'You have already submitted this exam.'
            });
        }

        // Verify time hasn't expired (with 60 second grace period)
        if (existingSubmission.exam_started_at) {
            const startTime = new Date(existingSubmission.exam_started_at).getTime();
            const currentTime = Date.now();
            const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);

            let durationMinutes = existingSubmission.duration_minutes;
            if (!durationMinutes) {
                const exam = await get(`
                    SELECT duration_minutes FROM exams WHERE subject = ? AND class = ?
                `, [subject, student.class]);
                durationMinutes = exam ? exam.duration_minutes : 60;
            }

            const totalSeconds = durationMinutes * 60;
            const gracePeriod = 60;

            if (elapsedSeconds > totalSeconds + gracePeriod) {
                console.log(`⏰ Late submission rejected for ${exam_code}:`);
                console.log(`   Elapsed: ${elapsedSeconds}s`);
                console.log(`   Allowed: ${totalSeconds + gracePeriod}s`);
                return res.status(403).json({
                    error: 'Exam time has expired. Late submission not allowed.',
                    timeExpired: true
                });
            }
        }

        const correctAnswers = await getCorrectAnswers(subject, student.class);

        if (!correctAnswers || Object.keys(correctAnswers).length === 0) {
            return res.status(500).json({
                error: 'Unable to grade exam. Please contact your administrator.'
            });
        }

        const score = gradeExam(answers, correctAnswers);
        const total = Object.keys(correctAnswers).length;
        const percentage = Math.round((score / total) * 100);

        // ✅ UPDATE with final score and mark as submitted
        await run(`
            UPDATE submissions 
            SET answers = ?,
                score = ?,
                total_questions = ?,
                submitted_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [JSON.stringify(answers), score, total, existingSubmission.id]);

        console.log(`✅ Exam submitted for ${exam_code} - ${subject}:`);
        console.log(`   Score: ${score}/${total} (${percentage}%)`);

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
        console.error('❌ submitExam error:', error);
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

module.exports = {
    studentLogin,
    getExamQuestions,
    saveExamProgress, // ✅ NEW: Export auto-save function
    submitExam
};