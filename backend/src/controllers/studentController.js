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
            has_submitted: student ? student.has_submitted : 'N/A'  // Legacy, ignored now
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

        // Updated: Active untaken exams (per-subject check)
        const examStmt = db.prepare(`
            SELECT e.subject, e.duration_minutes
            FROM exams e
            LEFT JOIN submissions sub ON sub.student_id = ? AND sub.subject = e.subject
            WHERE e.class = ? AND e.is_active = 1 AND sub.id IS NULL  // Untaken subjects only
        `);
        const activeExams = examStmt.all(student.id, student.class);
        // No finalize

        console.log('📋 StudentLogin - Active untaken exams for class:', {
            class: student.class,
            num_exams: activeExams.length,
            exams: activeExams.map(e => ({ subject: e.subject, duration: e.duration_minutes }))
        });

        if (activeExams.length === 0) {
            console.log('⚠️ StudentLogin - No active untaken exams for class:', student.class);
            return res.status(404).json({ error: 'No active untaken exams' });
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

        // Updated: Access check per-subject (untaken)
        const studentStmt = db.prepare(`
            SELECT s.class
            FROM students s
                     JOIN exams e ON s.class = e.class
                     LEFT JOIN submissions sub ON sub.student_id = s.id AND sub.subject = e.subject
            WHERE s.exam_code = ? AND e.subject = ? AND e.is_active = 1 AND sub.id IS NULL
        `);
        const student = studentStmt.get(exam_code, subject);
        // No finalize

        console.log('🔍 getExamQuestions - Student access:', {
            found: !!student,
            class: student ? student.class : 'N/A'
        });

        if (!student) {
            console.log('🚫 getExamQuestions - Access denied or already submitted for subject');
            return res.status(403).json({ error: 'Access denied or already submitted for this subject' });
        }

        // Sync: Get questions
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
        const {exam_code, answers, subject} = req.body;  // New: Require subject
        if (!exam_code || !answers || !subject) {
            return res.status(400).json({error: 'exam_code, answers, and subject required'});
        }

        db = getDb();
        console.log('📥 submitExam - Request:', {exam_code, subject, numAnswers: Object.keys(answers).length});

        // Updated: Check not submitted for this subject
        const studentStmt = db.prepare(`
            SELECT id, class
            FROM students s
                     LEFT JOIN submissions sub ON sub.student_id = s.id AND sub.subject = ?
            WHERE s.exam_code = ?
              AND sub.id IS NULL
        `);
        const student = studentStmt.get(subject, exam_code);
        // No finalize

        if (!student) {
            console.log('🚫 submitExam - Invalid or already submitted for subject');
            return res.status(403).json({error: 'Invalid or already submitted for this subject'});
        }

        console.log('🔍 submitExam - Student OK:', {id: student.id, class: student.class});

        // Get active exam (verify subject matches)
        const examStmt = db.prepare('SELECT subject FROM exams WHERE class = ? AND subject = ? AND is_active = 1');
        const exam = examStmt.get(student.class, subject);
        // No finalize

        if (!exam) {
            console.log('⚠️ submitExam - No active exam for subject');
            return res.status(400).json({error: 'No active exam for this subject'});
        }

        console.log('📋 submitExam - Grading for subject:', exam.subject);

        // Grade
        const correctAnswers = await getCorrectAnswers(exam.subject, student.class);
        const total = Object.keys(correctAnswers).length;
        const score = gradeExam(answers, correctAnswers);

        // Insert with subject
        const subStmt = db.prepare(`
            INSERT INTO submissions (student_id, subject, answers, score, total_questions)
            VALUES (?, ?, ?, ?, ?)
        `);
        subStmt.run(student.id, exam.subject, JSON.stringify(answers), score, total);
        // No finalize

        console.log('✅ submitExam - Submission saved:', {score, total});

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