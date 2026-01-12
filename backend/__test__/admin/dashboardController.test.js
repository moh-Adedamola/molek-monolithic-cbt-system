/**
 * Dashboard Controller Tests
 */

const { run } = require('../../src/utils/db');
const dashboardController = require('../../src/controllers/admin/dashboardController');

describe('Dashboard Controller', () => {
    let req, res;

    beforeEach(async () => {
        await run('DELETE FROM submissions');
        await run('DELETE FROM students');
        await run('DELETE FROM questions');
        await run('DELETE FROM exams');

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

    describe('getDashboardStats', () => {
        it('should return dashboard statistics', async () => {
            await run(`INSERT INTO students (first_name, last_name, class, exam_code, password_hash, plain_password)
                       VALUES ('John', 'Doe', 'JSS1', 'MOLEK-JSS1-1234', 'hash', 'pass')`);

            await run(`INSERT INTO exams (subject, class, duration_minutes, is_active)
                       VALUES ('Mathematics', 'JSS1', 60, 1)`);

            await dashboardController.getDashboardStats(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.totalStudents).toBe(1);
            expect(response.totalExams).toBe(1);
            expect(response.activeExams).toBe(1);
            expect(response.totalSubmissions).toBe(0);
        });

        it('should return zero stats when database is empty', async () => {
            await dashboardController.getDashboardStats(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.totalStudents).toBe(0);
            expect(response.totalExams).toBe(0);
        });
    });

    describe('getRecentSubmissions', () => {
        it('should return recent submissions', async () => {
            const studentResult = await run(`
                INSERT INTO students (first_name, last_name, class, exam_code, password_hash, plain_password)
                VALUES ('John', 'Doe', 'JSS1', 'MOLEK-JSS1-1234', 'hash', 'pass')
            `);

            await run(`
                INSERT INTO submissions (student_id, subject, score, total_questions, submitted_at)
                VALUES (?, 'Mathematics', 8, 10, datetime('now'))
            `, [studentResult.lastID]);

            await dashboardController.getRecentSubmissions(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.submissions).toBeDefined();
            expect(response.submissions.length).toBe(1);
        });

        it('should respect limit parameter', async () => {
            req.query = { limit: 5 };

            await dashboardController.getRecentSubmissions(req, res);

            expect(res.json).toHaveBeenCalled();
        });
    });
});