/**
 * Monitoring Controller
 *
 * Handles real-time exam monitoring operations including:
 * - Retrieving active exam sessions with student participation statistics
 * - Tracking registered students vs completed submissions for each active exam
 * - Providing data for live exam monitoring dashboard
 */

const { all } = require('../../utils/db');

async function getActiveExamSessions(req, res) {
    try {
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
        res.status(500).json({ error: 'Failed to get active sessions' });
    }
}

module.exports = {
    getActiveExamSessions
};