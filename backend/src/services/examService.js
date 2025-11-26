const { all } = require('../utils/db');

function gradeExam(submittedAnswers, correctAnswers) {
    let score = 0;
    for (const qId in correctAnswers) {
        if (submittedAnswers[qId] === correctAnswers[qId]) {
            score++;
        }
    }
    return score;
}

async function getCorrectAnswers(subject, classLevel) {
    try {
        console.log('getCorrectAnswers - Querying for:', { subject, classLevel });

        const rows = await all(`
            SELECT q.id, q.correct_answer
            FROM questions q
            JOIN exams e ON q.exam_id = e.id
            WHERE e.subject = ? AND e.class = ? AND e.is_active = 1
        `, [subject, classLevel]);

        const correctMap = {};
        rows.forEach(row => {
            correctMap[row.id] = row.correct_answer;
        });

        console.log('getCorrectAnswers - Loaded map:', { count: Object.keys(correctMap).length });
        return correctMap;
    } catch (error) {
        console.error('getCorrectAnswers - Error:', error);
        throw error;
    }
}

module.exports = { gradeExam, getCorrectAnswers };