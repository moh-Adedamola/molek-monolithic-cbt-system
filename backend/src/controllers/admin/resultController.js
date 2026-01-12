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
                    sub.total_possible_points,
                    sub.theory_pending,
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
                    sub.total_possible_points,
                    sub.theory_pending,
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
                    sub.total_possible_points,
                    sub.theory_pending,
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
                    sub.total_possible_points,
                    sub.theory_pending,
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
 * ✅ NEW: Export results to Django-compatible CSV
 * Format: admission_number,subject,exam_score,submitted_at
 */
async function exportResultsToDjango(req, res) {
    try {
        const { class: classLevel, subject } = req.query;

        let query;
        let params = [];
        let filename = 'exam_results';

        if (classLevel && subject) {
            query = `
                SELECT
                    s.admission_number,
                    sub.subject,
                    sub.score as exam_score,
                    sub.submitted_at
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
                    sub.score as exam_score,
                    sub.submitted_at
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
                    sub.score as exam_score,
                    sub.submitted_at
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
                    sub.score as exam_score,
                    sub.submitted_at
                FROM submissions sub
                JOIN students s ON sub.student_id = s.id
                ORDER BY s.admission_number, sub.subject
            `;
            params = [];
            filename = 'all_results';
        }

        const results = await all(query, params);

        if (results.length === 0) {
            return res.status(404).json({
                error: 'No results found',
                message: 'No exam results available for the specified filters'
            });
        }

        // Generate Django-compatible CSV
        let csv = 'admission_number,subject,exam_score,submitted_at\n';

        results.forEach(r => {
            // Format timestamp to ISO 8601 (Django compatible)
            const timestamp = new Date(r.submitted_at).toISOString();

            csv += `${r.admission_number},"${r.subject}",${r.exam_score},${timestamp}\n`;
        });

        await logAudit({
            action: ACTIONS.RESULTS_EXPORTED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Exported ${results.length} results to Django CSV (Class: ${classLevel || 'All'}, Subject: ${subject || 'All'})`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: {
                class: classLevel,
                subject: subject,
                resultCount: results.length
            }
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}_for_django.csv"`);
        res.send(csv);

    } catch (error) {
        console.error('❌ Export to Django error:', error);
        res.status(500).json({ error: 'Failed to export results' });
    }
}

/**
 * Export results as formatted text report (for internal use)
 */
async function exportClassResultsAsText(req, res) {
    try {
        const { class: classLevel, subject } = req.query;

        if (!classLevel || !subject) {
            return res.status(400).json({
                error: 'Both class and subject are required for text export'
            });
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
                sub.total_possible_points,
                sub.theory_pending,
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
                const totalPoints = r.total_possible_points || r.total_questions;
                const percentage = Math.round((r.score / totalPoints) * 100);
                const grade = percentage >= 70 ? 'A' :
                    percentage >= 60 ? 'B' :
                        percentage >= 50 ? 'C' :
                            percentage >= 40 ? 'D' : 'F';

                text += `${index + 1}. ${fullName}\n`;
                text += `   Admission No: ${r.admission_number}\n`;
                text += `   Score: ${r.score}/${totalPoints} (${percentage}%)${r.theory_pending ? ' *' : ''}\n`;
                text += `   Grade: ${grade}\n`;
                if (r.auto_submitted) {
                    text += `   ⚠️  Auto-submitted (time expired)\n`;
                }
                if (r.theory_pending) {
                    text += `   * Theory questions pending grading\n`;
                }
                text += `   Submitted: ${new Date(r.submitted_at).toLocaleString()}\n`;
                text += '\n';
            });

            const totalStudents = results.length;
            const totalPoints = results[0].total_possible_points || results[0].total_questions;
            const averageScore = Math.round(
                results.reduce((sum, r) => sum + ((r.score / (r.total_possible_points || r.total_questions)) * 100), 0) / totalStudents
            );
            const passCount = results.filter(r => ((r.score / (r.total_possible_points || r.total_questions)) * 100) >= 50).length;
            const passRate = Math.round((passCount / totalStudents) * 100);
            const excellenceCount = results.filter(r => ((r.score / (r.total_possible_points || r.total_questions)) * 100) >= 70).length;
            const excellenceRate = Math.round((excellenceCount / totalStudents) * 100);
            const pendingCount = results.filter(r => r.theory_pending).length;

            text += '\n==========================================================\n';
            text += '                        SUMMARY\n';
            text += '==========================================================\n';
            text += `Total Students: ${totalStudents}\n`;
            text += `Average Score: ${averageScore}%\n`;
            text += `Pass Rate: ${passRate}% (>=50%)\n`;
            text += `Passed: ${passCount}/${totalStudents}\n`;
            text += `Excellence Rate: ${excellenceRate}% (>=70%)\n`;
            text += `Excellent: ${excellenceCount}/${totalStudents}\n`;
            if (pendingCount > 0) {
                text += `Theory Pending: ${pendingCount} submission(s)\n`;
            }
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
                question_type,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer,
                theory_answer,
                points,
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
            const studentAnswer = studentAnswers[q.id];
            const isCorrect = q.question_type === 'mcq'
                ? studentAnswer === q.correct_answer
                : null;

            return {
                question_number: index + 1,
                question_id: q.id,
                question_text: q.question_text,
                question_type: q.question_type,
                image_url: q.image_url,
                options: q.question_type === 'mcq' ? {
                    A: q.option_a,
                    B: q.option_b,
                    C: q.option_c,
                    D: q.option_d
                } : null,
                correct_answer: q.correct_answer,
                theory_answer: q.theory_answer,
                student_answer: studentAnswer || null,
                is_correct: isCorrect,
                points: q.points,
                points_earned: isCorrect ? q.points : 0
            };
        });

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
                total_possible_points: submission.total_possible_points,
                theory_pending: submission.theory_pending,
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