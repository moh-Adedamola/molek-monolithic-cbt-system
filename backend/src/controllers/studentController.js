const { get, all, run } = require('../utils/db');
const { verifyPassword } = require('../services/authService');
const { logAudit } = require('../services/auditService');

function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        'unknown';
}

// ============================================
// STUDENT LOGIN
// ============================================
async function login(req, res) {
    try {
        const { admission_number, password } = req.body;

        if (!admission_number || !password) {
            return res.status(400).json({ error: 'Admission number and password required' });
        }

        console.log('🔐 Login attempt:', admission_number);

        const student = await get(
            'SELECT * FROM students WHERE admission_number = ?',
            [admission_number.toUpperCase()]
        );

        if (!student) {
            console.log('❌ Student not found:', admission_number);
            return res.status(404).json({ error: 'Student not found' });
        }

        const isValid = await verifyPassword(password, student.password_hash);

        if (!isValid) {
            console.log('❌ Invalid password for:', admission_number);
            await logAudit({
                action: 'STUDENT_LOGIN_FAILED',
                userType: 'student',
                userIdentifier: admission_number,
                details: 'Invalid password',
                ipAddress: getClientIp(req),
                status: 'failure'
            });
            return res.status(401).json({ error: 'Invalid password' });
        }

        const activeExams = await all(
            'SELECT subject, duration_minutes FROM exams WHERE class = ? AND is_active = 1',
            [student.class]
        );

        console.log('✅ Login successful:', admission_number, '- Active exams:', activeExams.length);

        await logAudit({
            action: 'STUDENT_LOGIN_SUCCESS',
            userType: 'student',
            userIdentifier: admission_number,
            details: `Student logged in: ${student.first_name} ${student.last_name}`,
            ipAddress: getClientIp(req),
            status: 'success'
        });

        res.json({
            success: true,
            admission_number: student.admission_number,
            first_name: student.first_name,
            middle_name: student.middle_name,
            last_name: student.last_name,
            full_name: `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`.trim(),
            class: student.class,
            active_exams: activeExams
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
}

// ============================================
// GET EXAM QUESTIONS (MCQ ONLY)
// ============================================
async function getExamQuestions(req, res) {
    try {
        const { subject } = req.params;
        const { admission_number } = req.query;

        if (!admission_number) {
            return res.status(400).json({ error: 'admission_number required' });
        }

        console.log('📝 Getting exam questions:', subject, 'for', admission_number);

        const student = await get(
            'SELECT * FROM students WHERE admission_number = ?',
            [admission_number.toUpperCase()]
        );

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const exam = await get(
            'SELECT * FROM exams WHERE subject = ? AND class = ? AND is_active = 1',
            [subject, student.class]
        );

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found or not active' });
        }

        // Check if already submitted
        const existingSubmission = await get(
            'SELECT id, score, total_questions FROM submissions WHERE student_id = ? AND subject = ?',
            [student.id, subject]
        );

        if (existingSubmission) {
            console.log('⚠️  Exam already submitted:', admission_number, subject);
            return res.status(400).json({
                error: 'You have already submitted this exam',
                already_submitted: true,
                score: existingSubmission.score,
                total_questions: existingSubmission.total_questions,
                message: `You already completed this exam. Score: ${existingSubmission.score}/${existingSubmission.total_questions}`
            });
        }

        // Get questions (MCQ only - no theory)
        const questions = await all(
            'SELECT id, question_text, option_a, option_b, option_c, option_d, image_url FROM questions WHERE exam_id = ?',
            [exam.id]
        );

        console.log('✅ Returning', questions.length, 'MCQ questions');

        // Load saved progress
        const savedSession = await get(
            'SELECT answers, time_remaining FROM exam_sessions WHERE student_id = ? AND subject = ?',
            [student.id, subject]
        );

        let savedAnswers = {};
        let timeRemaining = exam.duration_minutes * 60;

        if (savedSession) {
            console.log('📂 Loading saved progress for', admission_number);
            savedAnswers = savedSession.answers ? JSON.parse(savedSession.answers) : {};
            timeRemaining = savedSession.time_remaining || timeRemaining;
        }

        // Format questions (hide correct answers)
        const formattedQuestions = questions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            image_url: q.image_url ? `/uploads/questions/${q.image_url}` : null
        }));

        const durationMinutes = parseInt(exam.duration_minutes) || 60;

        res.json({
            success: true,
            exam: {
                id: exam.id,
                subject: exam.subject,
                class: exam.class,
                duration_minutes: durationMinutes,
                duration_seconds: durationMinutes * 60
            },
            questions: formattedQuestions,
            total_questions: formattedQuestions.length,
            student: {
                id: student.id,
                admission_number: student.admission_number,
                full_name: `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`.trim(),
                class: student.class
            },
            saved_progress: {
                answers: savedAnswers,
                time_remaining: timeRemaining
            }
        });

    } catch (error) {
        console.error('❌ Get exam questions error:', error);
        res.status(500).json({ error: 'Failed to get exam questions' });
    }
}

// ============================================
// SAVE EXAM PROGRESS
// ============================================
async function saveExamProgress(req, res) {
    try {
        const { admission_number, subject, answers, time_remaining } = req.body;

        if (!admission_number || !subject) {
            return res.status(400).json({ error: 'admission_number and subject required' });
        }

        const student = await get(
            'SELECT id FROM students WHERE admission_number = ?',
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
            return res.status(400).json({ error: 'Exam already submitted' });
        }

        // Upsert progress
        await run(`
            INSERT INTO exam_sessions (student_id, subject, answers, time_remaining, last_activity)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(student_id, subject) 
            DO UPDATE SET answers = ?, time_remaining = ?, last_activity = CURRENT_TIMESTAMP
        `, [
            student.id,
            subject,
            JSON.stringify(answers || {}),
            time_remaining,
            JSON.stringify(answers || {}),
            time_remaining
        ]);

        res.json({ success: true, message: 'Progress saved' });

    } catch (error) {
        console.error('❌ Save progress error:', error);
        res.status(500).json({ error: 'Failed to save progress' });
    }
}

// ============================================
// SUBMIT EXAM (MCQ ONLY - SIMPLE SCORING)
// Score = number of correct answers
// ============================================
async function submitExam(req, res) {
    try {
        const { admission_number, subject, answers, auto_submitted, time_taken } = req.body;

        if (!admission_number || !subject) {
            return res.status(400).json({ error: 'admission_number and subject required' });
        }

        console.log('📤 Submitting exam:', subject, 'for', admission_number);

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
            return res.status(400).json({ error: 'Exam already submitted' });
        }

        const exam = await get(
            'SELECT id FROM exams WHERE subject = ? AND class = ?',
            [subject, student.class]
        );

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // Get all questions with correct answers
        const questions = await all(
            'SELECT id, correct_answer FROM questions WHERE exam_id = ?',
            [exam.id]
        );

        const totalQuestions = questions.length;
        let score = 0;
        const gradedAnswers = {};

        // Grade each answer (1 point per correct answer)
        questions.forEach(q => {
            const studentAnswer = answers ? answers[q.id] : null;
            const isCorrect = studentAnswer && 
                              studentAnswer.toUpperCase() === q.correct_answer.toUpperCase();

            if (isCorrect) {
                score += 1;
            }

            gradedAnswers[q.id] = {
                student_answer: studentAnswer || null,
                correct_answer: q.correct_answer,
                is_correct: isCorrect
            };
        });

        // Save submission
        await run(`
            INSERT INTO submissions (
                student_id, subject, class, answers, score,
                total_questions, auto_submitted
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            student.id,
            subject,
            student.class,
            JSON.stringify(gradedAnswers),
            score,
            totalQuestions,
            auto_submitted ? 1 : 0
        ]);

        // Delete progress after successful submission
        await run(
            'DELETE FROM exam_sessions WHERE student_id = ? AND subject = ?',
            [student.id, subject]
        );
        console.log('🗑️  Cleared exam progress after submission');

        await logAudit({
            action: 'EXAM_SUBMITTED',
            userType: 'student',
            userIdentifier: admission_number,
            details: `Submitted ${subject} exam: ${score}/${totalQuestions}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: {
                examId: exam.id,
                score: score,
                totalQuestions: totalQuestions,
                autoSubmitted: auto_submitted,
                timeTaken: time_taken
            }
        });

        const percentage = Math.round((score / totalQuestions) * 100);
        console.log('✅ Exam submitted successfully:', score, '/', totalQuestions, '=', percentage + '%');

        res.json({
            success: true,
            message: auto_submitted 
                ? 'Exam auto-submitted (time expired)!' 
                : 'Exam submitted successfully!',
            score: score,
            total_questions: totalQuestions,
            percentage: percentage
        });

    } catch (error) {
        console.error('❌ Submit exam error:', error);
        res.status(500).json({ error: 'Failed to submit exam' });
    }
}

module.exports = {
    login,
    getExamQuestions,
    saveExamProgress,
    submitExam,
    scoreFromProgress
};

/**
 * Score a student from their saved exam progress (exam_sessions table).
 * Used by admin when a student's auto-submit failed (power outage, network error).
 * POST /api/admin/students/score-from-progress
 * Body: { admission_number, subject }
 */
async function scoreFromProgress(req, res) {
    try {
        const { admission_number, subject } = req.body;

        if (!admission_number || !subject) {
            return res.status(400).json({ error: 'admission_number and subject required' });
        }

        const student = await get(
            'SELECT * FROM students WHERE admission_number = ?',
            [admission_number.toUpperCase()]
        );
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Check if already submitted
        const existing = await get(
            'SELECT id, score, total_questions FROM submissions WHERE student_id = ? AND subject = ?',
            [student.id, subject]
        );
        if (existing) {
            return res.json({
                success: true,
                message: 'Already submitted',
                score: existing.score,
                total_questions: existing.total_questions,
                percentage: Math.round((existing.score / existing.total_questions) * 100)
            });
        }

        // Get saved progress
        const session = await get(
            'SELECT answers FROM exam_sessions WHERE student_id = ? AND subject = ?',
            [student.id, subject]
        );
        if (!session || !session.answers) {
            return res.status(404).json({ error: 'No saved progress found for this student/subject' });
        }

        let savedAnswers;
        try {
            savedAnswers = JSON.parse(session.answers);
        } catch {
            return res.status(400).json({ error: 'Corrupted saved answers' });
        }

        const exam = await get(
            'SELECT id FROM exams WHERE subject = ? AND class = ?',
            [subject, student.class]
        );
        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // Grade from saved answers
        const questions = await all(
            'SELECT id, correct_answer FROM questions WHERE exam_id = ?',
            [exam.id]
        );

        let score = 0;
        const gradedAnswers = {};
        questions.forEach(q => {
            const studentAnswer = savedAnswers[q.id] || null;
            const isCorrect = studentAnswer &&
                studentAnswer.toUpperCase() === q.correct_answer.toUpperCase();
            if (isCorrect) score++;
            gradedAnswers[q.id] = {
                student_answer: studentAnswer,
                correct_answer: q.correct_answer,
                is_correct: isCorrect
            };
        });

        // Save as submission
        await run(`
            INSERT INTO submissions (
                student_id, subject, class, answers, score,
                total_questions, auto_submitted
            ) VALUES (?, ?, ?, ?, ?, ?, 1)
        `, [student.id, subject, student.class, JSON.stringify(gradedAnswers), score, questions.length]);

        // Clean up session
        await run('DELETE FROM exam_sessions WHERE student_id = ? AND subject = ?', [student.id, subject]);

        const percentage = Math.round((score / questions.length) * 100);
        console.log(`✅ Scored from progress: ${admission_number} ${subject} = ${score}/${questions.length} (${percentage}%)`);

        res.json({
            success: true,
            message: `Scored from saved progress: ${score}/${questions.length}`,
            score, total_questions: questions.length, percentage
        });
    } catch (error) {
        console.error('❌ Score from progress error:', error);
        res.status(500).json({ error: 'Failed to score from progress' });
    }
}