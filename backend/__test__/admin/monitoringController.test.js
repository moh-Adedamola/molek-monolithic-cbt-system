/**
 * Monitoring Controller Tests
 */

const { run } = require('../../src/utils/db');
const monitoringController = require('../../src/controllers/admin/monitoringController');

describe('Monitoring Controller', () => {
    let req, res;

    beforeEach(async () => {
        await run('DELETE FROM submissions');
        await run('DELETE FROM students');
        await run('DELETE FROM exams');

        req = {
            headers: {},
            connection: { remoteAddress: '127.0.0.1' }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('getActiveExamSessions', () => {
        it('should return active exam sessions with participation stats', async () => {
            await run(`INSERT INTO exams (subject, class, duration_minutes, is_active)
                       VALUES ('Mathematics', 'JSS1', 60, 1)`);

            const student1 = await run(`
                INSERT INTO students (first_name, last_name, class, exam_code, password_hash, plain_password)
                VALUES ('John', 'Doe', 'JSS1', 'MOLEK-JSS1-1234', 'hash', 'pass')
            `);

            await run(`
                INSERT INTO students (first_name, last_name, class, exam_code, password_hash, plain_password)
                VALUES ('Jane', 'Smith', 'JSS1', 'MOLEK-JSS1-5678', 'hash', 'pass')
            `);

            await run(`
                INSERT INTO submissions (student_id, subject, score, total_questions, submitted_at)
                VALUES (?, 'Mathematics', 8, 10, datetime('now'))
            `, [student1.lastID]);

            await monitoringController.getActiveExamSessions(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.sessions).toBeDefined();
            expect(response.sessions.length).toBe(1);
            expect(response.sessions[0].registered_students).toBe(2);
            expect(response.sessions[0].completed_students).toBe(1);
        });

        it('should return empty array when no active exams', async () => {
            await run(`INSERT INTO exams (subject, class, duration_minutes, is_active)
                       VALUES ('Mathematics', 'JSS1', 60, 0)`);

            await monitoringController.getActiveExamSessions(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.sessions.length).toBe(0);
        });
    });
});