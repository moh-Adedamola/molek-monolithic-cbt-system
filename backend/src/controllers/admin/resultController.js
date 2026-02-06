const { all, get } = require('../../utils/db');
const { getSettings } = require('../../services/settingsService');
const { logAudit } = require('../../services/auditService');
const { getClientIp } = require('../../utils/helpers');

/**
 * Nigerian School Grading Format:
 * - CA1: 15 marks
 * - CA2: 15 marks
 * - OBJ/CBT: 30 marks (THIS IS WHAT CBT EXPORTS)
 * - Theory: 40 marks
 * - Total: 100 marks
 * 
 * Grading Scale:
 * A: 75-100 (Excellent)
 * B: 70-74 (Very Good)
 * C: 60-69 (Good)
 * D: 50-59 (Pass)
 * E: 45-49 (Fair)
 * F: 0-44 (Fail)
 */

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

        // Calculate OBJ score (raw out of 30) and percentage
        const resultsWithScores = results.map(r => {
            // Scale raw score to 30 (OBJ component)
            const objScore = Math.round((r.score / r.total_questions) * 30);
            const percentage = Math.round((r.score / r.total_questions) * 100);
            
            return {
                ...r,
                obj_score: objScore,
                percentage: percentage
            };
        });

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
 * Nigerian School Format:
 * - CSV Header: admission_number,subject,obj_score,total_questions
 * - obj_score: Raw score scaled to 30 (OBJ component of exam)
 * - total_questions: Number of questions in exam (typically 30)
 * 
 * Django will:
 * 1. Look up student by admission_number
 * 2. Look up subject by name
 * 3. Auto-pull CA1+CA2 from CAScore table
 * 4. Set obj_score from this CSV
 * 5. Theory score uploaded separately after manual marking
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

        // CSV Header: admission_number,subject,obj_score,total_questions
        // This matches Django's import-obj-scores endpoint
        let csv = 'admission_number,subject,obj_score,total_questions\n';

        results.forEach(r => {
            // Scale score to 30 (OBJ component)
            // Formula: (raw_score / total_questions) * 30
            const objScore = Math.round((r.score / r.total_questions) * 30);
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

        let text = '='.repeat(70) + '\n';
        text += '                    CBT EXAM RESULTS REPORT\n';
        text += '                    (OBJ Component - 30 marks)\n';
        text += '='.repeat(70) + '\n';
        text += `School: ${settings.schoolName}\n`;
        text += `Class: ${classLevel} | Subject: ${subject}\n`;
        text += `Generated: ${new Date().toLocaleString()}\n`;
        text += '='.repeat(70) + '\n\n';
        text += 'Nigerian Grading: A(75+) B(70-74) C(60-69) D(50-59) E(45-49) F(<45)\n\n';

        if (results.length === 0) {
            text += 'No results found.\n';
        } else {
            text += 'Rank | Name                           | Adm No        | Raw  | OBJ/30 | %   | Grade\n';
            text += '-'.repeat(90) + '\n';
            
            results.forEach((r, i) => {
                const name = `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.trim().padEnd(30);
                const admNo = r.admission_number.padEnd(13);
                const rawScore = `${r.score}/${r.total_questions}`.padStart(5);
                const objScore = Math.round((r.score / r.total_questions) * 30);
                const pct = Math.round((r.score / r.total_questions) * 100);
                
                // Nigerian grading scale
                let grade;
                if (pct >= 75) grade = 'A';
                else if (pct >= 70) grade = 'B';
                else if (pct >= 60) grade = 'C';
                else if (pct >= 50) grade = 'D';
                else if (pct >= 45) grade = 'E';
                else grade = 'F';
                
                text += `${String(i + 1).padStart(4)} | ${name} | ${admNo} | ${rawScore} | ${String(objScore).padStart(6)} | ${String(pct).padStart(3)}% | ${grade}\n`;
            });
            
            text += '\n' + '='.repeat(70) + '\n';
            text += `Total Students: ${results.length}\n`;
            
            const avgPct = Math.round(results.reduce((sum, r) => sum + (r.score / r.total_questions) * 100, 0) / results.length);
            text += `Class Average: ${avgPct}%\n`;
            
            const passed = results.filter(r => (r.score / r.total_questions) * 100 >= 45).length;
            text += `Pass Rate (≥45%): ${Math.round((passed / results.length) * 100)}% (${passed}/${results.length})\n`;
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

        // Calculate OBJ score (out of 30)
        const objScore = Math.round((submission.score / submission.total_questions) * 30);
        const percentage = Math.round((submission.score / submission.total_questions) * 100);

        res.json({
            success: true,
            submission: {
                ...submission,
                obj_score: objScore,
                percentage: percentage
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