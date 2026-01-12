/**
 * Audit Controller
 *
 * Handles audit trail operations including:
 * - Retrieving filtered audit logs with search capabilities
 * - Getting audit statistics for system activity monitoring
 * - Tracking admin actions and system events with timestamps and IP addresses
 */

const { getAuditLogs, getAuditStats } = require('../../services/auditService');

async function getAuditLogsController(req, res) {
    try {
        const filters = {
            action: req.query.action,
            userType: req.query.userType,
            status: req.query.status,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate,
            search: req.query.search,
            limit: req.query.limit || 100
        };

        const logs = await getAuditLogs(filters);

        res.json({
            success: true,
            logs,
            count: logs.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve audit logs',
            details: error.message
        });
    }
}

async function getAuditStatsController(req, res) {
    try {
        const stats = await getAuditStats();

        res.json({
            success: true,
            ...stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve audit statistics',
            details: error.message
        });
    }
}

module.exports = {
    getAuditLogs: getAuditLogsController,
    getAuditStats: getAuditStatsController
};