// backend/src/services/settingsService.js

const { run, get, all } = require('../utils/db');

/**
 * System Settings Service
 * Manages application-wide settings stored in database
 */

// Default settings
const DEFAULT_SETTINGS = {
    systemName: 'Molek CBT System',
    schoolName: 'Molek School',
    academicSession: '2024/2025',
    currentTerm: 'First Term',
    defaultExamDuration: 60,
    autoSubmit: true,
    shuffleQuestions: false,
    showResults: true
};

/**
 * Initialize settings table if it doesn't exist
 */
async function initializeSettingsTable() {
    try {
        // Create settings table
        await run(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                system_name TEXT DEFAULT 'Molek CBT System',
                school_name TEXT DEFAULT 'Molek School',
                academic_session TEXT DEFAULT '2024/2025',
                current_term TEXT DEFAULT 'First Term',
                default_exam_duration INTEGER DEFAULT 60,
                auto_submit INTEGER DEFAULT 1,
                shuffle_questions INTEGER DEFAULT 0,
                show_results INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if settings exist
        const count = await get('SELECT COUNT(*) as c FROM settings');

        if (count.c === 0) {
            // Insert default settings
            await run(`
                INSERT INTO settings (
                    id, system_name, school_name, academic_session, current_term,
                    default_exam_duration, auto_submit, shuffle_questions, show_results
                ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                DEFAULT_SETTINGS.systemName,
                DEFAULT_SETTINGS.schoolName,
                DEFAULT_SETTINGS.academicSession,
                DEFAULT_SETTINGS.currentTerm,
                DEFAULT_SETTINGS.defaultExamDuration,
                DEFAULT_SETTINGS.autoSubmit ? 1 : 0,
                DEFAULT_SETTINGS.shuffleQuestions ? 1 : 0,
                DEFAULT_SETTINGS.showResults ? 1 : 0
            ]);
            console.log('✅ Default settings initialized');
        }
    } catch (error) {
        console.error('❌ Settings table init error:', error);
    }
}

/**
 * Get current system settings
 */
async function getSettings() {
    try {
        const settings = await get('SELECT * FROM settings WHERE id = 1');

        if (!settings) {
            // Initialize if not found
            await initializeSettingsTable();
            return await getSettings();
        }

        // Convert integers to booleans
        return {
            systemName: settings.system_name,
            schoolName: settings.school_name,
            academicSession: settings.academic_session,
            currentTerm: settings.current_term,
            defaultExamDuration: settings.default_exam_duration,
            autoSubmit: settings.auto_submit === 1,
            shuffleQuestions: settings.shuffle_questions === 1,
            showResults: settings.show_results === 1,
            createdAt: settings.created_at,
            updatedAt: settings.updated_at
        };
    } catch (error) {
        console.error('❌ Get settings error:', error);
        throw error;
    }
}

/**
 * Update system settings
 */
async function updateSettings(newSettings) {
    try {
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
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `, [
            newSettings.systemName || DEFAULT_SETTINGS.systemName,
            newSettings.schoolName || DEFAULT_SETTINGS.schoolName,
            newSettings.academicSession || DEFAULT_SETTINGS.academicSession,
            newSettings.currentTerm || DEFAULT_SETTINGS.currentTerm,
            newSettings.defaultExamDuration || DEFAULT_SETTINGS.defaultExamDuration,
            newSettings.autoSubmit ? 1 : 0,
            newSettings.shuffleQuestions ? 1 : 0,
            newSettings.showResults ? 1 : 0
        ]);

        console.log('✅ Settings updated:', newSettings);
        return await getSettings();
    } catch (error) {
        console.error('❌ Update settings error:', error);
        throw error;
    }
}

module.exports = {
    initializeSettingsTable,
    getSettings,
    updateSettings,
    DEFAULT_SETTINGS
};