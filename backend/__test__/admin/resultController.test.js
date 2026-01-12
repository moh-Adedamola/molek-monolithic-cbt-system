/**
 * Result Controller Tests
 *
 * Tests for result management operations
 */

const { run } = require('../../src/utils/db');
const resultController = require('../../src/controllers/admin/resultController');

describe('Result Controller', () => {
    let req, res, studentId;

    beforeEach(async () => {
        await run('DELETE FROM submissions');
        await run('DELETE FROM students');
        await run('DELETE FROM exams');

        const studentResult = await run(`
            INSERT INTO students (first_name, last_name, class, exam_code, password_hash, plain_password)
            VALUES ('John', 'Doe', 'JSS1', 'MOLEK-JSS1-1234', 'hash', 'pass')
        `);
        studentId = studentResult.lastID;

        await run(`
            INSERT INTO exams (subject, class, duration_minutes, is_active)
            VALUES ('Mathematics', 'JSS1', 60, 1)
        `);

        await run(`
            INSERT INTO submissions (student_id, subject, score, total_questions, submitted_at)
            VALUES (?, 'Mathematics', 8, 10, datetime('now'))
        `, [studentId]);

        req = {
            body: {},
            query: {},
            headers: {},
            connection: { remoteAddress: '127.0.0.1' }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis()
        };
    });

    describe('getClassResults', () => {
        it('should get results filtered by class and subject', async () => {
            req.query = { class: 'JSS1', subject: 'Mathematics' };

            await resultController.getClassResults(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.success).toBe(true);
            expect(response.results.length).toBe(1);
            expect(response.results[0].first_name).toBe('John');
        });

        it('should get results filtered by class only', async () => {
            req.query = { class: 'JSS1' };

            await resultController.getClassResults(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.filterDescription).toContain('All Subjects');
        });

        it('should get all results when no filter is provided', async () => {
            req.query = {};

            await resultController.getClassResults(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.filterDescription).toBe('All Results');
        });
    });

    describe('exportClassResults', () => {
        it('should fail when class or subject is missing', async () => {
            req.query = { class: 'JSS1' };

            await resultController.exportClassResults(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});