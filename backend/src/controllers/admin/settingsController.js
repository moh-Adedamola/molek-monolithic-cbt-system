/**
 * Settings Controller
 * 
 * UPDATED: Uses centralized helpers.js
 */

const { get, run } = require('../../utils/db');
const { logAudit, ACTIONS } = require('../../services/auditService');
const { getClientIp } = require('../../utils/helpers');

/**
 * Get System Settings
 * GET /api/admin/settings
 */
async function getSettings(req, res) {
    try {
        let settings = await get('SELECT * FROM settings WHERE id = 1');

        if (!settings) {
            // Create default settings if not exists
            await run(`
                INSERT INTO settings (
                    id, system_name, school_name, academic_session, current_term,
                    default_exam_duration, auto_submit, shuffle_questions, show_results
                )
                VALUES (1, 'Molek CBT System', 'Molek School', '2024/2025', 'First Term', 60, 1, 0, 1)
            `);

            settings = await get('SELECT * FROM settings WHERE id = 1');
        }

        res.json({
            success: true,
            settings: {
                systemName: settings.system_name,
                schoolName: settings.school_name,
                academicSession: settings.academic_session,
                currentTerm: settings.current_term,
                defaultExamDuration: settings.default_exam_duration,
                autoSubmit: settings.auto_submit === 1,
                shuffleQuestions: settings.shuffle_questions === 1,
                showResults: settings.show_results === 1
            }
        });
    } catch (error) {
        console.error('❌ Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
}

/**
 * Update System Settings
 * PUT /api/admin/settings
 */
async function updateSettings(req, res) {
    try {
        const {
            systemName,
            schoolName,
            academicSession,
            currentTerm,
            defaultExamDuration,
            autoSubmit,
            shuffleQuestions,
            showResults
        } = req.body;

        await run(`
            UPDATE settings
            SET system_name = ?,
                school_name = ?,
                academic_session = ?,
                current_term = ?,
                default_exam_duration = ?,
                auto_submit = ?,
                shuffle_questions = ?,
                show_results = ?,
                updated_at = datetime('now')
            WHERE id = 1
        `, [
            systemName,
            schoolName,
            academicSession,
            currentTerm,
            defaultExamDuration,
            autoSubmit ? 1 : 0,
            shuffleQuestions ? 1 : 0,
            showResults ? 1 : 0
        ]);

        await logAudit({
            action: ACTIONS.SETTINGS_UPDATED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: 'System settings updated',
            ipAddress: getClientIp(req),
            status: 'success'
        });

        console.log('✅ Settings updated');

        res.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('❌ Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
}

module.exports = {
    getSettings,
    updateSettings
};