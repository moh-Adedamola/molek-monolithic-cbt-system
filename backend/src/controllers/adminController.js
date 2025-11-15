const { getDb } = require('../utils/db');
const { hashPassword } = require('../services/authService');
const { generatePassword, generateExamCode } = require('../services/codeGenerator');
const { parseCsvBuffer } = require('../services/csvService');

// ============================================
// STUDENTS
// ============================================

async function createStudent(req, res) {
    let db;
    try {
        const { first_name, middle_name, last_name, class: classLevel, student_id } = req.body;

        if (!first_name || !last_name || !classLevel) {
            return res.status(400).json({ error: 'first_name, last_name, and class required' });
        }

        const password = generatePassword();
        const passwordHash = await hashPassword(password);
        const examCode = generateExamCode(classLevel, classLevel, Date.now());

        db = getDb();
        const stmt = db.prepare(`
            INSERT INTO students (first_name, middle_name, last_name, class, student_id, exam_code, password_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(first_name, middle_name || null, last_name, classLevel, student_id || null, examCode, passwordHash);

        res.json({ exam_code: examCode, password });
    } catch (error) {
        console.error('Create student error:', error);
        res.status(500).json({ error: 'Failed to create student' });
    } finally {
        if (db) db.close();
    }
}

async function bulkCreateStudents(req, res) {
    let db;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'CSV file required' });
        }

        const rows = await parseCsvBuffer(req.file.buffer);
        if (rows.length === 0) {
            return res.status(400).json({ error: 'CSV file is empty' });
        }

        db = getDb();
        const credentials = [];

        for (const row of rows) {
            const firstName = row.first_name?.trim();
            const lastName = row.last_name?.trim();
            const classLevel = row.class?.trim();
            const middleName = row.middle_name?.trim() || null;
            const studentId = row.student_id?.trim() || null;

            if (!firstName || !lastName || !classLevel) continue;

            const password = generatePassword();
            const passwordHash = await hashPassword(password);
            const examCode = generateExamCode(classLevel, classLevel, Date.now());

            const stmt = db.prepare(`
                INSERT INTO students (first_name, middle_name, last_name, class, student_id, exam_code, password_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(firstName, middleName, lastName, classLevel, studentId, examCode, passwordHash);

            credentials.push(`${firstName} ${lastName} | ${examCode} | ${password}`);
        }

        const credentialsText = credentials.join('\n');
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename=student_credentials.txt');
        res.send(credentialsText);
    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ error: 'Bulk upload failed' });
    } finally {
        if (db) db.close();
    }
}

function getClasses(req, res) {
    let db;
    try {
        db = getDb();
        const stmt = db.prepare(`
            SELECT class, COUNT(*) as count 
            FROM students 
            GROUP BY class 
            ORDER BY class
        `);
        const classes = stmt.all();

        res.json({ classes });
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ error: 'Failed to get classes' });
    } finally {
        if (db) db.close();
    }
}

function deleteStudentsByClass(req, res) {
    let db;
    try {
        const { class: classLevel } = req.body;

        if (!classLevel) {
            return res.status(400).json({ error: 'class required' });
        }

        db = getDb();
        const stmt = db.prepare('DELETE FROM students WHERE class = ?');
        const result = stmt.run(classLevel);

        res.json({ message: `Deleted ${result.changes} students from ${classLevel}` });
    } catch (error) {
        console.error('Delete class error:', error);
        res.status(500).json({ error: 'Failed to delete class' });
    } finally {
        if (db) db.close();
    }
}

function exportStudentsByClass(req, res) {
    let db;
    try {
        const { class: classLevel } = req.query;

        if (!classLevel) {
            return res.status(400).json({ error: 'class parameter required' });
        }

        db = getDb();
        const stmt = db.prepare(`
            SELECT first_name, middle_name, last_name, class, student_id, exam_code
            FROM students
            WHERE class = ?
            ORDER BY last_name, first_name
        `);
        const students = stmt.all(classLevel);

        const csvHeader = 'first_name,middle_name,last_name,class,student_id,exam_code\n';
        const csvRows = students.map(s =>
            `${s.first_name},${s.middle_name || ''},${s.last_name},${s.class},${s.student_id || ''},${s.exam_code}`
        ).join('\n');

        const csv = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${classLevel}_students.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Export students error:', error);
        res.status(500).json({ error: 'Failed to export students' });
    } finally {
        if (db) db.close();
    }
}

// ============================================
// QUESTIONS & EXAMS
// ============================================

async function uploadQuestions(req, res) {
    let db;
    try {
        const { subject, class: classLevel } = req.body;

        if (!req.file || !subject || !classLevel) {
            return res.status(400).json({ error: 'file, subject, and class required' });
        }

        const rows = await parseCsvBuffer(req.file.buffer);
        if (rows.length === 0) {
            return res.status(400).json({ error: 'CSV is empty' });
        }

        db = getDb();

        // Get or create exam
        let examStmt = db.prepare('SELECT id FROM exams WHERE subject = ? AND class = ?');
        let exam = examStmt.get(subject, classLevel);

        if (!exam) {
            const insertExam = db.prepare(`
                INSERT INTO exams (subject, class, is_active, duration_minutes)
                VALUES (?, ?, 0, 60)
            `);
            const result = insertExam.run(subject, classLevel);
            exam = { id: result.lastInsertRowid };
        }

        // Insert questions
        const insertStmt = db.prepare(`
            INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_answer)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        let count = 0;
        for (const row of rows) {
            const question = row.question_text?.trim();
            const optA = row.option_a?.trim();
            const optB = row.option_b?.trim();
            const optC = row.option_c?.trim();
            const optD = row.option_d?.trim();
            const correct = row.correct_answer?.trim()?.toUpperCase();

            if (!question || !optA || !optB || !optC || !optD || !correct) continue;
            if (!['A', 'B', 'C', 'D'].includes(correct)) continue;

            insertStmt.run(exam.id, question, optA, optB, optC, optD, correct);
            count++;
        }

        res.json({ message: `Uploaded ${count} questions for ${subject} - ${classLevel}` });
    } catch (error) {
        console.error('Upload questions error:', error);
        res.status(500).json({ error: 'Failed to upload questions' });
    } finally {
        if (db) db.close();
    }
}

function getAllQuestions(req, res) {
    let db;
    try {
        db = getDb();
        const stmt = db.prepare(`
            SELECT q.*, e.subject, e.class, e.is_active, e.duration_minutes
            FROM questions q
            JOIN exams e ON q.exam_id = e.id
            ORDER BY e.subject, e.class, q.id
        `);
        const questions = stmt.all();

        res.json({ questions });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ error: 'Failed to get questions' });
    } finally {
        if (db) db.close();
    }
}

function activateExam(req, res) {
    let db;
    try {
        const { subject, class: classLevel, is_active } = req.body;

        if (!subject || !classLevel || is_active === undefined) {
            return res.status(400).json({ error: 'subject, class, and is_active required' });
        }

        db = getDb();
        const stmt = db.prepare('UPDATE exams SET is_active = ? WHERE subject = ? AND class = ?');
        const result = stmt.run(is_active ? 1 : 0, subject, classLevel);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        res.json({ message: `Exam ${is_active ? 'activated' : 'deactivated'}` });
    } catch (error) {
        console.error('Activate exam error:', error);
        res.status(500).json({ error: 'Failed to update exam status' });
    } finally {
        if (db) db.close();
    }
}

function getAllExams(req, res) {
    let db;
    try {
        db = getDb();
        const stmt = db.prepare(`
            SELECT 
                e.id,
                e.subject,
                e.class,
                e.is_active,
                e.duration_minutes,
                e.created_at,
                COUNT(q.id) as total_questions
            FROM exams e
            LEFT JOIN questions q ON e.id = q.exam_id
            GROUP BY e.id
            ORDER BY e.created_at DESC
        `);
        const exams = stmt.all();

        res.json({ exams });
    } catch (error) {
        console.error('Get exams error:', error);
        res.status(500).json({ error: 'Failed to get exams' });
    } finally {
        if (db) db.close();
    }
}

function getExamById(req, res) {
    let db;
    try {
        const { id } = req.params;
        db = getDb();

        const examStmt = db.prepare(`
            SELECT 
                e.id,
                e.subject,
                e.class,
                e.is_active,
                e.duration_minutes,
                e.created_at,
                COUNT(q.id) as total_questions
            FROM exams e
            LEFT JOIN questions q ON e.id = q.exam_id
            WHERE e.id = ?
            GROUP BY e.id
        `);
        const exam = examStmt.get(id);

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        const questionsStmt = db.prepare('SELECT * FROM questions WHERE exam_id = ?');
        const questions = questionsStmt.all(id);

        res.json({ exam, questions });
    } catch (error) {
        console.error('Get exam error:', error);
        res.status(500).json({ error: 'Failed to get exam' });
    } finally {
        if (db) db.close();
    }
}

function updateExam(req, res) {
    let db;
    try {
        const { id } = req.params;
        const { duration_minutes } = req.body;

        if (!duration_minutes) {
            return res.status(400).json({ error: 'duration_minutes required' });
        }

        db = getDb();
        const stmt = db.prepare('UPDATE exams SET duration_minutes = ? WHERE id = ?');
        const result = stmt.run(duration_minutes, id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        res.json({ message: 'Exam updated successfully' });
    } catch (error) {
        console.error('Update exam error:', error);
        res.status(500).json({ error: 'Failed to update exam' });
    } finally {
        if (db) db.close();
    }
}

function deleteExam(req, res) {
    let db;
    try {
        const { id } = req.params;
        db = getDb();

        const stmt = db.prepare('DELETE FROM exams WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        res.json({ message: 'Exam deleted successfully' });
    } catch (error) {
        console.error('Delete exam error:', error);
        res.status(500).json({ error: 'Failed to delete exam' });
    } finally {
        if (db) db.close();
    }
}

function getSubjects(req, res) {
    let db;
    try {
        db = getDb();
        const stmt = db.prepare(`
            SELECT DISTINCT subject, class
            FROM exams
            ORDER BY subject, class
        `);
        const subjects = stmt.all();

        // Group by class
        const grouped = subjects.reduce((acc, { subject, class: cls }) => {
            if (!acc[cls]) acc[cls] = [];
            acc[cls].push(subject);
            return acc;
        }, {});

        res.json({ subjects: grouped });
    } catch (error) {
        console.error('Get subjects error:', error);
        res.status(500).json({ error: 'Failed to get subjects' });
    } finally {
        if (db) db.close();
    }
}

// ============================================
// RESULTS
// ============================================

function getClassResults(req, res) {
    let db;
    try {
        const { class: classLevel } = req.query;

        if (!classLevel) {
            return res.status(400).json({ error: 'class parameter required' });
        }

        db = getDb();
        const stmt = db.prepare(`
            SELECT 
                s.first_name,
                s.middle_name,
                s.last_name,
                s.class,
                s.exam_code,
                sub.subject,
                sub.score,
                sub.total_questions,
                sub.submitted_at
            FROM submissions sub
            JOIN students s ON sub.student_id = s.id
            WHERE s.class = ?
            ORDER BY s.last_name, s.first_name, sub.subject
        `);
        const results = stmt.all(classLevel);

        res.json({ results });
    } catch (error) {
        console.error('Get class results error:', error);
        res.status(500).json({ error: 'Failed to get results' });
    } finally {
        if (db) db.close();
    }
}

function exportClassResultsAsText(req, res) {
    let db;
    try {
        const { class: classLevel, subject } = req.query;

        if (!classLevel || !subject) {
            return res.status(400).json({ error: 'class and subject parameters required' });
        }

        db = getDb();
        const stmt = db.prepare(`
            SELECT 
                s.first_name,
                s.middle_name,
                s.last_name,
                s.exam_code,
                sub.score,
                sub.total_questions,
                sub.submitted_at
            FROM submissions sub
            JOIN students s ON sub.student_id = s.id
            WHERE s.class = ? AND sub.subject = ?
            ORDER BY s.last_name, s.first_name
        `);
        const results = stmt.all(classLevel, subject);

        let text = `EXAM RESULTS: ${subject} - ${classLevel}\n`;
        text += `Generated: ${new Date().toLocaleString()}\n`;
        text += `Total Students: ${results.length}\n\n`;
        text += '='.repeat(80) + '\n\n';

        results.forEach((r, i) => {
            const fullName = `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.trim();
            const percentage = Math.round((r.score / r.total_questions) * 100);
            text += `${i + 1}. ${fullName}\n`;
            text += `   Exam Code: ${r.exam_code}\n`;
            text += `   Score: ${r.score}/${r.total_questions} (${percentage}%)\n`;
            text += `   Submitted: ${new Date(r.submitted_at).toLocaleString()}\n\n`;
        });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=${classLevel}_${subject}_results.txt`);
        res.send(text);
    } catch (error) {
        console.error('Export results error:', error);
        res.status(500).json({ error: 'Failed to export results' });
    } finally {
        if (db) db.close();
    }
}

function getFilteredResults(req, res) {
    let db;
    try {
        const { class: classLevel, subject, from_date, to_date } = req.query;

        let query = `
            SELECT 
                s.first_name,
                s.middle_name,
                s.last_name,
                s.class,
                s.exam_code,
                sub.subject,
                sub.score,
                sub.total_questions,
                sub.submitted_at
            FROM submissions sub
            JOIN students s ON sub.student_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (classLevel) {
            query += ' AND s.class = ?';
            params.push(classLevel);
        }

        if (subject) {
            query += ' AND sub.subject = ?';
            params.push(subject);
        }

        if (from_date) {
            query += ' AND sub.submitted_at >= ?';
            params.push(from_date);
        }

        if (to_date) {
            query += ' AND sub.submitted_at <= ?';
            params.push(to_date);
        }

        query += ' ORDER BY sub.submitted_at DESC';

        db = getDb();
        const stmt = db.prepare(query);
        const results = stmt.all(...params);

        // Generate CSV
        const csvHeader = 'first_name,middle_name,last_name,class,exam_code,subject,score,total_questions,percentage,submitted_at\n';
        const csvRows = results.map(r => {
            const percentage = Math.round((r.score / r.total_questions) * 100);
            return `${r.first_name},${r.middle_name || ''},${r.last_name},${r.class},${r.exam_code},${r.subject},${r.score},${r.total_questions},${percentage},${r.submitted_at}`;
        }).join('\n');

        const csv = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=filtered_results.csv');
        res.send(csv);
    } catch (error) {
        console.error('Filtered results error:', error);
        res.status(500).json({ error: 'Failed to get filtered results' });
    } finally {
        if (db) db.close();
    }
}

// ============================================
// DASHBOARD
// ============================================

function getDashboardStats(req, res) {
    let db;
    try {
        db = getDb();

        // Total students
        const studentsStmt = db.prepare('SELECT COUNT(*) as count FROM students');
        const totalStudents = studentsStmt.get().count;

        // Total exams
        const examsStmt = db.prepare('SELECT COUNT(*) as count FROM exams');
        const totalExams = examsStmt.get().count;

        // Active exams
        const activeStmt = db.prepare('SELECT COUNT(*) as count FROM exams WHERE is_active = 1');
        const activeExams = activeStmt.get().count;

        // Total submissions
        const submissionsStmt = db.prepare('SELECT COUNT(*) as count FROM submissions');
        const totalSubmissions = submissionsStmt.get().count;

        // Unique subjects
        const subjectsStmt = db.prepare('SELECT COUNT(DISTINCT subject) as count FROM exams');
        const totalSubjects = subjectsStmt.get().count;

        res.json({
            totalStudents,
            totalExams,
            activeExams,
            completedExams: totalSubmissions,
            totalSubjects,
            totalUsers: 1 // Placeholder - add users table if needed
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to get dashboard stats' });
    } finally {
        if (db) db.close();
    }
}

function getRecentSubmissions(req, res) {
    let db;
    try {
        const limit = parseInt(req.query.limit) || 10;

        db = getDb();
        const stmt = db.prepare(`
            SELECT 
                s.first_name,
                s.last_name,
                sub.subject,
                sub.score,
                sub.total_questions,
                sub.submitted_at
            FROM submissions sub
            JOIN students s ON sub.student_id = s.id
            ORDER BY sub.submitted_at DESC
            LIMIT ?
        `);
        const submissions = stmt.all(limit);

        res.json({ submissions });
    } catch (error) {
        console.error('Recent submissions error:', error);
        res.status(500).json({ error: 'Failed to get recent submissions' });
    } finally {
        if (db) db.close();
    }
}

// ============================================
// MONITORING
// ============================================

function getActiveExamSessions(req, res) {
    let db;
    try {
        db = getDb();

        // Get active exams with student counts
        const stmt = db.prepare(`
            SELECT 
                e.subject,
                e.class,
                e.duration_minutes,
                COUNT(DISTINCT s.id) as registered_students,
                COUNT(DISTINCT sub.student_id) as completed_students
            FROM exams e
            JOIN students s ON e.class = s.class
            LEFT JOIN submissions sub ON sub.student_id = s.id AND sub.subject = e.subject
            WHERE e.is_active = 1
            GROUP BY e.id
        `);
        const sessions = stmt.all();

        res.json({ sessions });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Failed to get active sessions' });
    } finally {
        if (db) db.close();
    }
}

module.exports = {
    createStudent,
    bulkCreateStudents,
    getClasses,
    deleteStudentsByClass,
    exportStudentsByClass,
    uploadQuestions,
    getAllQuestions,
    activateExam,
    getAllExams,
    getExamById,
    updateExam,
    deleteExam,
    getSubjects,
    getClassResults,
    exportClassResultsAsText,
    getFilteredResults,
    getDashboardStats,
    getRecentSubmissions,
    getActiveExamSessions
};