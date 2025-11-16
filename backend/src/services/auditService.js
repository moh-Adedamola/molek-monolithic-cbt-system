const { getDb } = require('../utils/db');

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
function logAudit({
                      action,
                      userType = 'admin',
                      userIdentifier = 'system',
                      details = '',
                      ipAddress = 'unknown',
                      status = 'success',
                      metadata = {}
                  }) {
    let db;
    try {
        db = getDb();
        const stmt = db.prepare(`
            INSERT INTO audit_logs (action, user_type, user_identifier, details, ip_address, status, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            action,
            userType,
            userIdentifier,
            details,
            ipAddress,
            status,
            JSON.stringify(metadata)
        );

        console.log(`📝 Audit Log: [${status.toUpperCase()}] ${action} - ${userIdentifier}: ${details}`);
    } catch (error) {
        console.error('❌ Failed to log audit:', error);
        // Don't throw - audit logging should never break the app
    } finally {
        if (db) db.close();
    }
}

/**
 * Get audit logs with filtering
 * @param {Object} filters - Filter parameters
 * @returns {Array} Array of audit logs
 */
function getAuditLogs(filters = {}) {
    let db;
    try {
        db = getDb();

        let query = `
            SELECT 
                id,
                action,
                user_type,
                user_identifier,
                details,
                ip_address,
                status,
                metadata,
                created_at
            FROM audit_logs
            WHERE 1=1
        `;
        const params = [];

        // Apply filters
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

        const stmt = db.prepare(query);
        const logs = stmt.all(...params);

        // Parse metadata
        return logs.map(log => ({
            ...log,
            metadata: log.metadata ? JSON.parse(log.metadata) : {}
        }));
    } catch (error) {
        console.error('Failed to get audit logs:', error);
        return [];
    } finally {
        if (db) db.close();
    }
}

/**
 * Get audit statistics
 * @returns {Object} Statistics object
 */
function getAuditStats() {
    let db;
    try {
        db = getDb();

        const totalStmt = db.prepare('SELECT COUNT(*) as count FROM audit_logs');
        const total = totalStmt.get().count;

        const todayStmt = db.prepare(`
            SELECT COUNT(*) as count FROM audit_logs 
            WHERE DATE(created_at) = DATE('now')
        `);
        const today = todayStmt.get().count;

        const successStmt = db.prepare(`
            SELECT COUNT(*) as count FROM audit_logs WHERE status = 'success'
        `);
        const successful = successStmt.get().count;

        const failureStmt = db.prepare(`
            SELECT COUNT(*) as count FROM audit_logs WHERE status = 'failure'
        `);
        const failed = failureStmt.get().count;

        const weekStmt = db.prepare(`
            SELECT COUNT(*) as count FROM audit_logs 
            WHERE created_at >= datetime('now', '-7 days')
        `);
        const thisWeek = weekStmt.get().count;

        const actionStatsStmt = db.prepare(`
            SELECT action, COUNT(*) as count 
            FROM audit_logs 
            GROUP BY action 
            ORDER BY count DESC 
            LIMIT 10
        `);
        const topActions = actionStatsStmt.all();

        return {
            total,
            today,
            successful,
            failed,
            thisWeek,
            topActions
        };
    } catch (error) {
        console.error('Failed to get audit stats:', error);
        return { total: 0, today: 0, successful: 0, failed: 0, thisWeek: 0, topActions: [] };
    } finally {
        if (db) db.close();
    }
}

/**
 * Delete old audit logs
 * @param {number} daysToKeep - Number of days to keep
 * @returns {number} Number of deleted logs
 */
function cleanOldLogs(daysToKeep = 90) {
    let db;
    try {
        db = getDb();
        const stmt = db.prepare(`
            DELETE FROM audit_logs 
            WHERE created_at < datetime('now', '-' || ? || ' days')
        `);
        const result = stmt.run(daysToKeep);
        console.log(`🗑️ Deleted ${result.changes} old audit logs (older than ${daysToKeep} days)`);
        return result.changes;
    } catch (error) {
        console.error('Failed to clean old logs:', error);
        return 0;
    } finally {
        if (db) db.close();
    }
}

module.exports = {
    ACTIONS,
    logAudit,
    getAuditLogs,
    getAuditStats,
    cleanOldLogs
};