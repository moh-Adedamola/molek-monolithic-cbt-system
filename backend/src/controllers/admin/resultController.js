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

        // Raw scores - no scaling
        // Each question = 1 mark
        // score = number of correct answers
        // total_questions = max possible score
        const resultsWithScores = results.map(r => ({
            ...r,
            percentage: Math.round((r.score / r.total_questions) * 100)
        }));

        res.json({
            success: true,
            results: resultsWithScores,
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
 * FLEXIBLE GRADING FORMAT:
 * - Each question = 1 mark
 * - score = raw score (correct answers)
 * - total_questions = max possible marks for this assessment
 * 
 * CBT can be used for:
 * - OBJ component (e.g., 30 questions = 30 marks)
 * - CA1 (e.g., 15 questions = 15 marks)
 * - CA2 (e.g., 15 questions = 15 marks)
 * - Any custom assessment
 * 
 * Django admin decides how scores combine to make 100
 */
async function exportResultsToDjango(req, res) {
    try {
        const { class: classLevel, subject } = req.query;

        let query;
        let params = [];
        let filename = 'cbt_scores_for_django';

        if (classLevel && subject) {
            query = `
                SELECT s.admission_number, sub.subject, sub.score, sub.total_questions
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE s.class = ? AND sub.subject = ?
                ORDER BY s.admission_number
            `;
            params = [classLevel, subject];
            filename = `${classLevel}_${subject.replace(/\s+/g, '_')}_cbt_scores`;
        } else if (classLevel) {
            query = `
                SELECT s.admission_number, sub.subject, sub.score, sub.total_questions
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE s.class = ?
                ORDER BY s.admission_number, sub.subject
            `;
            params = [classLevel];
            filename = `${classLevel}_all_cbt_scores`;
        } else if (subject) {
            query = `
                SELECT s.admission_number, sub.subject, sub.score, sub.total_questions
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE sub.subject = ?
                ORDER BY s.admission_number
            `;
            params = [subject];
            filename = `${subject.replace(/\s+/g, '_')}_cbt_scores`;
        } else {
            query = `
                SELECT s.admission_number, sub.subject, sub.score, sub.total_questions
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                ORDER BY s.admission_number, sub.subject
            `;
            filename = 'all_cbt_scores';
        }

        const results = await all(query, params);

        if (results.length === 0) {
            return res.status(404).json({ error: 'No results found' });
        }

        // =====================================================
        // RAW SCORE FORMAT - NO SCALING
        // =====================================================
        // Each question = 1 mark
        // obj_score = correct answers (raw score)
        // total_questions = max possible marks
        // 
        // Example: 20 questions exam
        // - Student gets 15 correct → obj_score = 15, total = 20
        // - Student gets 18 correct → obj_score = 18, total = 20
        // 
        // Django admin imports and assigns to appropriate component
        // (OBJ, CA1, CA2, etc.)
        // =====================================================
        
        let csv = 'admission_number,subject,obj_score,total_questions\n';

        results.forEach(r => {
            // RAW SCORE - no scaling
            // obj_score = number of correct answers
            // total_questions = max possible score
            const subjectEscaped = r.subject.includes(',') ? `"${r.subject}"` : r.subject;
            
            csv += `${r.admission_number},${subjectEscaped},${r.score},${r.total_questions}\n`;
        });

        await logAudit({
            action: 'RESULTS_EXPORTED',
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Exported ${results.length} CBT scores for Django (raw scores)`,
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
        text += '              CBT EXAM RESULTS REPORT\n';
        text += '='.repeat(60) + '\n';
        text += `School: ${settings.schoolName}\n`;
        text += `Class: ${classLevel} | Subject: ${subject}\n`;
        text += `Total Questions: ${results[0]?.total_questions || 'N/A'}\n`;
        text += `Generated: ${new Date().toLocaleString()}\n`;
        text += '='.repeat(60) + '\n\n';

        if (results.length === 0) {
            text += 'No results found.\n';
        } else {
            // Statistics
            const scores = results.map(r => r.score);
            const totalQ = results[0].total_questions;
            const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            const highestScore = Math.max(...scores);
            const lowestScore = Math.min(...scores);
            const avgPercent = Math.round((avgScore / totalQ) * 100);

            text += `SUMMARY:\n`;
            text += `Total Students: ${results.length}\n`;
            text += `Average Score: ${avgScore}/${totalQ} (${avgPercent}%)\n`;
            text += `Highest: ${highestScore}/${totalQ} | Lowest: ${lowestScore}/${totalQ}\n`;
            text += '-'.repeat(60) + '\n\n';

            text += 'RESULTS:\n';
            text += '-'.repeat(60) + '\n';
            
            results.forEach((r, i) => {
                const name = `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.trim();
                const pct = Math.round((r.score / r.total_questions) * 100);
                
                text += `${String(i + 1).padStart(2)}. ${name}\n`;
                text += `    Adm No: ${r.admission_number}\n`;
                text += `    Score: ${r.score}/${r.total_questions} (${pct}%)\n`;
                if (r.auto_submitted) {
                    text += `    ⚠️ Auto-submitted (time expired)\n`;
                }
                text += '\n';
            });
        }

        text += '='.repeat(60) + '\n';
        text += 'END OF REPORT\n';

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

        const percentage = Math.round((submission.score / submission.total_questions) * 100);

        res.json({
            success: true,
            submission: {
                ...submission,
                percentage
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