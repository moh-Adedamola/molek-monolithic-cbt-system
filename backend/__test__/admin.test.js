const request = require('supertest');
const app = require('../src/server');

describe('Admin Features', () => {
    test('activate exam', async () => {
        const res = await request(app)
            .patch('/api/admin/exams/activate')
            .send({ subject: 'Physics', class: 'SS2', is_active: true });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('get class results', async () => {
        const res = await request(app)
            .get('/api/admin/results/class?class=JSS1&subject=Math');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});