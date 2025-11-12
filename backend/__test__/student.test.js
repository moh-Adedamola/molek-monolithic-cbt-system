const request = require('supertest');
const app = require('../src/server');
const { getDb } = require('../src/utils/db');
const bcrypt = require('bcrypt');

beforeEach(() => {
    const db = getDb();
    db.serialize(() => {
        db.run('DELETE FROM submissions');
        db.run('DELETE FROM questions');
        db.run('DELETE FROM exams');
        db.run('DELETE FROM students');
    });
});

describe('Student Flow', () => {
    test('login with valid credentials', async () => {
        const password = 'xK9mQ2';
        const hash = await bcrypt.hash(password, 10);
        const db = getDb();
        db.run(
            `INSERT INTO students (first_name, last_name, class, exam_code, password_hash)
       VALUES ('John', 'Doe', 'JSS1', 'TEST-001A', ?)`,
            [hash]
        );
        db.run(`INSERT INTO exams (subject, class, is_active) VALUES ('Math', 'JSS1', 1)`);

        const res = await request(app)
            .post('/api/student/login')
            .send({ exam_code: 'TEST-001A', password });

        expect(res.statusCode).toBe(200);
        expect(res.body.full_name).toBe('John Doe');
    });

    test('submit exam and get score', async () => {
        const password = 'xK9mQ2';
        const hash = await bcrypt.hash(password, 10);
        const db = getDb();
        db.run(
            `INSERT INTO students (first_name, last_name, class, exam_code, password_hash)
       VALUES ('Jane', 'Smith', 'JSS1', 'TEST-002A', ?)`,
            [hash]
        );
        db.run(`INSERT INTO exams (subject, class, is_active) VALUES ('English', 'JSS1', 1)`);
        const examId = db.prepare('SELECT id FROM exams WHERE subject = "English" AND class = "JSS1"').get().id;
        db.run(
            `INSERT INTO questions (exam_id, question_text, option_a, option_b, correct_answer)
       VALUES (?, 'What is 2+2?', '3', '4', 'B')`,
            [examId]
        );

        await request(app)
            .post('/api/student/login')
            .send({ exam_code: 'TEST-002A', password });

        const submitRes = await request(app)
            .post('/api/student/submit')
            .send({ exam_code: 'TEST-002A', answers: { "1": "B" } });

        expect(submitRes.statusCode).toBe(200);
        expect(submitRes.body.score).toBe(1);
        expect(submitRes.body.total).toBe(1);
    });
});