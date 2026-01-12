const { all } = require('../utils/db');

/**
 * Calculate similarity between two strings (Levenshtein distance)
 * Returns value between 0 (completely different) and 1 (identical)
 */
function calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Exact match after normalization
    if (s1 === s2) return 1.0;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    // Levenshtein distance algorithm
    const costs = [];
    for (let i = 0; i <= longer.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= shorter.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
                    newValue = Math.min(
                        Math.min(newValue, lastValue),
                        costs[j]
                    ) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[shorter.length] = lastValue;
    }

    const distance = costs[shorter.length];
    return (longer.length - distance) / longer.length;
}

/**
 * Check if theory answer is correct using fuzzy matching
 * @param {string} studentAnswer - Student's typed answer
 * @param {string} correctAnswer - Correct answer from database
 * @param {number} threshold - Similarity threshold (0-1), default 0.8 (80%)
 * @returns {boolean}
 */
function isTheoryAnswerCorrect(studentAnswer, correctAnswer, threshold = 0.8) {
    if (!studentAnswer || !correctAnswer) return false;

    // Normalize both answers
    const student = studentAnswer.trim().toLowerCase();
    const correct = correctAnswer.trim().toLowerCase();

    // Remove extra whitespace
    const studentNormalized = student.replace(/\s+/g, ' ');
    const correctNormalized = correct.replace(/\s+/g, ' ');

    // Calculate similarity
    const similarity = calculateSimilarity(studentNormalized, correctNormalized);

    console.log(`📝 Theory Answer Check:
       Student: "${studentNormalized}"
       Correct: "${correctNormalized}"
       Similarity: ${(similarity * 100).toFixed(1)}%
       Threshold: ${(threshold * 100)}%
       Result: ${similarity >= threshold ? '✅ CORRECT' : '❌ INCORRECT'}`);

    return similarity >= threshold;
}

/**
 * Grade an exam submission
 * Handles both MCQ and Theory questions
 *
 * @param {Object} submittedAnswers - Student's answers { questionId: answer }
 * @param {Array} questions - All questions with correct answers
 * @returns {Object} { mcqScore, theoryScore, totalScore, totalPoints, theoryPending }
 */
function gradeExam(submittedAnswers, questions) {
    let mcqScore = 0;
    let theoryScore = 0;
    let totalPoints = 0;
    let hasTheoryQuestions = false;

    for (const question of questions) {
        const studentAnswer = submittedAnswers[question.id];
        const points = question.points || 1;
        totalPoints += points;

        if (question.question_type === 'mcq') {
            // MCQ: Exact match on answer choice
            if (studentAnswer && studentAnswer.toUpperCase() === question.correct_answer) {
                mcqScore += points;
                console.log(`✅ MCQ Q${question.id}: Correct (${studentAnswer}) = +${points} pts`);
            } else {
                console.log(`❌ MCQ Q${question.id}: Wrong (${studentAnswer || 'UNANSWERED'}) vs ${question.correct_answer}`);
            }
        } else {
            // Theory: Fuzzy matching with correct answer
            hasTheoryQuestions = true;

            if (question.theory_answer) {
                const isCorrect = isTheoryAnswerCorrect(
                    studentAnswer || '',
                    question.theory_answer,
                    0.8 // 80% similarity threshold
                );

                if (isCorrect) {
                    theoryScore += points;
                    console.log(`✅ Theory Q${question.id}: Correct = +${points} pts`);
                } else {
                    console.log(`❌ Theory Q${question.id}: Incorrect/Low similarity`);
                }
            } else {
                console.log(`⚠️  Theory Q${question.id}: No answer key provided, needs manual grading`);
            }
        }
    }

    const totalScore = mcqScore + theoryScore;

    return {
        mcqScore,
        theoryScore,
        totalScore,
        totalPoints,
        hasTheoryQuestions
    };
}

/**
 * Get all questions with correct answers for a specific exam
 * @param {string} subject - Subject name
 * @param {string} classLevel - Class level (e.g., JSS1, SS3)
 * @returns {Promise<Array>} Array of questions with answers
 */
async function getQuestionsWithAnswers(subject, classLevel) {
    try {
        console.log(`📚 Loading questions for: ${subject} (${classLevel})`);

        const rows = await all(`
            SELECT q.*
            FROM questions q
            JOIN exams e ON q.exam_id = e.id
            WHERE e.subject = ? AND e.class = ? AND e.is_active = 1
            ORDER BY q.id
        `, [subject, classLevel]);

        console.log(`✅ Loaded ${rows.length} questions`);

        // Log question type distribution
        const mcqCount = rows.filter(q => q.question_type === 'mcq').length;
        const theoryCount = rows.length - mcqCount;
        console.log(`   📊 MCQ: ${mcqCount}, Theory: ${theoryCount}`);

        return rows;
    } catch (error) {
        console.error('❌ Failed to load questions:', error);
        throw error;
    }
}

/**
 * Legacy function for backward compatibility
 * Returns correct answers map for MCQ questions only
 */
async function getCorrectAnswers(subject, classLevel) {
    try {
        const questions = await getQuestionsWithAnswers(subject, classLevel);

        const correctMap = {};
        const pointsMap = {};

        questions.forEach(q => {
            if (q.question_type === 'mcq' && q.correct_answer) {
                correctMap[q.id] = q.correct_answer;
                pointsMap[q.id] = q.points || 1;
            }
        });

        return { correctMap, pointsMap };
    } catch (error) {
        console.error('❌ getCorrectAnswers error:', error);
        throw error;
    }
}

module.exports = {
    gradeExam,
    getQuestionsWithAnswers,
    getCorrectAnswers, // Legacy compatibility
    isTheoryAnswerCorrect,
    calculateSimilarity
};