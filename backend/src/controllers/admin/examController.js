/**
 * Exam Controller
 * Handles exam CRUD operations
 * 
 * UPDATED: Uses centralized helpers.js
 */

const { get, all, run } = require('../../utils/db');
const { logAudit, ACTIONS } = require('../../services/auditService');
const { getClientIp } = require('../../utils/helpers');

/**
 * Get All Exams
 * GET /api/admin/exams
 */
async function getAllExams(req, res) {
    try {
        const exams = await all(`
            SELECT
                e.*,
                COUNT(q.id) as question_count
            FROM exams e
                     LEFT JOIN questions q ON e.id = q.exam_id
            GROUP BY e.id
            ORDER BY e.created_at DESC
        `);

        res.json({
            success: true,
            exams: exams.map(exam => ({
                id: exam.id,
                subject: exam.subject,
                class: exam.class,
                durationMinutes: exam.duration_minutes,
                isActive: exam.is_active === 1,
                questionCount: exam.question_count,
                createdAt: exam.created_at
            }))
        });
    } catch (error) {
        console.error('❌ Get all exams error:', error);
        res.status(500).json({ error: 'Failed to get exams' });
    }
}

/**
 * Get Exam by ID
 * GET /api/admin/exams/:id
 */
async function getExamById(req, res) {
    try {
        const { id } = req.params;

        const exam = await get('SELECT * FROM exams WHERE id = ?', [id]);

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        const questions = await all('SELECT * FROM questions WHERE exam_id = ?', [id]);

        res.json({
            success: true,
            exam: {
                id: exam.id,
                subject: exam.subject,
                class: exam.class,
                durationMinutes: exam.duration_minutes,
                isActive: exam.is_active === 1,
                createdAt: exam.created_at
            },
            questions
        });
    } catch (error) {
        console.error('❌ Get exam by ID error:', error);
        res.status(500).json({ error: 'Failed to get exam' });
    }
}

/**
 * Update Exam
 * PUT /api/admin/exams/:id
 */
async function updateExam(req, res) {
    try {
        const { id } = req.params;
        const { duration_minutes } = req.body;

        await run(
            'UPDATE exams SET duration_minutes = ? WHERE id = ?',
            [duration_minutes, id]
        );

        await logAudit({
            action: ACTIONS.EXAM_UPDATED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Updated exam ID: ${id}`,
            ipAddress: getClientIp(req),
            status: 'success'
        });

        res.json({
            success: true,
            message: 'Exam updated successfully'
        });
    } catch (error) {
        console.error('❌ Update exam error:', error);
        res.status(500).json({ error: 'Failed to update exam' });
    }
}

/**
 * Delete Exam
 * DELETE /api/admin/exams/:id
 */
async function deleteExam(req, res) {
    try {
        const { id } = req.params;

        // Get exam info before deleting
        const exam = await get('SELECT * FROM exams WHERE id = ?', [id]);

        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // Delete exam (cascade will delete questions)
        await run('DELETE FROM exams WHERE id = ?', [id]);

        await logAudit({
            action: ACTIONS.EXAM_DELETED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Deleted exam: ${exam.subject} (${exam.class})`,
            ipAddress: getClientIp(req),
            status: 'success'
        });

        res.json({
            success: true,
            message: 'Exam deleted successfully'
        });
    } catch (error) {
        console.error('❌ Delete exam error:', error);
        res.status(500).json({ error: 'Failed to delete exam' });
    }
}

/**
 * Activate/Deactivate Exam
 * PATCH /api/admin/exams/activate
 */
async function activateExam(req, res) {
    try {
        const { subject, class: classLevel, is_active } = req.body;

        await run(
            'UPDATE exams SET is_active = ? WHERE subject = ? AND class = ?',
            [is_active ? 1 : 0, subject, classLevel]
        );

        await logAudit({
            action: is_active ? ACTIONS.EXAM_ACTIVATED : ACTIONS.EXAM_DEACTIVATED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `${is_active ? 'Activated' : 'Deactivated'} exam: ${subject} (${classLevel})`,
            ipAddress: getClientIp(req),
            status: 'success'
        });

        res.json({
            success: true,
            message: `Exam ${is_active ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        console.error('❌ Activate exam error:', error);
        res.status(500).json({ error: 'Failed to update exam status' });
    }
}

/**
 * Get All Subjects
 * GET /api/admin/subjects
 *
 * Returns both:
 * - Flat array of subjects (for filters)
 * - Grouped by class (for SubjectManagement page)
 */
async function getSubjects(req, res) {
    try {
        // Get all unique subject-class combinations
        const exams = await all(`
            SELECT DISTINCT subject, class
            FROM exams
            ORDER BY class, subject
        `);

        // Create flat list for filters
        const uniqueSubjects = [...new Set(exams.map(e => e.subject))].sort();

        // Group by class for SubjectManagement
        const subjectsByClass = {};
        exams.forEach(exam => {
            if (!subjectsByClass[exam.class]) {
                subjectsByClass[exam.class] = [];
            }
            if (!subjectsByClass[exam.class].includes(exam.subject)) {
                subjectsByClass[exam.class].push(exam.subject);
            }
        });

        res.json({
            success: true,
            subjects: uniqueSubjects,           // Flat array for filters
            subjectsByClass: subjectsByClass   // Grouped by class for SubjectManagement
        });
    } catch (error) {
        console.error('❌ Get subjects error:', error);
        res.status(500).json({ error: 'Failed to get subjects' });
    }
}

module.exports = {
    getAllExams,
    getExamById,
    updateExam,
    deleteExam,
    activateExam,
    getSubjects
};