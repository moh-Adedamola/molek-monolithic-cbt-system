// backend/src/controllers/settingsController.js

const { getSettings, updateSettings } = require('../services/settingsService');

/**
 * Get system settings
 */
async function getSystemSettings(req, res) {
    try {
        const settings = await getSettings();
        console.log('⚙️  Settings retrieved:', settings);
        res.json({ success: true, settings });
    } catch (error) {
        console.error('❌ Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
}

/**
 * Update system settings
 */
async function updateSystemSettings(req, res) {
    try {
        const newSettings = req.body;
        console.log('⚙️  Updating settings:', newSettings);

        const updated = await updateSettings(newSettings);

        res.json({
            success: true,
            message: 'Settings updated successfully',
            settings: updated
        });
    } catch (error) {
        console.error('❌ Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
}

module.exports = {
    getSystemSettings,
    updateSystemSettings
};