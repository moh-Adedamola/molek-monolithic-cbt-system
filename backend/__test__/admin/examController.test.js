/**
 * Exam Controller Tests
 *
 * Tests for exam management operations including:
 * - Activating and deactivating exams
 * - Getting all exams with question counts
 * - Getting individual exam details
 * - Updating exam duration
 * - Deleting exams
 */

const { run, all } = require('../../src/utils/db');
const examController = require('../../src/controllers/admin/examController');

describe('Exam Controller', () => {
    let req, res, examId;

    beforeEach(async () => {
        await run('DELETE FROM questions');
        await run('DELETE FROM exams');

        const result = await run(`
            INSERT INTO exams (subject, class, duration_minutes, is_active)
            VALUES ('Mathematics', 'JSS1', 60, 0)
        `);
        examId = result.lastID;

        req = {
            body: {},
            query: {},
            params: {},
            headers: {},
            connection: { remoteAddress: '127.0.0.1' }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('activateExam', () => {
        it('should activate an exam successfully', async () => {
            req.body = {
                subject: 'Mathematics',
                class: 'JSS1',
                is_active: true
            };

            await examController.activateExam(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.success).toBe(true);
            expect(response.exam.is_active).toBe(1);
        });

        it('should deactivate an exam successfully', async () => {
            req.body = {
                subject: 'Mathematics',
                class: 'JSS1',
                is_active: false
            };

            await examController.activateExam(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.exam.is_active).toBe(0);
        });

        it('should fail when exam does not exist', async () => {
            req.body = {
                subject: 'Physics',
                class: 'JSS1',
                is_active: true
            };

            await examController.activateExam(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should fail when required fields are missing', async () => {
            req.body = {
                subject: 'Mathematics'
            };

            await examController.activateExam(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getAllExams', () => {
        it('should return all exams with question counts', async () => {
            await run(`INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_answer)
                       VALUES (?, 'What is 2+2?', '3', '4', '5', '6', 'B')`, [examId]);

            await examController.getAllExams(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.exams).toBeDefined();
            expect(response.exams.length).toBeGreaterThan(0);
            expect(response.exams[0].question_count).toBe(1);
        });
    });

    describe('getExamById', () => {
        it('should return exam details with questions', async () => {
            await run(`INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_answer)
                       VALUES (?, 'What is 2+2?', '3', '4', '5', '6', 'B')`, [examId]);

            req.params = { id: examId };

            await examController.getExamById(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.exam).toBeDefined();
            expect(response.questions).toBeDefined();
            expect(response.questions.length).toBe(1);
        });

        it('should return 404 for non-existent exam', async () => {
            req.params = { id: 99999 };

            await examController.getExamById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('updateExam', () => {
        it('should update exam duration', async () => {
            req.params = { id: examId };
            req.body = { duration_minutes: 90 };

            await examController.updateExam(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Exam updated successfully' })
            );
        });

        it('should fail when duration is not provided', async () => {
            req.params = { id: examId };
            req.body = {};

            await examController.updateExam(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('deleteExam', () => {
        it('should delete exam and its questions', async () => {
            await run(`INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_answer)
                       VALUES (?, 'What is 2+2?', '3', '4', '5', '6', 'B')`, [examId]);

            req.params = { id: examId };

            await examController.deleteExam(req, res);

            expect(res.json).toHaveBeenCalled();

            const exams = await all('SELECT * FROM exams WHERE id = ?', [examId]);
            expect(exams.length).toBe(0);

            const questions = await all('SELECT * FROM questions WHERE exam_id = ?', [examId]);
            expect(questions.length).toBe(0);
        });

        it('should return 404 for non-existent exam', async () => {
            req.params = { id: 99999 };

            await examController.deleteExam(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('getSubjects', () => {
        it('should return subjects grouped by class', async () => {
            await run(`INSERT INTO exams (subject, class, duration_minutes, is_active)
                       VALUES ('English', 'JSS1', 60, 0)`);

            await examController.getSubjects(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.subjects).toBeDefined();
            expect(response.subjects['JSS1']).toContain('Mathematics');
            expect(response.subjects['JSS1']).toContain('English');
        });
    });
});