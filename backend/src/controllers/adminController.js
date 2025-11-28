const { run, get, all } = require('../utils/db');
const { hashPassword } = require('../services/authService');
const { generatePassword, generateExamCode } = require('../services/codeGenerator');
const { parseCsvBuffer } = require('../services/csvService');
// ✅ FIXED: Added getAuditLogs and getAuditStats to imports
const { logAudit, ACTIONS, getAuditLogs, getAuditStats } = require('../services/auditService');
const {getSettings} = require("../services/settingsService");


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
        const examCode = generateExamCode(classLevel); // ✅ NEW: MOLEK-CLASS-XXXX format

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

        // ✅ NEW: Return formatted response with full name
        res.json({
            success: true,
            examCode,
            password,
            studentId: result.lastID,
            studentName: `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`,
            class: classLevel
        });
    } catch (error) {
        console.error('createStudent error:', error);
        res.json({ error: 'Failed to create student' });
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
                const examCode = generateExamCode(s.class || 'Unknown'); // ✅ NEW: MOLEK-CLASS-XXXX format

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

                results.success.push({
                    first_name: s.first_name?.trim() || 'Unknown',
                    middle_name: s.middle_name?.trim() || '',
                    last_name: s.last_name?.trim() || 'Unknown',
                    class: s.class?.trim() || 'Unknown',
                    examCode,
                    password
                });
            } catch (err) {
                results.failed.push({ ...s, error: err.message });
            }
        }

        logAudit({
            action: ACTIONS.STUDENTS_BULK_UPLOADED,
            userType: 'admin',
            userIdentifier: 'system',
            details: `Bulk upload: ${results.success.length} success, ${results.failed.length} failed`,
            ipAddress: getClientIp(req),
            status: results.failed.length === 0 ? 'success' : 'warning'
        });

        // ✅ NEW: Generate formatted text output like the example
        const textOutput = generateFormattedCredentials(results.success);

        // Return as text file
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="student_credentials.txt"');
        res.send(textOutput);
    } catch (error) {
        console.error('bulkCreateStudents error:', error);
        res.status(500).json({ error: 'Bulk upload failed' });
    }
}

// ✅ NEW: Format credentials like the example table
function generateFormattedCredentials(students) {
    if (!students || students.length === 0) {
        return 'No students to display.';
    }

    // Group by class
    const byClass = {};
    students.forEach(s => {
        if (!byClass[s.class]) byClass[s.class] = [];
        byClass[s.class].push(s);
    });

    let output = '';

    Object.keys(byClass).sort().forEach(className => {
        const classStudents = byClass[className];

        output += '============================================================\n';
        output += '                     STUDENT EXAM CREDENTIALS\n';
        output += '============================================================\n';
        output += `CLASS: ${className}\n`;
        output += '------------------------------------------------------------\n';
        output += 'NAME                EXAM CODE         PASSWORD\n';
        output += '------------------------------------------------------------\n';

        classStudents.forEach(s => {
            const fullName = `${s.first_name} ${s.middle_name ? s.middle_name + ' ' : ''}${s.last_name}`;
            const namePadded = fullName.padEnd(20, ' ');
            const examCodePadded = s.examCode.padEnd(18, ' ');
            const passwordPadded = s.password.padEnd(10, ' ');

            output += `${namePadded}${examCodePadded}${passwordPadded}\n`;
        });

        output += '============================================================\n\n';
    });

    return output;
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

        if (students.length === 0) {
            return res.status(404).json({ error: 'No students found for this class' });
        }

        const textOutput = generateFormattedCredentials(students.map(s => ({
            first_name: s.first_name,
            middle_name: s.middle_name,
            last_name: s.last_name,
            class: s.class,
            examCode: s.exam_code,
            password: s.plain_password
        })));

        // Audit log
        logAudit({
            action: ACTIONS.STUDENTS_EXPORTED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Exported ${students.length} students from ${classLevel}`,
            ipAddress: getClientIp(req),
            status: 'success'
        });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${classLevel}_students.txt"`);
        res.send(textOutput);
    } catch (error) {
        console.error('Export students error:', error);
        res.status(500).json({ error: 'Failed to export students' });
    }
}

// ============================================
// QUESTIONS & EXAMS
// ============================================

async function uploadQuestions(req, res) {
    try {
        console.log('📤 Upload Questions Request:');
        console.log('   File:', req.file ? req.file.originalname : 'NO FILE');
        console.log('   Subject:', req.body.subject);
        console.log('   Class:', req.body.class);

        // ✅ Validate file
        if (!req.file) {
            console.error('❌ No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // ✅ Get subject and class from form data (not from CSV!)
        const subject = req.body.subject;
        const classLevel = req.body.class;

        if (!subject || !classLevel) {
            console.error('❌ Missing subject or class in form data');
            return res.status(400).json({
                error: 'Subject and class are required',
                received: { subject, class: classLevel }
            });
        }

        // ✅ Parse CSV
        const questions = await parseCsvBuffer(req.file.buffer);
        console.log(`📋 Parsed ${questions.length} questions from CSV`);

        if (questions.length === 0) {
            console.error('❌ No valid questions found in file');
            return res.status(400).json({ error: 'No valid questions found in CSV file' });
        }

        // ✅ Validate question format
        const firstQuestion = questions[0];
        const requiredFields = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'];
        const missingFields = requiredFields.filter(field => !firstQuestion[field]);

        if (missingFields.length > 0) {
            console.error('❌ Missing fields in CSV:', missingFields);
            return res.status(400).json({
                error: 'Invalid CSV format',
                missing_fields: missingFields,
                required_fields: requiredFields,
                sample: 'question_text,option_a,option_b,option_c,option_d,correct_answer'
            });
        }

        // ✅ Check if exam already exists
        const existingExam = await get(
            'SELECT id FROM exams WHERE subject = ? AND class = ?',
            [subject, classLevel]
        );

        let examId;

        if (existingExam) {
            examId = existingExam.id;
            console.log(`🔄 Updating existing exam (ID: ${examId})`);

            // Delete old questions
            const deleted = await run('DELETE FROM questions WHERE exam_id = ?', [examId]);
            console.log(`🗑️  Deleted ${deleted.changes} old questions`);
        } else {
            console.log('🆕 Creating new exam');
            const result = await run(
                'INSERT INTO exams (subject, class, duration_minutes, is_active) VALUES (?, ?, 60, 0)',
                [subject, classLevel]
            );
            examId = result.lastID;
            console.log(`✅ Created exam (ID: ${examId})`);
        }

        // ✅ Insert questions
        let insertedCount = 0;
        for (const q of questions) {
            try {
                await run(`
                    INSERT INTO questions (
                        exam_id, question_text, option_a, option_b, option_c, option_d, correct_answer
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    examId,
                    q.question_text,
                    q.option_a,
                    q.option_b,
                    q.option_c,
                    q.option_d,
                    q.correct_answer.toUpperCase() // Ensure uppercase (A, B, C, D)
                ]);
                insertedCount++;
            } catch (err) {
                console.error(`❌ Failed to insert question: ${q.question_text}`, err);
            }
        }

        console.log(`✅ Inserted ${insertedCount} questions`);

        // ✅ Audit log
        await logAudit({
            action: ACTIONS.QUESTIONS_UPLOADED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Uploaded ${insertedCount} questions for ${subject} (${classLevel})`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: {
                subject,
                class: classLevel,
                questionCount: insertedCount,
                examId,
                fileName: req.file.originalname
            }
        });

        res.json({
            success: true,
            message: `Successfully uploaded ${insertedCount} questions for ${subject} (${classLevel})`,
            examId,
            questionCount: insertedCount,
            subject,
            class: classLevel
        });
    } catch (error) {
        console.error('❌ Upload questions error:', error);

        await logAudit({
            action: ACTIONS.QUESTIONS_UPLOAD_FAILED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Failed to upload questions: ${error.message}`,
            ipAddress: getClientIp(req),
            status: 'failure',
            metadata: { error: error.message }
        });

        res.status(500).json({
            error: 'Failed to upload questions',
            details: error.message
        });
    }
}

async function getAllQuestions(req, res) {
    try {
        const questions = await all(`
            SELECT q.*, e.subject, e.class
            FROM questions q
                     JOIN exams e ON q.exam_id = e.id
            ORDER BY e.subject, q.id
        `);

        res.json({ questions });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ error: 'Failed to get questions' });
    }
}

async function activateExam(req, res) {
    try {
        console.log('📤 Activate Exam Request:', req.body);

        const { subject, class: classLevel, is_active } = req.body;

        // ✅ Validate input
        if (!subject || !classLevel || is_active === undefined) {
            console.error('❌ Missing required fields:', { subject, class: classLevel, is_active });
            return res.status(400).json({
                error: 'subject, class, and is_active are required',
                received: { subject, class: classLevel, is_active }
            });
        }

        // ✅ Find exam by subject and class
        const exam = await get(
            'SELECT id, subject, class FROM exams WHERE subject = ? AND class = ?',
            [subject, classLevel]
        );

        if (!exam) {
            console.error('❌ Exam not found:', { subject, class: classLevel });
            return res.status(404).json({
                error: `Exam not found for ${subject} - ${classLevel}`
            });
        }

        console.log(`🔄 Updating exam ${exam.id}: ${subject} - ${classLevel} → ${is_active ? 'Active' : 'Inactive'}`);

        // ✅ Update exam status
        await run(
            'UPDATE exams SET is_active = ? WHERE id = ?',
            [is_active ? 1 : 0, exam.id]
        );

        // ✅ Audit log
        await logAudit({
            action: is_active ? ACTIONS.EXAM_ACTIVATED : ACTIONS.EXAM_DEACTIVATED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `${is_active ? 'Activated' : 'Deactivated'} exam: ${exam.subject} (${exam.class})`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { examId: exam.id, subject: exam.subject, class: exam.class, is_active }
        });

        console.log(`✅ Exam ${is_active ? 'activated' : 'deactivated'} successfully`);

        res.json({
            success: true,
            message: `Exam ${is_active ? 'activated' : 'deactivated'} successfully`,
            exam: {
                id: exam.id,
                subject: exam.subject,
                class: exam.class,
                is_active: is_active ? 1 : 0
            }
        });
    } catch (error) {
        console.error('❌ Activate exam error:', error);

        await logAudit({
            action: 'EXAM_ACTIVATION_FAILED',
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Failed to activate/deactivate exam: ${error.message}`,
            ipAddress: getClientIp(req),
            status: 'failure',
            metadata: { error: error.message, body: req.body }
        });

        res.status(500).json({
            error: 'Failed to activate/deactivate exam',
            details: error.message
        });
    }
}

async function getAllExams(req, res) {
    try {
        const exams = await all(`
            SELECT
                e.id,
                e.subject,
                e.class,
                e.duration_minutes,
                e.is_active,
                COUNT(q.id) as question_count
            FROM exams e
                     LEFT JOIN questions q ON e.id = q.exam_id
            GROUP BY e.id
            ORDER BY e.subject, e.class
        `);

        res.json({ exams });
    } catch (error) {
        console.error('Get all exams error:', error);
        res.status(500).json({ error: 'Failed to get exams' });
    }
}

async function getExamById(req, res) {
    try {
        const { id } = req.params;

        const exam = await get('SELECT * FROM exams WHERE id = ?', [id]);
        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        const questions = await all('SELECT * FROM questions WHERE exam_id = ?', [id]);

        res.json({ exam, questions });
    } catch (error) {
        console.error('Get exam by ID error:', error);
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

        await run('UPDATE exams SET duration_minutes = ? WHERE id = ?', [duration_minutes, id]);

        const exam = await get('SELECT subject, class FROM exams WHERE id = ?', [id]);

        logAudit({
            action: ACTIONS.EXAM_UPDATED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Updated exam duration: ${exam.subject} (${exam.class}) - ${duration_minutes} minutes`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { examId: id, duration: duration_minutes }
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

        const exam = await get('SELECT subject, class FROM exams WHERE id = ?', [id]);

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        await run('DELETE FROM questions WHERE exam_id = ?', [id]);
        await run('DELETE FROM exams WHERE id = ?', [id]);

        logAudit({
            action: ACTIONS.EXAM_DELETED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Deleted exam: ${exam.subject} (${exam.class})`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { examId: id, subject: exam.subject, class: exam.class }
        });

        res.json({ message: 'Exam deleted successfully' });
    } catch (error) {
        console.error('Delete exam error:', error);
        res.status(500).json({ error: 'Failed to delete exam' });
    }
}

async function getSubjects(req, res) {
    try {
        const rows = await all('SELECT DISTINCT subject, class FROM exams ORDER BY class, subject');

        console.log('📚 Raw exams data:', rows);

        const subjectsByClass = {};
        rows.forEach(r => {
            if (!subjectsByClass[r.class]) {
                subjectsByClass[r.class] = [];
            }
            subjectsByClass[r.class].push(r.subject);
        });

        console.log('📚 Subjects grouped by class:', subjectsByClass);

        res.json({ subjects: subjectsByClass });
    } catch (error) {
        console.error('❌ getSubjects error:', error);
        res.status(500).json({ error: 'Failed to get subjects' });
    }
}

// ============================================
// RESULTS - FIXED VERSION
// ============================================

/**
 * Get class results - FIXED to work with or without subject
 * Can filter by:
 * - Just class: ?class=JSS3
 * - Class + subject: ?class=JSS3&subject=Mathematics
 */
async function getClassResults(req, res) {
    try {
        const { class: classLevel, subject } = req.query;

        console.log('📊 Get Results Request:', { classLevel, subject });

        let query;
        let params = [];
        let filterDescription = '';

        if (classLevel && subject) {
            // ✅ FILTER 1: Both class AND subject
            query = `
                SELECT
                    s.first_name,
                    s.middle_name,
                    s.last_name,
                    s.exam_code,
                    s.class,
                    sub.subject,
                    sub.score,
                    sub.total_questions,
                    sub.submitted_at
                FROM submissions sub
                         JOIN students s ON sub.student_id = s.id
                WHERE s.class = ? AND sub.subject = ?
                ORDER BY sub.score DESC, s.last_name, s.first_name
            `;
            params = [classLevel, subject];
            filterDescription = `${classLevel} - ${subject}`;

        } else if (classLevel && !subject) {
            // ✅ FILTER 2: Class only (all subjects in that class)
            query = `
                SELECT
                    s.first_name,
                    s.middle_name,
                    s.last_name,
                    s.exam_code,
                    s.class,
                    sub.subject,
                    sub.score,
                    sub.total_questions,
                    sub.submitted_at
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE s.class = ?
                ORDER BY sub.subject, sub.score DESC, s.last_name, s.first_name
            `;
            params = [classLevel];
            filterDescription = `${classLevel} (All Subjects)`;

        } else if (!classLevel && subject) {
            // ✅ FILTER 3: Subject only (all classes taking that subject)
            query = `
                SELECT
                    s.first_name,
                    s.middle_name,
                    s.last_name,
                    s.exam_code,
                    s.class,
                    sub.subject,
                    sub.score,
                    sub.total_questions,
                    sub.submitted_at
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE sub.subject = ?
                ORDER BY s.class, sub.score DESC, s.last_name, s.first_name
            `;
            params = [subject];
            filterDescription = `${subject} (All Classes)`;

        } else {
            // ✅ FILTER 4: No filters (all results)
            query = `
                SELECT
                    s.first_name,
                    s.middle_name,
                    s.last_name,
                    s.exam_code,
                    s.class,
                    sub.subject,
                    sub.score,
                    sub.total_questions,
                    sub.submitted_at
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                ORDER BY s.class, sub.subject, sub.score DESC, s.last_name, s.first_name
            `;
            params = [];
            filterDescription = 'All Results';
        }

        const results = await all(query, params);

        console.log(`✅ Found ${results.length} results for: ${filterDescription}`);

        res.json({
            success: true,
            results,
            count: results.length,
            class: classLevel || 'All Classes',
            subject: subject || 'All Subjects',
            filterDescription
        });
    } catch (error) {
        console.error('❌ Get results error:', error);
        res.status(500).json({ error: 'Failed to get results' });
    }
}

/**
 * Export class results as text file
 * Requires both class and subject
 */
async function exportClassResultsAsText(req, res) {
    try {
        const { class: classLevel, subject } = req.query;

        console.log('📤 Export Text Request:', { classLevel, subject });

        if (!classLevel || !subject) {
            return res.status(400).json({
                error: 'Both class and subject are required for text export'
            });
        }

        // ✅ ADDED: Get settings for session/term
        const settings = await getSettings();

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
            ORDER BY sub.score DESC, s.last_name, s.first_name
        `, [classLevel, subject]);

        // ✅ UPDATED: Generate text report with session/term
        let text = '==========================================================\n';
        text += '                    EXAM RESULTS REPORT\n';
        text += '==========================================================\n';
        text += `School: ${settings.schoolName}\n`;
        text += `System: ${settings.systemName}\n`;
        text += `Academic Session: ${settings.academicSession}\n`;
        text += `Term: ${settings.currentTerm}\n`;
        text += `Class: ${classLevel}\n`;
        text += `Subject: ${subject}\n`;
        text += `Generated: ${new Date().toLocaleString()}\n`;
        text += '==========================================================\n\n';

        if (results.length === 0) {
            text += 'No results found.\n';
        } else {
            results.forEach((r, index) => {
                const fullName = `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.trim();
                const percentage = Math.round((r.score / r.total_questions) * 100);
                // ✅ ADDED: Calculate grade
                const grade = percentage >= 70 ? 'A' :
                    percentage >= 60 ? 'B' :
                        percentage >= 50 ? 'C' :
                            percentage >= 40 ? 'D' : 'F';

                text += `${index + 1}. ${fullName}\n`;
                text += `   Exam Code: ${r.exam_code}\n`;
                text += `   Score: ${r.score}/${r.total_questions} (${percentage}%)\n`;
                text += `   Grade: ${grade}\n`; // ✅ ADDED
                text += `   Submitted: ${new Date(r.submitted_at).toLocaleString()}\n`;
                text += '\n';
            });

            // ✅ UPDATED: Summary with excellence rate
            const totalStudents = results.length;
            const averageScore = Math.round(
                results.reduce((sum, r) => sum + (r.score / r.total_questions * 100), 0) / totalStudents
            );
            const passCount = results.filter(r => (r.score / r.total_questions * 100) >= 50).length;
            const passRate = Math.round((passCount / totalStudents) * 100);
            // ✅ ADDED: Excellence rate calculation
            const excellenceCount = results.filter(r => (r.score / r.total_questions * 100) >= 70).length;
            const excellenceRate = Math.round((excellenceCount / totalStudents) * 100);

            text += '\n==========================================================\n';
            text += '                        SUMMARY\n';
            text += '==========================================================\n';
            text += `Total Students: ${totalStudents}\n`;
            text += `Average Score: ${averageScore}%\n`;
            text += `Pass Rate: ${passRate}% (≥50%)\n`;
            text += `Passed: ${passCount}/${totalStudents}\n`;
            text += `Excellence Rate: ${excellenceRate}% (≥70%)\n`; // ✅ ADDED
            text += `Excellent: ${excellenceCount}/${totalStudents}\n`; // ✅ ADDED
            text += '==========================================================\n';
        }

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${classLevel}_${subject}_results.txt"`);
        res.send(text);
    } catch (error) {
        console.error('❌ Export text error:', error);
        res.status(500).json({ error: 'Failed to export results' });
    }
}

/**
 * Get filtered results (for CSV export)
 * More flexible - can filter by class, subject, or both
 */
async function getFilteredResults(req, res) {
    try {
        const { class: classLevel, subject } = req.body;

        console.log('📊 Filtered Results Request:', { classLevel, subject });

        let query = `
            SELECT
                s.first_name,
                s.middle_name,
                s.last_name,
                s.exam_code,
                s.class,
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

        query += ' ORDER BY s.class, sub.subject, sub.score DESC';

        const results = await all(query, params);

        // Generate CSV
        let csv = 'Name,Exam Code,Class,Subject,Score,Total,Percentage,Grade,Submitted\n';

        results.forEach(r => {
            const fullName = `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.trim();
            const percentage = Math.round((r.score / r.total_questions) * 100);
            const grade = percentage >= 70 ? 'A' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 40 ? 'D' : 'F';

            csv += `"${fullName}","${r.exam_code}","${r.class}","${r.subject}",${r.score},${r.total_questions},${percentage}%,${grade},"${new Date(r.submitted_at).toLocaleString()}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="filtered_results.csv"');
        res.send(csv);
    } catch (error) {
        console.error('❌ Get filtered results error:', error);
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

// ============================================
// AUDIT LOGS - ✅ FIXED FUNCTIONS
// ============================================

/**
 * Get audit logs with filters
 * ✅ FIXED: Added async, await, and proper error handling
 */
async function getAuditLogsController(req, res) {
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

        // ✅ FIXED: Added await - was missing before!
        const logs = await getAuditLogs(filters);

        res.json({
            success: true,
            logs,
            count: logs.length
        });
    } catch (error) {
        console.error('❌ Get audit logs error:', error.message || error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve audit logs',
            details: error.message
        });
    }
}

/**
 * Get audit statistics
 * ✅ FIXED: Added async, await, and proper error handling
 */
async function getAuditStatsController(req, res) {
    try {
        // ✅ FIXED: Added await - was missing before!
        const stats = await getAuditStats();

        res.json({
            success: true,
            ...stats
        });
    } catch (error) {
        console.error('❌ Get audit stats error:', error.message || error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve audit statistics',
            details: error.message
        });
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
    exportClassResults: exportClassResultsAsText,
    getFilteredResults,

    // Dashboard
    getDashboardStats,
    getRecentSubmissions,

    // Monitoring
    getActiveExamSessions,

    // Audit Logs
    getAuditLogs: getAuditLogsController,
    getAuditStats: getAuditStatsController
};