const { all, get } = require('../../utils/db');
const { getSettings } = require('../../services/settingsService');
const { logAudit, ACTIONS } = require('../../services/auditService');

function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        'unknown';
}

/**
 * Get class results with filters
 */
async function getClassResults(req, res) {
    try {
        const { class: classLevel, subject } = req.query;

        let query;
        let params = [];
        let filterDescription = '';

        if (classLevel && subject) {
            query = `
                SELECT
                    s.id as student_id,
                    s.admission_number,
                    s.first_name,
                    s.middle_name,
                    s.last_name,
                    s.class,
                    sub.id as submission_id,
                    sub.subject,
                    sub.score,
                    sub.total_questions,
                    sub.auto_submitted,
                    sub.submitted_at
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE s.class = ? AND sub.subject = ?
                ORDER BY sub.score DESC, s.last_name, s.first_name
            `;
            params = [classLevel, subject];
            filterDescription = `${classLevel} - ${subject}`;

        } else if (classLevel && !subject) {
            query = `
                SELECT
                    s.id as student_id,
                    s.admission_number,
                    s.first_name,
                    s.middle_name,
                    s.last_name,
                    s.class,
                    sub.id as submission_id,
                    sub.subject,
                    sub.score,
                    sub.total_questions,
                    sub.auto_submitted,
                    sub.submitted_at
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE s.class = ?
                ORDER BY sub.subject, sub.score DESC, s.last_name, s.first_name
            `;
            params = [classLevel];
            filterDescription = `${classLevel} (All Subjects)`;

        } else if (!classLevel && subject) {
            query = `
                SELECT
                    s.id as student_id,
                    s.admission_number,
                    s.first_name,
                    s.middle_name,
                    s.last_name,
                    s.class,
                    sub.id as submission_id,
                    sub.subject,
                    sub.score,
                    sub.total_questions,
                    sub.auto_submitted,
                    sub.submitted_at
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE sub.subject = ?
                ORDER BY s.class, sub.score DESC, s.last_name, s.first_name
            `;
            params = [subject];
            filterDescription = `${subject} (All Classes)`;

        } else {
            query = `
                SELECT
                    s.id as student_id,
                    s.admission_number,
                    s.first_name,
                    s.middle_name,
                    s.last_name,
                    s.class,
                    sub.id as submission_id,
                    sub.subject,
                    sub.score,
                    sub.total_questions,
                    sub.auto_submitted,
                    sub.submitted_at
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                ORDER BY s.class, sub.subject, sub.score DESC, s.last_name, s.first_name
            `;
            params = [];
            filterDescription = 'All Results';
        }

        const results = await all(query, params);

        // Calculate percentage for each result
        const resultsWithPercentage = results.map(r => ({
            ...r,
            percentage: Math.round((r.score / r.total_questions) * 100)
        }));

        res.json({
            success: true,
            results: resultsWithPercentage,
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
 * Export results to Django-compatible CSV
 * 
 * Format: admission_number,subject,exam_score
 * 
 * Django will:
 * 1. Look up student by admission_number
 * 2. Look up subject by name
 * 3. Get CA score for current session/term
 * 4. Calculate total = CA + exam_score
 * 5. Generate grades
 */
async function exportResultsToDjango(req, res) {
    try {
        const { class: classLevel, subject } = req.query;

        let query;
        let params = [];
        let filename = 'exam_results_for_django';

        if (classLevel && subject) {
            query = `
                SELECT
                    s.admission_number,
                    sub.subject,
                    sub.score as exam_score
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE s.class = ? AND sub.subject = ?
                ORDER BY s.admission_number
            `;
            params = [classLevel, subject];
            filename = `${classLevel}_${subject.replace(/\s+/g, '_')}_results`;

        } else if (classLevel && !subject) {
            query = `
                SELECT
                    s.admission_number,
                    sub.subject,
                    sub.score as exam_score
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE s.class = ?
                ORDER BY s.admission_number, sub.subject
            `;
            params = [classLevel];
            filename = `${classLevel}_all_subjects_results`;

        } else if (!classLevel && subject) {
            query = `
                SELECT
                    s.admission_number,
                    sub.subject,
                    sub.score as exam_score
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE sub.subject = ?
                ORDER BY s.admission_number
            `;
            params = [subject];
            filename = `${subject.replace(/\s+/g, '_')}_all_classes_results`;

        } else {
            query = `
                SELECT
                    s.admission_number,
                    sub.subject,
                    sub.score as exam_score
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                ORDER BY s.admission_number, sub.subject
            `;
            params = [];
            filename = 'all_results';
        }

        const results = await all(query, params);

        if (results.length === 0) {
            return res.status(404).json({ error: 'No results found for export' });
        }

        // Build CSV - Simple format for Django import
        // Header: admission_number,subject,exam_score
        let csv = 'admission_number,subject,exam_score\n';

        results.forEach(r => {
            // Escape subject name if it contains commas
            const subjectEscaped = r.subject.includes(',') ? `"${r.subject}"` : r.subject;
            csv += `${r.admission_number},${subjectEscaped},${r.exam_score}\n`;
        });

        await logAudit({
            action: 'RESULTS_EXPORTED',
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Exported ${results.length} results for Django`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { class: classLevel, subject, count: results.length }
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csv);

    } catch (error) {
        console.error('❌ Export Django CSV error:', error);
        res.status(500).json({ error: 'Failed to export results' });
    }
}

/**
 * Export results as text report
 */
async function exportClassResultsAsText(req, res) {
    try {
        const { class: classLevel, subject } = req.query;

        if (!classLevel || !subject) {
            return res.status(400).json({ error: 'Class and subject are required for text export' });
        }

        const settings = await getSettings();

        const results = await all(`
            SELECT
                s.admission_number,
                s.first_name,
                s.middle_name,
                s.last_name,
                sub.score,
                sub.total_questions,
                sub.auto_submitted,
                sub.submitted_at
            FROM submissions sub
            JOIN students s ON sub.student_id = s.id
            WHERE s.class = ? AND sub.subject = ?
            ORDER BY sub.score DESC, s.last_name, s.first_name
        `, [classLevel, subject]);

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
                const grade = percentage >= 70 ? 'A' :
                    percentage >= 60 ? 'B' :
                        percentage >= 50 ? 'C' :
                            percentage >= 40 ? 'D' : 'F';

                text += `${index + 1}. ${fullName}\n`;
                text += `   Admission No: ${r.admission_number}\n`;
                text += `   Score: ${r.score}/${r.total_questions} (${percentage}%)\n`;
                text += `   Grade: ${grade}\n`;
                if (r.auto_submitted) {
                    text += `   ⚠️  Auto-submitted (time expired)\n`;
                }
                text += `   Submitted: ${new Date(r.submitted_at).toLocaleString()}\n`;
                text += '\n';
            });

            const totalStudents = results.length;
            const averageScore = Math.round(
                results.reduce((sum, r) => sum + ((r.score / r.total_questions) * 100), 0) / totalStudents
            );
            const passCount = results.filter(r => ((r.score / r.total_questions) * 100) >= 50).length;
            const passRate = Math.round((passCount / totalStudents) * 100);
            const excellenceCount = results.filter(r => ((r.score / r.total_questions) * 100) >= 70).length;
            const excellenceRate = Math.round((excellenceCount / totalStudents) * 100);

            text += '\n==========================================================\n';
            text += '                        SUMMARY\n';
            text += '==========================================================\n';
            text += `Total Students: ${totalStudents}\n`;
            text += `Average Score: ${averageScore}%\n`;
            text += `Pass Rate: ${passRate}% (>=50%)\n`;
            text += `Passed: ${passCount}/${totalStudents}\n`;
            text += `Excellence Rate: ${excellenceRate}% (>=70%)\n`;
            text += `Excellent: ${excellenceCount}/${totalStudents}\n`;
            text += '==========================================================\n';
        }

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${classLevel}_${subject}_report.txt"`);
        res.send(text);
    } catch (error) {
        console.error('❌ Export text error:', error);
        res.status(500).json({ error: 'Failed to export results' });
    }
}

/**
 * Get detailed submission with answer history
 */
async function getSubmissionDetails(req, res) {
    try {
        const { submissionId } = req.params;

        const submission = await get(`
            SELECT 
                sub.*,
                s.admission_number,
                s.first_name,
                s.middle_name,
                s.last_name,
                s.class
            FROM submissions sub
            JOIN students s ON sub.student_id = s.id
            WHERE sub.id = ?
        `, [submissionId]);

        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        const exam = await get(
            'SELECT id FROM exams WHERE subject = ? AND class = ?',
            [submission.subject, submission.class]
        );

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        const questions = await all(`
            SELECT 
                id,
                question_text,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer,
                CASE 
                    WHEN image_url IS NOT NULL 
                    THEN '/uploads/questions/' || image_url 
                    ELSE NULL 
                END as image_url
            FROM questions
            WHERE exam_id = ?
            ORDER BY id
        `, [exam.id]);

        const studentAnswers = submission.answers ? JSON.parse(submission.answers) : {};

        const answerHistory = questions.map((q, index) => {
            const answerData = studentAnswers[q.id] || {};
            const studentAnswer = answerData.student_answer || null;
            const isCorrect = studentAnswer && 
                              studentAnswer.toUpperCase() === q.correct_answer.toUpperCase();

            return {
                question_number: index + 1,
                question_id: q.id,
                question_text: q.question_text,
                image_url: q.image_url,
                options: {
                    A: q.option_a,
                    B: q.option_b,
                    C: q.option_c,
                    D: q.option_d
                },
                correct_answer: q.correct_answer,
                student_answer: studentAnswer,
                is_correct: isCorrect
            };
        });

        const percentage = Math.round((submission.score / submission.total_questions) * 100);

        res.json({
            success: true,
            submission: {
                id: submission.id,
                student: {
                    admission_number: submission.admission_number,
                    name: `${submission.first_name} ${submission.middle_name || ''} ${submission.last_name}`.trim(),
                    class: submission.class
                },
                subject: submission.subject,
                score: submission.score,
                total_questions: submission.total_questions,
                percentage: percentage,
                auto_submitted: submission.auto_submitted,
                submitted_at: submission.submitted_at
            },
            answer_history: answerHistory
        });
    } catch (error) {
        console.error('❌ Get submission details error:', error);
        res.status(500).json({ error: 'Failed to get submission details' });
    }
}

module.exports = {
    getClassResults,
    exportResultsToDjango,
    exportClassResults: exportClassResultsAsText,
    getSubmissionDetails
};
