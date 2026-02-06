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

        // Calculate percentage and OBJ score (out of 30)
        const resultsWithScores = results.map(r => ({
            ...r,
            percentage: Math.round((r.score / r.total_questions) * 100),
            obj_score: Math.round((r.score / r.total_questions) * 30) // Nigerian format: max 30
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
 * Nigerian School Grading Format:
 * - OBJ/CBT Score: Max 30 marks
 * - Format: admission_number,subject,obj_score,total_questions
 * 
 * The Django backend will:
 * 1. Match subject by name
 * 2. Store obj_score directly (already scaled to 30)
 * 3. Combine with CA1(15) + CA2(15) + Theory(40) for total
 */
async function exportResultsToDjango(req, res) {
    try {
        const { class: classLevel, subject } = req.query;

        let query;
        let params = [];
        let filename = 'obj_scores_for_django';

        if (classLevel && subject) {
            query = `
                SELECT s.admission_number, sub.subject, sub.score, sub.total_questions
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE s.class = ? AND sub.subject = ?
                ORDER BY s.admission_number
            `;
            params = [classLevel, subject];
            filename = `${classLevel}_${subject.replace(/\s+/g, '_')}_obj_scores`;
        } else if (classLevel) {
            query = `
                SELECT s.admission_number, sub.subject, sub.score, sub.total_questions
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE s.class = ?
                ORDER BY s.admission_number, sub.subject
            `;
            params = [classLevel];
            filename = `${classLevel}_all_obj_scores`;
        } else if (subject) {
            query = `
                SELECT s.admission_number, sub.subject, sub.score, sub.total_questions
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                WHERE sub.subject = ?
                ORDER BY s.admission_number
            `;
            params = [subject];
            filename = `${subject.replace(/\s+/g, '_')}_obj_scores`;
        } else {
            query = `
                SELECT s.admission_number, sub.subject, sub.score, sub.total_questions
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                ORDER BY s.admission_number, sub.subject
            `;
            filename = 'all_obj_scores';
        }

        const results = await all(query, params);

        if (results.length === 0) {
            return res.status(404).json({ error: 'No results found' });
        }

        // =====================================================
        // NIGERIAN SCHOOL GRADING FORMAT
        // =====================================================
        // CSV Header for Django import endpoint:
        // POST /api/exam-results/import-obj-scores/
        // 
        // Score Structure:
        // - CA1: 15 marks (uploaded separately)
        // - CA2: 15 marks (uploaded separately)
        // - OBJ: 30 marks (this export)
        // - Theory: 40 marks (uploaded separately)
        // - Total: 100 marks
        // =====================================================
        
        let csv = 'admission_number,subject,obj_score,total_questions\n';

        results.forEach(r => {
            // Scale score to 30 marks (Nigerian OBJ component)
            // Formula: (correct_answers / total_questions) * 30
            const objScore = Math.round((r.score / r.total_questions) * 30);
            
            // Escape subject name if it contains comma
            const subjectEscaped = r.subject.includes(',') ? `"${r.subject}"` : r.subject;
            
            csv += `${r.admission_number},${subjectEscaped},${objScore},${r.total_questions}\n`;
        });

        await logAudit({
            action: 'RESULTS_EXPORTED',
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Exported ${results.length} OBJ scores for Django (Nigerian format)`,
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
 * Uses Nigerian grading scale: A(75+), B(70-74), C(60-69), D(50-59), E(45-49), F(<45)
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

        // Nigerian grading function
        const getGrade = (pct) => {
            if (pct >= 75) return 'A';
            if (pct >= 70) return 'B';
            if (pct >= 60) return 'C';
            if (pct >= 50) return 'D';
            if (pct >= 45) return 'E';
            return 'F';
        };

        const getRemark = (pct) => {
            if (pct >= 75) return 'Excellent';
            if (pct >= 70) return 'Very Good';
            if (pct >= 60) return 'Good';
            if (pct >= 50) return 'Pass';
            if (pct >= 45) return 'Fair';
            return 'Fail';
        };

        let text = '='.repeat(60) + '\n';
        text += '              CBT EXAM RESULTS REPORT\n';
        text += '           (Nigerian School Format)\n';
        text += '='.repeat(60) + '\n';
        text += `School: ${settings.schoolName}\n`;
        text += `Class: ${classLevel} | Subject: ${subject}\n`;
        text += `Generated: ${new Date().toLocaleString()}\n`;
        text += '-'.repeat(60) + '\n';
        text += 'Grading: A(75+) B(70-74) C(60-69) D(50-59) E(45-49) F(<45)\n';
        text += '='.repeat(60) + '\n\n';

        if (results.length === 0) {
            text += 'No results found.\n';
        } else {
            // Statistics
            const scores = results.map(r => Math.round((r.score / r.total_questions) * 100));
            const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            const highestScore = Math.max(...scores);
            const lowestScore = Math.min(...scores);
            const passCount = scores.filter(s => s >= 45).length;

            text += `SUMMARY:\n`;
            text += `Total Students: ${results.length}\n`;
            text += `Passed (≥45%): ${passCount} | Failed: ${results.length - passCount}\n`;
            text += `Average: ${avgScore}% | Highest: ${highestScore}% | Lowest: ${lowestScore}%\n`;
            text += '-'.repeat(60) + '\n\n';

            text += 'RESULTS:\n';
            text += '-'.repeat(60) + '\n';
            
            results.forEach((r, i) => {
                const name = `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.trim();
                const pct = Math.round((r.score / r.total_questions) * 100);
                const objScore = Math.round((r.score / r.total_questions) * 30);
                const grade = getGrade(pct);
                const remark = getRemark(pct);
                
                text += `${String(i + 1).padStart(2)}. ${name}\n`;
                text += `    Adm No: ${r.admission_number}\n`;
                text += `    Raw: ${r.score}/${r.total_questions} | OBJ Score: ${objScore}/30 | ${pct}%\n`;
                text += `    Grade: ${grade} (${remark})\n`;
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
                percentage,
                obj_score: Math.round((submission.score / submission.total_questions) * 30),
                grade: percentage >= 75 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : percentage >= 45 ? 'E' : 'F'
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