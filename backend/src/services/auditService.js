const { run, all } = require('../utils/db');

/**
 * Audit Log Actions
 */
const ACTIONS = {
    // Student Actions
    STUDENT_LOGIN: 'STUDENT_LOGIN',
    STUDENT_LOGIN_FAILED: 'STUDENT_LOGIN_FAILED',
    EXAM_STARTED: 'EXAM_STARTED',
    EXAM_SUBMITTED: 'EXAM_SUBMITTED',
    EXAM_SUBMISSION_FAILED: 'EXAM_SUBMISSION_FAILED',

    // Admin Actions - Students
    STUDENT_CREATED: 'STUDENT_CREATED',
    STUDENTS_BULK_UPLOADED: 'STUDENTS_BULK_UPLOADED',
    STUDENTS_EXPORTED: 'STUDENTS_EXPORTED',
    STUDENT_DELETED: 'STUDENT_DELETED',
    CLASS_DELETED: 'CLASS_DELETED',

    // Admin Actions - Questions/Exams
    QUESTIONS_UPLOADED: 'QUESTIONS_UPLOADED',
    EXAM_ACTIVATED: 'EXAM_ACTIVATED',
    EXAM_DEACTIVATED: 'EXAM_DEACTIVATED',
    EXAM_UPDATED: 'EXAM_UPDATED',
    EXAM_DELETED: 'EXAM_DELETED',

    // Admin Actions - Results
    RESULTS_VIEWED: 'RESULTS_VIEWED',
    RESULTS_EXPORTED: 'RESULTS_EXPORTED',

    // System Actions
    SYSTEM_SETTINGS_UPDATED: 'SYSTEM_SETTINGS_UPDATED',
    DATABASE_BACKUP: 'DATABASE_BACKUP',

    // Archive Action
    TERM_ARCHIVE_STARTED: 'TERM_ARCHIVE_STARTED',
    TERM_ARCHIVE_COMPLETED: 'TERM_ARCHIVE_COMPLETED',
    TERM_ARCHIVE_FAILED: 'TERM_ARCHIVE_FAILED',
    DATABASE_RESET_STARTED: 'DATABASE_RESET_STARTED',
    DATABASE_RESET_COMPLETED: 'DATABASE_RESET_COMPLETED',
    DATABASE_RESET_FAILED: 'DATABASE_RESET_FAILED',
};

/**
 * Log an audit event
 * @param {Object} params - Audit log parameters
 * @param {string} params.action - Action type from ACTIONS
 * @param {string} params.userType - 'admin' or 'student'
 * @param {string} params.userIdentifier - Username, exam code, or IP
 * @param {string} params.details - Human-readable description
 * @param {string} params.ipAddress - IP address of the user
 * @param {string} params.status - 'success', 'failure', or 'warning'
 * @param {Object} params.metadata - Additional data (will be JSON stringified)
 */
async function logAudit({
                            action,
                            userType = 'admin',
                            userIdentifier = 'system',
                            details = '',
                            ipAddress = 'unknown',
                            status = 'success',
                            metadata = {}
                        }) {
    try {
        await run(`
            INSERT INTO audit_logs (action, user_type, user_identifier, details, ip_address, status, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            action,
            userType,
            userIdentifier,
            details,
            ipAddress,
            status,
            JSON.stringify(metadata)
        ]);
        console.log(`Audit: [${status.toUpperCase()}] ${action} - ${userIdentifier}`);
    } catch (error) {
        console.error('Failed to log audit:', error.message || error);
    }
}

/**
 * Get audit logs with optional filters
 * ✅ FIXED: Proper error handling with actual error object returned
 */
async function getAuditLogs(filters = {}) {
    try {
        let query = `SELECT * FROM audit_logs WHERE 1=1`;
        const params = [];

        if (filters.action) {
            query += ' AND action = ?';
            params.push(filters.action);
        }
        if (filters.userType) {
            query += ' AND user_type = ?';
            params.push(filters.userType);
        }
        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }
        if (filters.fromDate) {
            query += ' AND created_at >= ?';
            params.push(filters.fromDate);
        }
        if (filters.toDate) {
            query += ' AND created_at <= ?';
            params.push(filters.toDate);
        }
        if (filters.search) {
            query += ' AND (user_identifier LIKE ? OR details LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        query += ' ORDER BY created_at DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(filters.limit));
        }

        const rows = await all(query, params);

        // Parse metadata JSON for each row
        return rows.map(r => ({
            ...r,
            metadata: r.metadata ? JSON.parse(r.metadata) : {}
        }));
    } catch (error) {
        console.error('❌ getAuditLogs error:', error.message || error);
        // ✅ FIXED: Throw error instead of returning empty array so controller can handle it
        throw new Error(`Failed to retrieve audit logs: ${error.message}`);
    }
}

/**
 * Get audit statistics
 * ✅ FIXED: Proper error handling with actual error object returned
 */
async function getAuditStats() {
    try {
        const total = (await all('SELECT COUNT(*) as c FROM audit_logs'))[0]?.c || 0;

        const today = (await all(
            `SELECT COUNT(*) as c FROM audit_logs WHERE DATE(created_at) = DATE('now')`
        ))[0]?.c || 0;

        const successful = (await all(
            `SELECT COUNT(*) as c FROM audit_logs WHERE status = 'success'`
        ))[0]?.c || 0;

        const failed = (await all(
            `SELECT COUNT(*) as c FROM audit_logs WHERE status = 'failure'`
        ))[0]?.c || 0;

        const thisWeek = (await all(
            `SELECT COUNT(*) as c FROM audit_logs WHERE created_at >= datetime('now', '-7 days')`
        ))[0]?.c || 0;

        const topActions = await all(`
            SELECT action, COUNT(*) as count
            FROM audit_logs
            GROUP BY action
            ORDER BY count DESC
                LIMIT 10
        `);

        return {
            total,
            today,
            successful,
            failed,
            thisWeek,
            topActions
        };
    } catch (error) {
        console.error('❌ getAuditStats error:', error.message || error);
        // ✅ FIXED: Throw error instead of returning empty object so controller can handle it
        throw new Error(`Failed to retrieve audit statistics: ${error.message}`);
    }
}

/**
 * Clean old audit logs
 */
async function cleanOldLogs(daysToKeep = 90) {
    try {
        const result = await run(
            `DELETE FROM audit_logs WHERE created_at < datetime('now', '-' || ? || ' days')`,
            [daysToKeep]
        );
        const changes = result?.changes || 0;
        console.log(`🗑️  Deleted ${changes} old audit logs (older than ${daysToKeep} days)`);
        return changes;
    } catch (error) {
        console.error('❌ cleanOldLogs error:', error.message || error);
        throw new Error(`Failed to clean old logs: ${error.message}`);
    }
}

module.exports = {
    ACTIONS,
    logAudit,
    getAuditLogs,
    getAuditStats,
    cleanOldLogs
};