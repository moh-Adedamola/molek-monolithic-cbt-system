const { run, get, all } = require('../utils/db');
const { hashPassword } = require('../services/authService');
const { generatePassword, generateExamCode } = require('../services/codeGenerator');
const { parseCsvBuffer } = require('../services/csvService');
const { logAudit, ACTIONS } = require('../services/auditService');


function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        'unknown';
}

// ================================================================
// CREATE SINGLE STUDENT - WITH FULL LOGGING
// ================================================================
async function createStudent(req, res) {
    try {
        const { first_name, middle_name, last_name, class: classLevel, student_id } = req.body;

        if (!first_name || !last_name || !classLevel) {
            return res.status(400).json({ error: 'first_name, last_name, and class required' });
        }

        const password = generatePassword();
        const passwordHash = await hashPassword(password);
        const examCode = generateExamCode(classLevel, classLevel, Date.now());

        const result = await run(`
            INSERT INTO students (first_name, middle_name, last_name, class, student_id, exam_code, password_hash, plain_password)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [first_name, middle_name || null, last_name, classLevel, student_id || null, examCode, passwordHash, password]);

        logAudit({
            action: ACTIONS.STUDENT_CREATED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Created student: ${first_name} ${last_name} (${examCode})`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { class: classLevel, examCode, studentId: result.lastID }
        });

        res.json({ success: true, examCode, password, studentId: result.lastID });
    } catch (error) {
        console.error('createStudent error:', error);
        res.status(500).json({ error: 'Failed to create student' });
    }
}
// ================================================================
// BULK CREATE STUDENTS - WITH FULL LOGGING
// ================================================================
async function bulkCreateStudents(req, res) {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const students = await parseCsvBuffer(req.file.buffer);
        const results = { success: [], failed: [] };

        for (const s of students) {
            try {
                const password = generatePassword();
                const passwordHash = await hashPassword(password);
                const examCode = generateExamCode(s.class || 'Unknown', s.class || 'Unknown', Date.now() + Math.random());

                await run(`
                    INSERT INTO students (first_name, middle_name, last_name, class, student_id, exam_code, password_hash, plain_password)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    s.first_name?.trim() || 'Unknown',
                    s.middle_name?.trim() || null,
                    s.last_name?.trim() || 'Unknown',
                    s.class?.trim() || 'Unknown',
                    s.student_id?.trim() || null,
                    examCode,
                    passwordHash,
                    password
                ]);

                results.success.push({ ...s, examCode, password });
            } catch (err) {
                results.failed.push({ ...s, error: err.message });
            }
        }

        logAudit({
            action: ACTIONS.STUDENTS_BULK_UPLOADED,
            userType: 'admin',
            details: `Bulk upload: ${results.success.length} success, ${results.failed.length} failed`,
            ipAddress: getClientIp(req),
            status: results.failed.length === 0 ? 'success' : 'warning'
        });

        res.json(results);
    } catch (error) {
        console.error('bulkCreateStudents error:', error);
        res.status(500).json({ error: 'Bulk upload failed' });
    }
}

async function getClasses(req, res) {
    try {
        const rows = await all(`
            SELECT
                class,
                COUNT(*) as count
            FROM students
            GROUP BY class
            ORDER BY class
        `);

        console.log('📚 Classes with counts:', rows);

        res.json({ classes: rows });
    } catch (error) {
        console.error('❌ getClasses error:', error);
        res.status(500).json({ error: 'Failed to get classes' });
    }
}

async function deleteStudentsByClass(req, res) {
    try {
        const { class: classLevel } = req.body;

        if (!classLevel) {
            return res.status(400).json({ error: 'class required' });
        }

        const result = await run('DELETE FROM students WHERE class = ?', [classLevel]);

        // Audit log
        logAudit({
            action: ACTIONS.CLASS_DELETED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Deleted ${result.changes} students from ${classLevel}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { class: classLevel, deletedCount: result.changes }
        });

        res.json({ message: `Deleted ${result.changes} students from ${classLevel}` });
    } catch (error) {
        console.error('Delete class error:', error);
        res.status(500).json({ error: 'Failed to delete class' });
    }
}

async function exportStudentsByClass(req, res) {
    try {
        const { class: classLevel } = req.query;

        if (!classLevel) {
            return res.status(400).json({ error: 'class parameter required' });
        }

        const students = await all(`
            SELECT first_name, middle_name, last_name, class, student_id, exam_code, plain_password
            FROM students
            WHERE class = ?
            ORDER BY last_name, first_name
        `, [classLevel]);

        console.log(`📥 Exporting ${students.length} students from ${classLevel} with passwords`);

        // Audit log
        logAudit({
            action: ACTIONS.STUDENTS_EXPORTED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Exported ${students.length} students from ${classLevel}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { class: classLevel, count: students.length }
        });

        const csvHeader = 'first_name,middle_name,last_name,class,student_id,exam_code,password\n';
        const csvRows = students.map(s =>
            `${s.first_name},${s.middle_name || ''},${s.last_name},${s.class},${s.student_id || ''},${s.exam_code},${s.plain_password || 'N/A'}`
        ).join('\n');

        const csv = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${classLevel}_students.csv`);
        res.send(csv);
    } catch (error) {
        console.error('❌ Export students error:', error);
        res.status(500).json({ error: 'Failed to export students' });
    }
}

// ============================================
// QUESTIONS & EXAMS
// ============================================

async function uploadQuestions(req, res) {
    try {
        const { subject, class: classLevel } = req.body;

        if (!req.file || !subject || !classLevel) {
            return res.status(400).json({ error: 'file, subject, and class required' });
        }

        const rows = await parseCsvBuffer(req.file.buffer);
        if (rows.length === 0) {
            return res.status(400).json({ error: 'CSV is empty' });
        }

        // Get or create exam
        let exam = await get('SELECT id FROM exams WHERE subject = ? AND class = ?', [subject, classLevel]);

        if (!exam) {
            const result = await run(`
                INSERT INTO exams (subject, class, is_active, duration_minutes)
                VALUES (?, ?, 0, 60)
            `, [subject, classLevel]);
            exam = { id: result.lastID };
        }

        // Insert questions
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

            await run(`
                INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_answer)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [exam.id, question, optA, optB, optC, optD, correct]);
            count++;
        }

        // Audit log
        logAudit({
            action: ACTIONS.QUESTIONS_UPLOADED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Uploaded ${count} questions for ${subject} - ${classLevel}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { subject, class: classLevel, questionCount: count }
        });

        res.json({ message: `Uploaded ${count} questions for ${subject} - ${classLevel}` });
    } catch (error) {
        console.error('Upload questions error:', error);
        logAudit({
            action: ACTIONS.QUESTIONS_UPLOADED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Failed to upload questions: ${error.message}`,
            ipAddress: getClientIp(req),
            status: 'failure'
        });
        res.status(500).json({ error: 'Failed to upload questions' });
    }
}

async function getAllQuestions(req, res) {
    try {
        const questions = await all(`
            SELECT q.*, e.subject, e.class, e.is_active, e.duration_minutes
            FROM questions q
                     JOIN exams e ON q.exam_id = e.id
            ORDER BY e.subject, e.class, q.id
        `);

        res.json({ questions });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ error: 'Failed to get questions' });
    }
}

async function activateExam(req, res) {
    try {
        const { subject, class: classLevel, is_active } = req.body;

        if (!subject || !classLevel || is_active === undefined) {
            return res.status(400).json({ error: 'subject, class, and is_active required' });
        }

        const result = await run('UPDATE exams SET is_active = ? WHERE subject = ? AND class = ?', [is_active ? 1 : 0, subject, classLevel]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // Audit log
        logAudit({
            action: is_active ? ACTIONS.EXAM_ACTIVATED : ACTIONS.EXAM_DEACTIVATED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `${is_active ? 'Activated' : 'Deactivated'} exam: ${subject} - ${classLevel}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { subject, class: classLevel, isActive: is_active }
        });

        res.json({ message: `Exam ${is_active ? 'activated' : 'deactivated'}` });
    } catch (error) {
        console.error('Activate exam error:', error);
        res.status(500).json({ error: 'Failed to update exam status' });
    }
}

async function getAllExams(req, res) {
    try {
        const exams = await all(`
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

        res.json({ exams });
    } catch (error) {
        console.error('Get exams error:', error);
        res.status(500).json({ error: 'Failed to get exams' });
    }
}

async function getExamById(req, res) {
    try {
        const { id } = req.params;

        const exam = await get(`
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
        `, [id]);

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        const questions = await all('SELECT * FROM questions WHERE exam_id = ?', [id]);

        res.json({ exam, questions });
    } catch (error) {
        console.error('Get exam error:', error);
        res.status(500).json({ error: 'Failed to get exam' });
    }
}

async function updateExam(req, res) {
    try {
        const { id } = req.params;
        const { duration_minutes } = req.body;

        if (!duration_minutes) {
            return res.status(400).json({ error: 'duration_minutes required' });
        }

        const result = await run('UPDATE exams SET duration_minutes = ? WHERE id = ?', [duration_minutes, id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // Audit log
        logAudit({
            action: ACTIONS.EXAM_UPDATED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Updated exam duration to ${duration_minutes} minutes (ID: ${id})`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { examId: id, durationMinutes: duration_minutes }
        });

        res.json({ message: 'Exam updated successfully' });
    } catch (error) {
        console.error('Update exam error:', error);
        res.status(500).json({ error: 'Failed to update exam' });
    }
}

async function deleteExam(req, res) {
    try {
        const { id } = req.params;

        // Get exam details before deleting
        const exam = await get('SELECT subject, class FROM exams WHERE id = ?', [id]);

        const result = await run('DELETE FROM exams WHERE id = ?', [id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // Audit log
        if (exam) {
            logAudit({
                action: ACTIONS.EXAM_DELETED,
                userType: 'admin',
                userIdentifier: 'admin',
                details: `Deleted exam: ${exam.subject} - ${exam.class}`,
                ipAddress: getClientIp(req),
                status: 'success',
                metadata: { examId: id, subject: exam.subject, class: exam.class }
            });
        }

        res.json({ message: 'Exam deleted successfully' });
    } catch (error) {
        console.error('Delete exam error:', error);
        res.status(500).json({ error: 'Failed to delete exam' });
    }
}

async function getSubjects(req, res) {
    try {
        const rows = await all('SELECT DISTINCT subject FROM exams ORDER BY subject');
        res.json({ subjects: rows.map(r => r.subject) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get subjects' });
    }
}

// ============================================
// RESULTS
// ============================================

async function getClassResults(req, res) {
    try {
        const { class: classLevel } = req.query;

        if (!classLevel) {
            return res.status(400).json({ error: 'class parameter required' });
        }

        const results = await all(`
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
        `, [classLevel]);

        res.json({ results });
    } catch (error) {
        console.error('Get class results error:', error);
        res.status(500).json({ error: 'Failed to get results' });
    }
}

async function exportClassResultsAsText(req, res) {
    try {
        const { class: classLevel, subject } = req.query;

        if (!classLevel || !subject) {
            return res.status(400).json({ error: 'class and subject parameters required' });
        }

        const results = await all(`
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
        `, [classLevel, subject]);

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
    }
}

async function getFilteredResults(req, res) {
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

        const results = await all(query, params);

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
    }
}

// ============================================
// DASHBOARD
// ============================================

async function getDashboardStats(req, res) {
    try {
        const studentsResult = await all('SELECT COUNT(*) as c FROM students');
        const examsResult = await all('SELECT COUNT(*) as c FROM exams');
        const activeExamsResult = await all('SELECT COUNT(*) as c FROM exams WHERE is_active = 1');
        const submissionsResult = await all('SELECT COUNT(*) as c FROM submissions');

        console.log('📊 Dashboard Stats Debug:');
        console.log('  Students result:', studentsResult);
        console.log('  Exams result:', examsResult);
        console.log('  Active exams result:', activeExamsResult);
        console.log('  Submissions result:', submissionsResult);

        const totalStudents = studentsResult[0].c;
        const totalExams = examsResult[0].c;
        const activeExams = activeExamsResult[0].c;
        const totalSubmissions = submissionsResult[0].c;

        console.log('📊 Final Stats:', { totalStudents, totalExams, activeExams, totalSubmissions });

        res.json({ totalStudents, totalExams, activeExams, totalSubmissions });
    } catch (error) {
        console.error('❌ getDashboardStats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
}

async function getRecentSubmissions(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const submissions = await all(`
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
        `, [limit]);

        res.json({ submissions });
    } catch (error) {
        console.error('Recent submissions error:', error);
        res.status(500).json({ error: 'Failed to get recent submissions' });
    }
}

// ============================================
// MONITORING
// ============================================

async function getActiveExamSessions(req, res) {
    try {
        // Get active exams with student counts
        const sessions = await all(`
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

        res.json({ sessions });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Failed to get active sessions' });
    }
}

function getAuditLogsController(req, res) {
    try {
        const filters = {
            action: req.query.action,
            userType: req.query.userType,
            status: req.query.status,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate,
            search: req.query.search,
            limit: req.query.limit || 100
        };

        const logs = getAuditLogs(filters);
        res.json({ logs });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Failed to get audit logs' });
    }
}

function getAuditStatsController(req, res) {
    try {
        const stats = getAuditStats();
        res.json(stats);
    } catch (error) {
        console.error('Get audit stats error:', error);
        res.status(500).json({ error: 'Failed to get audit stats' });
    }
}

module.exports = {
    // Students
    createStudent,
    bulkCreateStudents,
    getClasses,
    deleteStudentsByClass,
    exportStudentsByClass,

    // Questions & Exams
    uploadQuestions,
    getAllQuestions,
    activateExam,
    getAllExams,
    getExamById,
    updateExam,
    deleteExam,
    getSubjects,

    // Results
    getClassResults,
    exportClassResultsAsText,
    getFilteredResults,

    // Dashboard
    getDashboardStats,
    getRecentSubmissions,

    // Monitoring
    getActiveExamSessions,

    // Audit Logs
    getAuditLogsController,
    getAuditStatsController
};