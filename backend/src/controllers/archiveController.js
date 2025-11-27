const archiveService = require('../services/archiveService');

/**
 * Archive current term
 */
async function archiveTerm(req, res) {
    try {
        const { termName } = req.body;

        if (!termName || typeof termName !== 'string') {
            return res.status(400).json({ error: 'Term name is required' });
        }

        console.log(`📦 Archiving term: ${termName}`);

        const result = await archiveService.archiveTerm(termName);

        res.json({
            success: true,
            message: `${termName} archived successfully`,
            ...result
        });
    } catch (error) {
        console.error('❌ Archive term error:', error);
        res.status(500).json({
            error: 'Failed to archive term',
            details: error.message
        });
    }
}

/**
 * Reset database for new term
 */
async function resetDatabase(req, res) {
    try {
        console.log('🗑️  Database reset requested');

        const result = await archiveService.resetDatabase();

        res.json({
            success: true,
            message: 'Database reset successfully. Ready for new term!',
            ...result
        });
    } catch (error) {
        console.error('❌ Reset database error:', error);
        res.status(500).json({
            error: 'Failed to reset database',
            details: error.message
        });
    }
}

/**
 * List all archives
 */
async function listArchives(req, res) {
    try {
        const archives = await archiveService.listArchives();

        res.json({
            success: true,
            archives,
            count: archives.length
        });
    } catch (error) {
        console.error('❌ List archives error:', error);
        res.status(500).json({
            error: 'Failed to list archives',
            details: error.message
        });
    }
}

/**
 * Get archive directory path
 */
async function getArchivesPath(req, res) {
    try {
        const path = archiveService.getArchivePath();

        res.json({
            success: true,
            path
        });
    } catch (error) {
        console.error('❌ Get archives path error:', error);
        res.status(500).json({ error: 'Failed to get archives path' });
    }
}

module.exports = {
    archiveTerm,
    resetDatabase,
    listArchives,
    getArchivesPath
};