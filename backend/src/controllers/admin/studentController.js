const { run, all } = require('../../utils/db');
const { hashPassword } = require('../../services/authService');
const { parseCsvBuffer } = require('../../services/csvService');
const { logAudit, ACTIONS } = require('../../services/auditService');

function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        'unknown';
}

/**
 * ✅ ENHANCED: Import students from Django CSV
 * CSV Format: admission_number,first_name,middle_name,last_name,class_level,password_plain
 */
async function bulkCreateStudents(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('📥 Processing student CSV from Django...');

        const students = await parseCsvBuffer(req.file.buffer);

        if (students.length === 0) {
            return res.status(400).json({ error: 'No valid students found in CSV file' });
        }

        // Validate CSV format
        const firstStudent = students[0];
        const requiredFields = ['admission_number', 'first_name', 'last_name', 'class_level', 'password_plain'];
        const missingFields = requiredFields.filter(field => !firstStudent[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Invalid CSV format',
                missing_fields: missingFields,
                required_fields: requiredFields,
                sample: 'admission_number,first_name,middle_name,last_name,class_level,password_plain'
            });
        }

        const results = {
            success: [],
            failed: [],
            updated: []
        };

        for (const s of students) {
            try {
                const admissionNumber = s.admission_number?.trim().toUpperCase();
                const firstName = s.first_name?.trim();
                const middleName = s.middle_name?.trim() || null;
                const lastName = s.last_name?.trim();
                const classLevel = s.class_level?.trim().toUpperCase();
                const passwordPlain = s.password_plain?.trim();

                // Validate required fields
                if (!admissionNumber || !firstName || !lastName || !classLevel || !passwordPlain) {
                    results.failed.push({
                        admission_number: admissionNumber || 'UNKNOWN',
                        error: 'Missing required fields'
                    });
                    continue;
                }

                // Validate class level
                const validClasses = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
                if (!validClasses.includes(classLevel)) {
                    results.failed.push({
                        admission_number: admissionNumber,
                        error: `Invalid class level: ${classLevel}. Must be one of: ${validClasses.join(', ')}`
                    });
                    continue;
                }

                // Hash password
                const passwordHash = await hashPassword(passwordPlain);

                // Check if student already exists
                const existingStudent = await require('../../utils/db').get(
                    'SELECT id FROM students WHERE admission_number = ?',
                    [admissionNumber]
                );

                if (existingStudent) {
                    // Update existing student
                    await run(`
                        UPDATE students
                        SET first_name = ?,
                            middle_name = ?,
                            last_name = ?,
                            class = ?,
                            password_hash = ?
                        WHERE admission_number = ?
                    `, [firstName, middleName, lastName, classLevel, passwordHash, admissionNumber]);

                    results.updated.push({
                        admission_number: admissionNumber,
                        first_name: firstName,
                        middle_name: middleName,
                        last_name: lastName,
                        class: classLevel
                    });

                    console.log(`✅ Updated: ${admissionNumber} - ${firstName} ${lastName}`);
                } else {
                    // Insert new student
                    await run(`
                        INSERT INTO students (admission_number, first_name, middle_name, last_name, class, password_hash)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [admissionNumber, firstName, middleName, lastName, classLevel, passwordHash]);

                    results.success.push({
                        admission_number: admissionNumber,
                        first_name: firstName,
                        middle_name: middleName,
                        last_name: lastName,
                        class: classLevel
                    });

                    console.log(`✅ Created: ${admissionNumber} - ${firstName} ${lastName}`);
                }

            } catch (err) {
                console.error(`❌ Error processing student:`, err);
                results.failed.push({
                    admission_number: s.admission_number || 'UNKNOWN',
                    error: err.message
                });
            }
        }

        await logAudit({
            action: ACTIONS.STUDENTS_BULK_UPLOADED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Imported from Django: ${results.success.length} created, ${results.updated.length} updated, ${results.failed.length} failed`,
            ipAddress: getClientIp(req),
            status: results.failed.length === 0 ? 'success' : 'warning',
            metadata: {
                created: results.success.length,
                updated: results.updated.length,
                failed: results.failed.length
            }
        });

        // Generate formatted text output
        const textOutput = generateStudentSummary(results);

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="student_import_summary.txt"');
        res.send(textOutput);

    } catch (error) {
        console.error('❌ Bulk upload error:', error);
        res.status(500).json({
            error: 'Bulk upload failed',
            details: error.message
        });
    }
}

/**
 * Generate formatted text summary of import results
 */
function generateStudentSummary(results) {
    let text = '';

    text += '============================================================\n';
    text += '           STUDENT IMPORT FROM DJANGO - SUMMARY\n';
    text += '============================================================\n';
    text += `Import Date: ${new Date().toLocaleString()}\n`;
    text += `Total Processed: ${results.success.length + results.updated.length + results.failed.length}\n`;
    text += `✅ Successfully Created: ${results.success.length}\n`;
    text += `🔄 Updated Existing: ${results.updated.length}\n`;
    text += `❌ Failed: ${results.failed.length}\n`;
    text += '============================================================\n\n';

    // Successfully created
    if (results.success.length > 0) {
        text += '✅ SUCCESSFULLY CREATED STUDENTS:\n';
        text += '------------------------------------------------------------\n';
        text += 'Admission No.    Name                      Class\n';
        text += '------------------------------------------------------------\n';

        results.success.forEach(s => {
            const fullName = `${s.first_name} ${s.middle_name ? s.middle_name + ' ' : ''}${s.last_name}`;
            const admPadded = s.admission_number.padEnd(16);
            const namePadded = fullName.padEnd(26);
            text += `${admPadded} ${namePadded} ${s.class}\n`;
        });
        text += '\n';
    }

    // Updated students
    if (results.updated.length > 0) {
        text += '🔄 UPDATED EXISTING STUDENTS:\n';
        text += '------------------------------------------------------------\n';
        text += 'Admission No.    Name                      Class\n';
        text += '------------------------------------------------------------\n';

        results.updated.forEach(s => {
            const fullName = `${s.first_name} ${s.middle_name ? s.middle_name + ' ' : ''}${s.last_name}`;
            const admPadded = s.admission_number.padEnd(16);
            const namePadded = fullName.padEnd(26);
            text += `${admPadded} ${namePadded} ${s.class}\n`;
        });
        text += '\n';
    }

    // Failed entries
    if (results.failed.length > 0) {
        text += '❌ FAILED TO IMPORT:\n';
        text += '------------------------------------------------------------\n';
        results.failed.forEach(f => {
            text += `${f.admission_number}: ${f.error}\n`;
        });
        text += '\n';
    }

    text += '============================================================\n';
    text += '                    IMPORT COMPLETE\n';
    text += '============================================================\n';

    return text;
}

/**
 * Get all classes with student counts
 */
async function getClasses(req, res) {
    try {
        const rows = await all(`
            SELECT
                class,
                COUNT(*) as count
            FROM students
            GROUP BY class
            ORDER BY
                CASE class
                WHEN 'JSS1' THEN 1
                WHEN 'JSS2' THEN 2
                WHEN 'JSS3' THEN 3
                WHEN 'SS1' THEN 4
                WHEN 'SS2' THEN 5
                WHEN 'SS3' THEN 6
                ELSE 7
            END
        `);

        res.json({ classes: rows });
    } catch (error) {
        console.error('❌ Get classes error:', error);
        res.status(500).json({ error: 'Failed to get classes' });
    }
}

/**
 * Delete all students in a class
 */
async function deleteStudentsByClass(req, res) {
    try {
        const { class: classLevel } = req.body;

        if (!classLevel) {
            return res.status(400).json({ error: 'class required' });
        }

        const result = await run('DELETE FROM students WHERE class = ?', [classLevel]);

        await logAudit({
            action: ACTIONS.CLASS_DELETED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Deleted ${result.changes} students from ${classLevel}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { class: classLevel, deletedCount: result.changes }
        });

        res.json({
            success: true,
            message: `Deleted ${result.changes} students from ${classLevel}`,
            deletedCount: result.changes
        });
    } catch (error) {
        console.error('❌ Delete class error:', error);
        res.status(500).json({ error: 'Failed to delete class' });
    }
}

/**
 * Export students by class (for verification purposes)
 */
async function exportStudentsByClass(req, res) {
    try {
        const { class: classLevel } = req.query;

        if (!classLevel) {
            return res.status(400).json({ error: 'class parameter required' });
        }

        const students = await all(`
            SELECT admission_number, first_name, middle_name, last_name, class
            FROM students
            WHERE class = ?
            ORDER BY last_name, first_name
        `, [classLevel]);

        if (students.length === 0) {
            return res.status(404).json({ error: 'No students found for this class' });
        }

        let text = '============================================================\n';
        text += `                  STUDENT LIST - ${classLevel}\n`;
        text += '============================================================\n';
        text += `Total Students: ${students.length}\n`;
        text += `Generated: ${new Date().toLocaleString()}\n`;
        text += '============================================================\n\n';
        text += 'Admission No.    Name\n';
        text += '------------------------------------------------------------\n';

        students.forEach(s => {
            const fullName = `${s.first_name} ${s.middle_name ? s.middle_name + ' ' : ''}${s.last_name}`;
            const admPadded = s.admission_number.padEnd(16);
            text += `${admPadded} ${fullName}\n`;
        });

        text += '============================================================\n';

        await logAudit({
            action: ACTIONS.STUDENTS_EXPORTED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Exported ${students.length} students from ${classLevel}`,
            ipAddress: getClientIp(req),
            status: 'success'
        });

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${classLevel}_students.txt"`);
        res.send(text);
    } catch (error) {
        console.error('❌ Export students error:', error);
        res.status(500).json({ error: 'Failed to export students' });
    }
}

module.exports = {
    bulkCreateStudents,
    getClasses,
    deleteStudentsByClass,
    exportStudentsByClass
};