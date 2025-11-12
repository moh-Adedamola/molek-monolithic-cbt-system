const { getDb } = require('../utils/db');

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
    let db;  // Declare for finally
    try {
        db = getDb();
        console.log('🔍 getCorrectAnswers - Querying for:', { subject, classLevel });  // Optional debug log

        // Sync: Prepare and execute (no callback/Promise wrapper needed)
        const stmt = db.prepare(`
            SELECT q.id, q.correct_answer
            FROM questions q
            JOIN exams e ON q.exam_id = e.id
            WHERE e.subject = ? AND e.class = ? AND e.is_active = 1
        `);
        const rows = stmt.all(subject, classLevel);
        // No finalize needed in better-sqlite3

        const correctMap = {};
        rows.forEach(row => {
            correctMap[row.id] = row.correct_answer;
        });
        console.log('✅ getCorrectAnswers - Loaded map:', { count: Object.keys(correctMap).length });  // Optional: Verify count
        return correctMap;
    } catch (error) {
        console.error('💥 getCorrectAnswers - Error details:', error);
        throw error;  // Re-throw for submitExam to catch
    } finally {
        if (db) db.close();  // Always close connection
    }
}

module.exports = { gradeExam, getCorrectAnswers };