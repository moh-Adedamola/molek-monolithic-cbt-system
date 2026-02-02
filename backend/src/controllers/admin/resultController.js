const { all, get } = require('../../utils/db');
const { getSettings } = require('../../services/settingsService');
const { logAudit } = require('../../services/auditService');
const { getClientIp } = require('../../utils/helpers');

/**
 * Get class results with filters
 */
async function getClassResults(req, res) {
    try {
        const { class: classLevel, subject } = req.query;

        let query;
        let params = [];

        if (classLevel && subject) {
            query = `
                SELECT s.admission_number, s.first_name, s.middle_name, s.last_name, s.class,
                       sub.id as submission_id, sub.subject, sub.score, sub.total_questions,
                       sub.auto_submitted, sub.submitted_at
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE s.class = ? AND sub.subject = ?
                ORDER BY sub.score DESC
            `;
            params = [classLevel, subject];
        } else if (classLevel) {
            query = `
                SELECT s.admission_number, s.first_name, s.middle_name, s.last_name, s.class,
                       sub.id as submission_id, sub.subject, sub.score, sub.total_questions,
                       sub.auto_submitted, sub.submitted_at
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE s.class = ?
                ORDER BY sub.subject, sub.score DESC
            `;
            params = [classLevel];
        } else if (subject) {
            query = `
                SELECT s.admission_number, s.first_name, s.middle_name, s.last_name, s.class,
                       sub.id as submission_id, sub.subject, sub.score, sub.total_questions,
                       sub.auto_submitted, sub.submitted_at
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE sub.subject = ?
                ORDER BY s.class, sub.score DESC
            `;
            params = [subject];
        } else {
            query = `
                SELECT s.admission_number, s.first_name, s.middle_name, s.last_name, s.class,
                       sub.id as submission_id, sub.subject, sub.score, sub.total_questions,
                       sub.auto_submitted, sub.submitted_at
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                ORDER BY s.class, sub.subject, sub.score DESC
            `;
        }

        const results = await all(query, params);

        const resultsWithPercentage = results.map(r => ({
            ...r,
            percentage: Math.round((r.score / r.total_questions) * 100)
        }));

        res.json({
            success: true,
            results: resultsWithPercentage,
            count: results.length
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
 * Subject is the NAME (not code) - Django will match by name
 */
async function exportResultsToDjango(req, res) {
    try {
        const { class: classLevel, subject } = req.query;

        let query;
        let params = [];
        let filename = 'exam_results_for_django';

        if (classLevel && subject) {
            query = `
                SELECT s.admission_number, sub.subject, sub.score, sub.total_questions
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE s.class = ? AND sub.subject = ?
                ORDER BY s.admission_number
            `;
            params = [classLevel, subject];
            filename = `${classLevel}_${subject.replace(/\s+/g, '_')}_results`;
        } else if (classLevel) {
            query = `
                SELECT s.admission_number, sub.subject, sub.score, sub.total_questions
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE s.class = ?
                ORDER BY s.admission_number, sub.subject
            `;
            params = [classLevel];
            filename = `${classLevel}_all_results`;
        } else if (subject) {
            query = `
                SELECT s.admission_number, sub.subject, sub.score, sub.total_questions
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE sub.subject = ?
                ORDER BY s.admission_number
            `;
            params = [subject];
            filename = `${subject.replace(/\s+/g, '_')}_results`;
        } else {
            query = `
                SELECT s.admission_number, sub.subject, sub.score, sub.total_questions
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                ORDER BY s.admission_number, sub.subject
            `;
            filename = 'all_results';
        }

        const results = await all(query, params);

        if (results.length === 0) {
            return res.status(404).json({ error: 'No results found' });
        }

        // CSV Header: admission_number,subject,exam_score
        let csv = 'admission_number,subject,exam_score\n';

        results.forEach(r => {
            // Scale score: (raw/total) * 70 for Django
            const scaledScore = Math.round((r.score / r.total_questions) * 70);
            const subjectEscaped = r.subject.includes(',') ? `"${r.subject}"` : r.subject;
            csv += `${r.admission_number},${subjectEscaped},${scaledScore}\n`;
        });

        await logAudit({
            action: 'RESULTS_EXPORTED',
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Exported ${results.length} results for Django`,
            ipAddress: getClientIp(req),
            status: 'success'
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csv);

    } catch (error) {
        console.error('❌ Export error:', error);
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
            return res.status(400).json({ error: 'Class and subject required' });
        }

        const settings = await getSettings();

        const results = await all(`
            SELECT s.admission_number, s.first_name, s.middle_name, s.last_name,
                   sub.score, sub.total_questions, sub.auto_submitted, sub.submitted_at
            FROM submissions sub
            JOIN students s ON sub.student_id = s.id
            WHERE s.class = ? AND sub.subject = ?
            ORDER BY sub.score DESC
        `, [classLevel, subject]);

        let text = '='.repeat(60) + '\n';
        text += '                    EXAM RESULTS REPORT\n';
        text += '='.repeat(60) + '\n';
        text += `School: ${settings.schoolName}\n`;
        text += `Class: ${classLevel} | Subject: ${subject}\n`;
        text += `Generated: ${new Date().toLocaleString()}\n`;
        text += '='.repeat(60) + '\n\n';

        if (results.length === 0) {
            text += 'No results found.\n';
        } else {
            results.forEach((r, i) => {
                const name = `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.trim();
                const pct = Math.round((r.score / r.total_questions) * 100);
                const grade = pct >= 70 ? 'A' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
                text += `${i + 1}. ${name} (${r.admission_number})\n`;
                text += `   Score: ${r.score}/${r.total_questions} (${pct}%) - Grade: ${grade}\n\n`;
            });
        }

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${classLevel}_${subject}_report.txt"`);
        res.send(text);
    } catch (error) {
        console.error('❌ Export text error:', error);
        res.status(500).json({ error: 'Failed to export' });
    }
}

/**
 * Get submission details
 */
async function getSubmissionDetails(req, res) {
    try {
        const { submissionId } = req.params;

        const submission = await get(`
            SELECT sub.*, s.admission_number, s.first_name, s.middle_name, s.last_name, s.class
            FROM submissions sub
            JOIN students s ON sub.student_id = s.id
            WHERE sub.id = ?
        `, [submissionId]);

        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        res.json({
            success: true,
            submission: {
                ...submission,
                percentage: Math.round((submission.score / submission.total_questions) * 100)
            }
        });
    } catch (error) {
        console.error('❌ Get submission error:', error);
        res.status(500).json({ error: 'Failed to get submission' });
    }
}

module.exports = {
    getClassResults,
    exportResultsToDjango,
    exportClassResults: exportClassResultsAsText,
    getSubmissionDetails
};