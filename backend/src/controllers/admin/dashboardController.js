const { get, all } = require('../../utils/db');

/**
 * Get Dashboard Statistics
 * GET /api/admin/dashboard/stats
 */
async function getStats(req, res) {
    try {
        // Total students
        const studentsCount = await get('SELECT COUNT(*) as count FROM students');

        // Total exams
        const examsCount = await get('SELECT COUNT(*) as count FROM exams');

        // Active exams
        const activeExamsCount = await get('SELECT COUNT(*) as count FROM exams WHERE is_active = 1');

        // Total submissions
        const submissionsCount = await get('SELECT COUNT(*) as count FROM submissions');

        // Recent submissions (last 7 days)
        const recentSubmissions = await get(`
            SELECT COUNT(*) as count 
            FROM submissions 
            WHERE submitted_at >= datetime('now', '-7 days')
        `);

        // Average score
        const avgScore = await get(`
            SELECT AVG(CAST(score AS FLOAT) / CAST(total_questions AS FLOAT) * 100) as avg
            FROM submissions
            WHERE total_questions > 0
        `);

        // Students by class
        const studentsByClass = await all(`
            SELECT class, COUNT(*) as count
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

        res.json({
            success: true,
            stats: {
                totalStudents: studentsCount.count,
                totalExams: examsCount.count,
                activeExams: activeExamsCount.count,
                totalSubmissions: submissionsCount.count,
                recentSubmissions: recentSubmissions.count,
                averageScore: avgScore.avg ? Math.round(avgScore.avg) : 0,
                studentsByClass: studentsByClass
            }
        });
    } catch (error) {
        console.error('❌ Get stats error:', error);
        res.status(500).json({ error: 'Failed to get dashboard stats' });
    }
}

/**
 * Get Recent Submissions
 * GET /api/admin/dashboard/recent-submissions
 */
async function getRecentSubmissions(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const submissions = await all(`
            SELECT
                sub.id,
                sub.subject,
                sub.score,
                sub.total_questions,
                sub.submitted_at,
                s.admission_number,
                s.first_name,
                s.middle_name,
                s.last_name,
                s.class
            FROM submissions sub
                     JOIN students s ON sub.student_id = s.id
            ORDER BY sub.submitted_at DESC
                LIMIT ?
        `, [limit]);

        res.json({
            success: true,
            submissions: submissions.map(sub => ({
                id: sub.id,
                subject: sub.subject,
                score: sub.score,
                totalQuestions: sub.total_questions,
                percentage: Math.round((sub.score / sub.total_questions) * 100),
                submittedAt: sub.submitted_at,
                student: {
                    admissionNumber: sub.admission_number,
                    name: `${sub.first_name} ${sub.middle_name || ''} ${sub.last_name}`.trim(),
                    class: sub.class
                }
            }))
        });
    } catch (error) {
        console.error('❌ Get recent submissions error:', error);
        res.status(500).json({ error: 'Failed to get recent submissions' });
    }
}

module.exports = {
    getStats,
    getRecentSubmissions
};