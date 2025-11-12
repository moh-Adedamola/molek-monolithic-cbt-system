const { getDb } = require('../utils/db');
const { verifyPassword } = require('../services/authService');
const { getCorrectAnswers, gradeExam } = require('../services/examService');

async function studentLogin(req, res) {
    let db;
    const { exam_code, password } = req.body;

    // 🔍 Log incoming request data
    console.log('📥 StudentLogin - Incoming request:', {
        exam_code: exam_code || 'EMPTY',
        password: password ? '[PROVIDED]' : 'EMPTY'
    });

    if (!exam_code || !password) {
        console.log('❌ StudentLogin - Validation failed: Missing exam_code or password');
        return res.status(400).json({ error: 'Exam code and password required' });
    }

    try {
        db = getDb();
        const stmt = db.prepare('SELECT * FROM students WHERE exam_code = ?');
        const student = stmt.get(exam_code);
        // No finalize

        // 🔍 Log the full fetched student (or lack thereof)
        console.log('🔍 StudentLogin - Fetched from DB:', {
            exam_code,
            found: !!student,
            student_id: student ? student.id : 'NOT FOUND',
            first_name: student ? student.first_name : 'N/A',
            last_name: student ? student.last_name : 'N/A',
            class: student ? student.class : 'N/A',
            exam_code_stored: student ? student.exam_code : 'N/A',
            password_hash: student ? (student.password_hash ? `[STORED - starts with ${student.password_hash.substring(0, 5)}...]` : 'MISSING/NULL!') : 'N/A',
            has_submitted: student ? student.has_submitted : 'N/A'
        });

        if (!student) {
            console.log('❌ StudentLogin - No student found for exam_code');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!student.password_hash) {
            console.log('❌ StudentLogin - Missing password_hash (detailed):', {
                exam_code,
                student_id: student.id,
                stored_hash_raw: student.password_hash,
                full_student_keys: Object.keys(student)
            });
            return res.status(500).json({ error: 'Student record missing password hash' });
        }

        if (student.has_submitted) {
            console.log('🚫 StudentLogin - Already submitted:', { exam_code, student_id: student.id });
            return res.status(403).json({ error: 'Exam already submitted' });
        }

        // 🔍 Debug log before password verification
        console.log('🔐 StudentLogin - Verifying password:', {
            exam_code,
            input_password: password ? '[MATCHING?]' : 'EMPTY',
            stored_hash_preview: student.password_hash.substring(0, 10) + '...'
        });

        const isValid = await verifyPassword(password, student.password_hash);
        if (!isValid) {
            console.log('❌ StudentLogin - Password mismatch for:', { exam_code });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const examStmt = db.prepare(
            'SELECT subject, duration_minutes FROM exams WHERE class = ? AND is_active = 1'
        );
        const activeExams = examStmt.all(student.class);
        // No finalize

        console.log('📋 StudentLogin - Active exams for class:', {
            class: student.class,
            num_exams: activeExams.length,
            exams: activeExams.map(e => ({ subject: e.subject, duration: e.duration_minutes }))
        });

        if (activeExams.length === 0) {
            console.log('⚠️ StudentLogin - No active exams for class:', student.class);
            return res.status(404).json({ error: 'No active exams' });
        }

        const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim();
        console.log('✅ StudentLogin - Success for:', { exam_code, fullName });

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
        console.log('📥 getExamQuestions - Request:', { subject, exam_code });

        // Sync: Get student + access check
        const studentStmt = db.prepare(`
            SELECT s.class, s.has_submitted
            FROM students s
                     JOIN exams e ON s.class = e.class
            WHERE s.exam_code = ? AND e.subject = ? AND e.is_active = 1
        `);
        const student = studentStmt.get(exam_code, subject);
        // No finalize

        console.log('🔍 getExamQuestions - Student access:', {
            found: !!student,
            class: student ? student.class : 'N/A',
            has_submitted: student ? student.has_submitted : 'N/A'
        });

        if (!student || student.has_submitted) {
            console.log('🚫 getExamQuestions - Access denied');
            return res.status(403).json({ error: 'Access denied' });
        }

        // Sync: Get questions (FIX: Qualify q.id to avoid ambiguity with e.id)
        const questionsStmt = db.prepare(`
            SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d
            FROM questions q
                     JOIN exams e ON q.exam_id = e.id
            WHERE e.subject = ? AND e.class = ?
        `);
        const questions = questionsStmt.all(subject, student.class);
        // No finalize

        console.log('✅ getExamQuestions - Fetched questions:', { count: questions.length });

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
        const {exam_code, answers} = req.body;
        if (!exam_code || !answers) {
            return res.status(400).json({error: 'exam_code and answers required'});
        }

        db = getDb();
        console.log('📥 submitExam - Request:', {exam_code, numAnswers: Object.keys(answers).length});

        // Sync: Get student (not submitted)
        const studentStmt = db.prepare('SELECT id, class FROM students WHERE exam_code = ? AND has_submitted = 0');
        const student = studentStmt.get(exam_code);
        // No finalize

        if (!student) {
            console.log('🚫 submitExam - Invalid or already submitted');
            return res.status(403).json({error: 'Invalid or already submitted'});
        }

        console.log('🔍 submitExam - Student OK:', {id: student.id, class: student.class});

        // Sync: Get active exam subject
        const examStmt = db.prepare('SELECT subject FROM exams WHERE class = ? AND is_active = 1');
        const exam = examStmt.get(student.class);
        // No finalize

        if (!exam) {
            console.log('⚠️ submitExam - No active exam');
            return res.status(400).json({error: 'No active exam'});
        }

        console.log('📋 submitExam - Grading for subject:', exam.subject);

        // Grade (async service, but non-DB)
        const correctAnswers = await getCorrectAnswers(exam.subject, student.class);
        const total = Object.keys(correctAnswers).length;
        const score = gradeExam(answers, correctAnswers);

        // Sync: Insert submission
        const subStmt = db.prepare(`
            INSERT INTO submissions (student_id, answers, score, total_questions)
            VALUES (?, ?, ?, ?)
        `);
        subStmt.run(student.id, JSON.stringify(answers), score, total);
        // No finalize

        // Sync: Mark as submitted
        const updateStmt = db.prepare('UPDATE students SET has_submitted = 1 WHERE id = ?');
        const updateResult = updateStmt.run(student.id);
        console.log('✅ submitExam - Submission saved:', {score, total, updatedRows: updateResult.changes});

        const percentage = total ? Math.round((score / total) * 100) : 0;
        res.json({score, total, percentage});
    } catch (error) {
        console.error('💥 submitExam - Error details:', error);
        res.status(500).json({error: 'Grading failed'});
    } finally {
        if (db) db.close();
    }
}

module.exports = { studentLogin, getExamQuestions, submitExam };