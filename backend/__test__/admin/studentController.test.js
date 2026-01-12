/**
 * Student Controller Tests
 *
 * Tests for student management operations including:
 * - Creating individual students
 * - Bulk uploading students from CSV
 * - Getting classes with student counts
 * - Deleting students by class
 * - Exporting student credentials
 */

const { run, all } = require('../../src/utils/db');
const studentController = require('../../src/controllers/admin/studentController');

describe('Student Controller', () => {
    let req, res;

    beforeEach(async () => {
        await run('DELETE FROM students');

        // Mock request and response objects
        req = {
            body: {},
            query: {},
            file: null,
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

    describe('createStudent', () => {
        it('should create a new student successfully', async () => {
            req.body = {
                first_name: 'John',
                last_name: 'Doe',
                class: 'JSS1'
            };

            await studentController.createStudent(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.success).toBe(true);
            expect(response.examCode).toBeDefined();
            expect(response.password).toBeDefined();
            expect(response.studentName).toBe('John Doe');
        });

        it('should fail when required fields are missing', async () => {
            req.body = {
                first_name: 'John'
            };

            await studentController.createStudent(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: expect.any(String) })
            );
        });

        it('should create student with middle name', async () => {
            req.body = {
                first_name: 'John',
                middle_name: 'Paul',
                last_name: 'Doe',
                class: 'JSS1'
            };

            await studentController.createStudent(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.studentName).toBe('John Paul Doe');
        });
    });

    describe('getClasses', () => {
        it('should return all classes with student counts', async () => {
            await run(`INSERT INTO students (first_name, last_name, class, exam_code, password_hash, plain_password)
                       VALUES ('John', 'Doe', 'JSS1', 'MOLEK-JSS1-1234', 'hash', 'pass')`);

            await run(`INSERT INTO students (first_name, last_name, class, exam_code, password_hash, plain_password)
                       VALUES ('Jane', 'Smith', 'JSS1', 'MOLEK-JSS1-5678', 'hash', 'pass')`);

            await studentController.getClasses(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.classes).toBeDefined();
            expect(response.classes.length).toBeGreaterThan(0);
            expect(response.classes[0].count).toBe(2);
        });

        it('should return empty array when no students exist', async () => {
            await studentController.getClasses(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.classes).toEqual([]);
        });
    });

    describe('deleteStudentsByClass', () => {
        it('should delete all students in a class', async () => {
            await run(`INSERT INTO students (first_name, last_name, class, exam_code, password_hash, plain_password)
                       VALUES ('John', 'Doe', 'JSS1', 'MOLEK-JSS1-1234', 'hash', 'pass')`);

            req.body = { class: 'JSS1' };

            await studentController.deleteStudentsByClass(req, res);

            expect(res.json).toHaveBeenCalled();
            const response = res.json.mock.calls[0][0];
            expect(response.message).toContain('Deleted');

            const students = await all('SELECT * FROM students WHERE class = ?', ['JSS1']);
            expect(students.length).toBe(0);
        });

        it('should fail when class is not provided', async () => {
            req.body = {};

            await studentController.deleteStudentsByClass(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'class required' });
        });
    });

    describe('exportStudentsByClass', () => {
        it('should export students by class as text file', async () => {
            await run(`INSERT INTO students (first_name, last_name, class, exam_code, password_hash, plain_password)
                       VALUES ('John', 'Doe', 'JSS1', 'MOLEK-JSS1-1234', 'hash', 'password123')`);

            req.query = { class: 'JSS1' };

            await studentController.exportStudentsByClass(req, res);

            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
            expect(res.setHeader).toHaveBeenCalledWith(
                'Content-Disposition',
                'attachment; filename="JSS1_students.txt"'
            );
            expect(res.send).toHaveBeenCalled();
            const textOutput = res.send.mock.calls[0][0];
            expect(textOutput).toContain('John Doe');
            expect(textOutput).toContain('MOLEK-JSS1-1234');
        });

        it('should fail when class parameter is missing', async () => {
            req.query = {};

            await studentController.exportStudentsByClass(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 when no students found', async () => {
            req.query = { class: 'JSS99' };

            await studentController.exportStudentsByClass(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});