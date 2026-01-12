/**
 * Question Controller Tests
 *
 * Tests for question management operations
 */

const { run, all } = require('../../src/utils/db');
const questionController = require('../../src/controllers/admin/questionController');

describe('Question Controller', () => {
    let req, res;

    beforeEach(async () => {
        await run('DELETE FROM questions');
        await run('DELETE FROM exams');

        req = {
            body: {},
            file: null,
            headers: {},
            connection: { remoteAddress: '127.0.0.1' }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('uploadQuestions', () => {
        it('should fail when no file is uploaded', async () => {
            req.body = {
                subject: 'Mathematics',
                class: 'JSS1'
            };

            await questionController.uploadQuestions(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'No file uploaded' });
        });

        it('should fail when subject or class is missing', async () => {
            req.file = { buffer: Buffer.from('test'), originalname: 'test.csv' };
            req.body = {
                subject: 'Mathematics'
            };

            await questionController.uploadQuestions(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getAllQuestions', () => {
        it('should return all questions with exam details', async () => {
            const result = await run(`
                INSERT INTO exams (subject, class, duration_minutes, is_active)
                VALUES ('Mathematics', 'JSS1', 60, 0)
            `);
            const examId = result.lastID;

            await run(`INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_answer)
                       VALUES (?, 'What is 2+2?', '3', '4', '5', '6', 'B')`, [examId]);

            await questionController.getAllQuestions(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.questions).toBeDefined();
            expect(response.questions.length).toBe(1);
            expect(response.questions[0].subject).toBe('Mathematics');
        });

        it('should return empty array when no questions exist', async () => {
            await questionController.getAllQuestions(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.questions).toEqual([]);
        });
    });
});