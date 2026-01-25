/**
 * Archive Routes
 * Handles term archiving and database reset
 * 
 * UPDATED: Uses centralized helpers.js
 */

const express = require('express');
const router = express.Router();
const archiveService = require('../services/archiveService');
const { logAudit, ACTIONS } = require('../services/auditService');
const { getClientIp } = require('../utils/helpers');

// Archive current term
router.post('/archive', async (req, res) => {
    try {
        const { termName } = req.body;

        if (!termName) {
            return res.status(400).json({ error: 'Term name required' });
        }

        logAudit({
            action: 'TERM_ARCHIVE_STARTED',
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Started archiving term: ${termName}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { termName }
        });

        const result = await archiveService.archiveTerm(termName);

        logAudit({
            action: 'TERM_ARCHIVE_COMPLETED',
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Completed archiving term: ${termName}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { termName, path: result.path }
        });

        res.json(result);
    } catch (error) {
        console.error('Archive error:', error);
        logAudit({
            action: 'TERM_ARCHIVE_FAILED',
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Failed to archive term: ${error.message}`,
            ipAddress: getClientIp(req),
            status: 'failure'
        });
        res.status(500).json({ error: error.message });
    }
});

// Reset for new term
router.post('/reset', async (req, res) => {
    try {
        logAudit({
            action: 'DATABASE_RESET_STARTED',
            userType: 'admin',
            userIdentifier: 'admin',
            details: 'Started database reset for new term',
            ipAddress: getClientIp(req),
            status: 'success'
        });

        const result = await archiveService.resetDatabase();

        logAudit({
            action: 'DATABASE_RESET_COMPLETED',
            userType: 'admin',
            userIdentifier: 'admin',
            details: 'Database reset completed successfully',
            ipAddress: getClientIp(req),
            status: 'success'
        });

        res.json(result);
    } catch (error) {
        console.error('Reset error:', error);
        logAudit({
            action: 'DATABASE_RESET_FAILED',
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Database reset failed: ${error.message}`,
            ipAddress: getClientIp(req),
            status: 'failure'
        });
        res.status(500).json({ error: error.message });
    }
});

// List all archives
router.get('/list', async (req, res) => {
    try {
        const archives = await archiveService.listArchives();
        res.json({ archives });
    } catch (error) {
        console.error('List archives error:', error);
        res.status(500).json({ error: 'Failed to list archives' });
    }
});

// Get archives directory path
router.get('/path', (req, res) => {
    res.json({ path: archiveService.archiveDir });
});

module.exports = router;