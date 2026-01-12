/**
 * Audit Controller Tests
 */

const { run } = require('../../src/utils/db');
const auditController = require('../../src/controllers/admin/auditController');
const { logAudit, ACTIONS } = require('../../src/services/auditService');

describe('Audit Controller', () => {
    let req, res;

    beforeEach(async () => {
        await run('DELETE FROM audit_logs');

        req = {
            query: {},
            headers: {},
            connection: { remoteAddress: '127.0.0.1' }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('getAuditLogs', () => {
        it('should return all audit logs', async () => {
            await logAudit({
                action: ACTIONS.STUDENT_CREATED,
                userType: 'admin',
                userIdentifier: 'admin',
                details: 'Test log',
                ipAddress: '127.0.0.1',
                status: 'success'
            });

            await auditController.getAuditLogs(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.success).toBe(true);
            expect(response.logs).toBeDefined();
            expect(response.logs.length).toBeGreaterThan(0);
        });

        it('should filter logs by action', async () => {
            req.query = { action: ACTIONS.STUDENT_CREATED };

            await auditController.getAuditLogs(req, res);

            expect(res.json).toHaveBeenCalled();
        });
    });

    describe('getAuditStats', () => {
        it('should return audit statistics', async () => {
            await logAudit({
                action: ACTIONS.STUDENT_CREATED,
                userType: 'admin',
                userIdentifier: 'admin',
                details: 'Test log',
                ipAddress: '127.0.0.1',
                status: 'success'
            });

            await auditController.getAuditStats(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.success).toBe(true);
        });
    });
});