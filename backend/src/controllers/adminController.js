const { getDb } = require('../utils/db');
const { hashPassword } = require('../services/authService');
const { generatePassword, generateExamCode } = require('../services/codeGenerator');
const { parseCsvBuffer } = require('../services/csvService');

async function createStudent(req, res) {
    let db;  // For explicit close
    try {
        const { first_name, middle_name, last_name, class: classLevel, student_id } = req.body;

        // 🔍 Log incoming request data
        console.log('📥 CreateStudent - Incoming request:', {
            first_name,
            last_name,
            class: classLevel,
            middle_name: middle_name || 'N/A',
            student_id: student_id || 'N/A'
        });

        if (!first_name || !last_name || !classLevel) {
            console.log('❌ CreateStudent - Validation failed: Missing required fields');
            return res.status(400).json({ error: 'First name, last name, and class are required' });
        }

        const password = generatePassword();
        const passwordHash = await hashPassword(password);
        const examCode = generateExamCode('GEN', classLevel, Date.now());

        // 🔍 Log generated credentials
        console.log('🔑 CreateStudent - Generated credentials:', {
            password: password,
            passwordHash: passwordHash ? `[HASHED - starts with ${passwordHash.substring(0, 5)}...]` : 'HASH FAILED!',
            examCode
        });

        db = getDb();
        console.log('🔌 CreateStudent - DB connected, using better-sqlite3?');

        const stmt = db.prepare(`
            INSERT INTO students (first_name, middle_name, last_name, class, student_id, exam_code, password_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const insertResult = stmt.run(first_name, middle_name || '', last_name, classLevel, student_id || '', examCode, passwordHash);
        const studentId = insertResult.lastInsertRowid;

        console.log('✅ CreateStudent - INSERT succeeded:', {
            changes: insertResult.changes,  // 1 row affected
            lastId: studentId
        });
        // No finalize needed—optional in better-sqlite3

        // 🔍 Re-fetch the inserted row to verify storage
        const verifyStmt = db.prepare('SELECT * FROM students WHERE id = ?');
        const storedStudent = verifyStmt.get(studentId);
        console.log('🆕 CreateStudent - Stored in DB (re-fetched):', {
            id: storedStudent ? storedStudent.id : 'INSERT FAILED!',
            first_name: storedStudent ? storedStudent.first_name : 'N/A',
            last_name: storedStudent ? storedStudent.last_name : 'N/A',
            class: storedStudent ? storedStudent.class : 'N/A',
            exam_code: storedStudent ? storedStudent.exam_code : 'N/A',
            password_hash: storedStudent ? (storedStudent.password_hash ? `[STORED - starts with ${storedStudent.password_hash.substring(0, 5)}...]` : 'MISSING/NULL!') : 'ROW NOT FOUND!',
            has_submitted: storedStudent ? storedStudent.has_submitted : 'N/A'
        });
        // No finalize needed here either

        console.log('✅ CreateStudent - Success, returning response');
        res.status(201).json({
            id: studentId,
            exam_code: examCode,
            password: password
        });
    } catch (error) {
        console.error('💥 CreateStudent - Error details:', error);
        res.status(500).json({ error: 'Failed to create student' });
    } finally {
        if (db) {
            db.close();  // Always close connection (good practice)
        }
    }
}

async function bulkCreateStudents(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'CSV file required' });
        }

        const studentsData = await parseCsvBuffer(req.file.buffer);
        const db = getDb();
        const createdStudents = [];
        let classLevel = '';

        for (const [index, row] of studentsData.entries()) {
            const { first_name, last_name, class: cls, student_id } = row;
            if (!first_name || !last_name || !cls) continue;

            const password = generatePassword();
            const passwordHash = await hashPassword(password);
            const examCode = generateExamCode('GEN', cls, Date.now() + index);

            const stmt = db.prepare(`
        INSERT INTO students (first_name, middle_name, last_name, class, student_id, exam_code, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(first_name, '', last_name, cls, student_id || '', examCode, passwordHash);
            stmt.finalize();

            createdStudents.push({ full_name: `${first_name} ${last_name}`, class: cls, exam_code: examCode, password });
            if (!classLevel) classLevel = cls;
        }

        // Generate tabular text report
        const lines = [];
        lines.push('='.repeat(60));
        lines.push('STUDENT EXAM CREDENTIALS'.padStart(45));
        lines.push('='.repeat(60));
        lines.push(`CLASS: ${classLevel.toUpperCase()}`);
        lines.push('-'.repeat(60));
        lines.push('NAME'.padEnd(20) + 'EXAM CODE'.padEnd(18) + 'PASSWORD');
        lines.push('-'.repeat(60));

        createdStudents.forEach(s => {
            lines.push(
                s.full_name.padEnd(20).substring(0, 19) + ' ' +
                s.exam_code.padEnd(18) +
                s.password
            );
        });

        lines.push('='.repeat(60));
        lines.push('Generated on: ' + new Date().toLocaleString());

        const txtContent = lines.join('\n');

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename=student_credentials.txt');
        res.send(txtContent);
    } catch (error) {
        console.error('Bulk student error:', error);
        res.status(500).json({ error: 'Student import failed' });
    }
}

async function uploadQuestions(req, res) {
    let db;  // For explicit close
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'CSV file required' });
        }
        const { subject, class: classLevel } = req.body;
        if (!subject || !classLevel) {
            return res.status(400).json({ error: 'Subject and class required' });
        }

        const questionsData = await parseCsvBuffer(req.file.buffer);
        db = getDb();
        console.log('📥 uploadQuestions - Processing:', { subject, class: classLevel, numQuestions: questionsData.length });

        // Ensure exam exists (sync INSERT OR IGNORE)
        const insertExamStmt = db.prepare('INSERT OR IGNORE INTO exams (subject, class) VALUES (?, ?)');
        insertExamStmt.run(subject, classLevel);
        // No finalize needed

        // Get exam ID
        const examStmt = db.prepare('SELECT id FROM exams WHERE subject = ? AND class = ?');
        const examRow = examStmt.get(subject, classLevel);
        // No finalize
        console.log('🔍 uploadQuestions - Exam ID:', examRow ? examRow.id : 'NOT FOUND!');

        if (!examRow) {
            return res.status(404).json({ error: 'Exam not found after insert' });
        }

        // Insert questions (batch loop, sync)
        const stmt = db.prepare(`
            INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_answer)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        let insertedCount = 0;
        questionsData.forEach(q => {
            // Optional: Validate row
            if (q.question_text && q.correct_answer) {
                stmt.run(
                    examRow.id,
                    q.question_text,
                    q.option_a || '',
                    q.option_b || '',
                    q.option_c || '',
                    q.option_d || '',
                    q.correct_answer
                );
                insertedCount++;
            } else {
                console.log('⚠️ uploadQuestions - Skipping invalid row:', q);
            }
        });
        // No finalize needed

        console.log(`✅ uploadQuestions - Inserted ${insertedCount} questions for exam ${examRow.id}`);
        res.json({ success: true, count: insertedCount });
    } catch (error) {
        console.error('💥 uploadQuestions - Error details:', error);
        res.status(500).json({ error: 'Question upload failed' });
    } finally {
        if (db) {
            db.close();
        }
    }
}

function activateExam(req, res) {
    let db;
    try {
        // 🔍 Log incoming request for debug
        console.log('📥 activateExam - Incoming body:', req.body);

        const { subject, class: classLevel, is_active } = req.body;
        if (!subject?.trim() || !classLevel?.trim()) {  // Trim whitespace, check truthy
            console.log('❌ activateExam - Validation failed: Missing/invalid subject or class', { subject, classLevel });
            return res.status(400).json({ error: 'Subject and class required (non-empty)' });
        }

        db = getDb();
        console.log('📥 activateExam - Setting (trimmed):', { subject: subject.trim(), class: classLevel.trim(), is_active });

        // Ensure exam exists
        const insertStmt = db.prepare('INSERT OR IGNORE INTO exams (subject, class) VALUES (?, ?)');
        insertStmt.run(subject.trim(), classLevel.trim());

        // Update active status
        const updateStmt = db.prepare('UPDATE exams SET is_active = ? WHERE subject = ? AND class = ?');
        const updateResult = updateStmt.run(is_active ? 1 : 0, subject.trim(), classLevel.trim());
        console.log('✅ activateExam - Updated rows:', updateResult.changes);

        res.json({ success: true });
    } catch (error) {
        console.error('💥 activateExam - Error details:', error);
        res.status(500).json({ error: 'Failed to activate exam' });
    } finally {
        if (db) db.close();
    }
}

function exportClassResultsAsText(req, res) {
    let db;
    try {
        const { class: classLevel, subject } = req.query;
        if (!classLevel || !subject) {
            return res.status(400).json({ error: 'Class and subject required' });
        }

        db = getDb();
        console.log('📥 exportClassResultsAsText - Querying for:', { classLevel, subject });  // Optional debug

        // Sync: Prepare and execute (no callback, original query without comment)
        const stmt = db.prepare(`
            SELECT
                s.first_name, s.middle_name, s.last_name,
                sub.score, sub.total_questions, s.has_submitted
            FROM students s
                     LEFT JOIN submissions sub ON s.id = sub.student_id
            WHERE s.class = ?
            ORDER BY s.last_name, s.first_name
        `);
        const rows = stmt.all(classLevel);
        // No finalize needed

        console.log('✅ exportClassResultsAsText - Fetched rows:', { count: rows.length });  // Optional

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No results found' });
        }

        const lines = [];
        const title = `${classLevel.toUpperCase()} - ${subject.toUpperCase()} RESULTS`;
        lines.push('='.repeat(60));
        lines.push(title.padStart((60 + title.length) / 2));
        lines.push('='.repeat(60));
        lines.push('NAME'.padEnd(20) + 'SCORE'.padEnd(12) + 'STATUS');
        lines.push('-'.repeat(60));

        rows.forEach(row => {
            const fullName = `${row.first_name} ${row.middle_name || ''} ${row.last_name}`.trim();
            const score = row.has_submitted ? `${row.score}/${row.total_questions}` : 'NOT TAKEN';
            const status = row.has_submitted ? 'COMPLETED' : 'NOT TAKEN';
            lines.push(
                fullName.padEnd(20).substring(0, 19) + ' ' +
                score.padEnd(12) +
                status
            );
        });

        lines.push('='.repeat(60));
        lines.push('Generated on: ' + new Date().toLocaleString());

        const txtContent = lines.join('\n');
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=${classLevel}_${subject}_results.txt`);
        res.send(txtContent);
    } catch (error) {
        console.error('💥 exportClassResultsAsText - Error details:', error);
        res.status(500).json({ error: 'Export failed' });
    } finally {
        if (db) db.close();
    }
}

function getClassResults(req, res) {
    const { class: classLevel, subject } = req.query;
    if (!classLevel || !subject) {
        return res.status(400).json({ error: 'Class and subject required' });
    }

    const db = getDb();
    const query = `
    SELECT 
      s.first_name, s.middle_name, s.last_name, s.student_id,
      sub.score, sub.total_questions,
      s.has_submitted
    FROM students s
    LEFT JOIN submissions sub ON s.id = sub.student_id
    WHERE s.class = ?
    ORDER BY s.last_name, s.first_name
  `;

    db.all(query, [classLevel], (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB error' });

        const results = rows.map(row => {
            const fullName = `${row.first_name} ${row.middle_name || ''} ${row.last_name}`.trim();
            return {
                student_name: fullName,
                student_id: row.student_id,
                score: row.has_submitted ? `${row.score}/${row.total_questions}` : 'NOT TAKEN',
                status: row.has_submitted ? 'COMPLETED' : 'NOT TAKEN'
            };
        });

        res.json(results);
    });
}

function getAllQuestions(req, res) {
    let db;
    try {
        db = getDb();
        const stmt = db.prepare(`
            SELECT q.*, e.subject, e.class, e.is_active
            FROM questions q
            JOIN exams e ON q.exam_id = e.id
            ORDER BY e.subject, e.class, q.id
        `);
        const questions = stmt.all();
        res.json({ questions });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ error: 'Failed to fetch questions' });
    } finally {
        if (db) db.close();
    }
}

module.exports = { createStudent, bulkCreateStudents, activateExam, getAllQuestions, getClassResults, uploadQuestions, exportClassResultsAsText };