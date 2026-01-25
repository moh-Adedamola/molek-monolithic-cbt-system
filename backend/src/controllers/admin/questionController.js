/**
 * Question Management Controller (MCQ ONLY)
 * 
 * SIMPLIFIED:
 * - Only MCQ questions (no theory/essay)
 * - All questions = 1 point each
 * - No points field in CSV
 */

const { run, get, all } = require('../../utils/db');
const { parseCsvBuffer } = require('../../services/csvService');
const { logAudit, ACTIONS } = require('../../services/auditService');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');

// Image storage directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'questions');

// Ensure uploads directory exists
fs.ensureDirSync(UPLOADS_DIR);

function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        'unknown';
}

/**
 * Save uploaded image and return filename
 */
async function saveQuestionImage(file) {
    try {
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const extension = path.extname(file.originalname);
        const filename = `question_${timestamp}_${randomString}${extension}`;

        const filepath = path.join(UPLOADS_DIR, filename);
        await fs.writeFile(filepath, file.buffer);

        console.log(`✅ Image saved: ${filename}`);
        return filename;
    } catch (error) {
        console.error('❌ Failed to save image:', error);
        throw new Error('Failed to save question image');
    }
}

/**
 * Upload questions from CSV (MCQ only)
 * CSV Format: question_text,option_a,option_b,option_c,option_d,correct_answer
 */
async function uploadQuestions(req, res) {
    try {
        // Check if this is a single question upload with image
        const isSingleQuestion = req.body.isSingleQuestion === 'true';

        if (isSingleQuestion) {
            return await uploadSingleQuestion(req, res);
        }

        // CSV bulk upload
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const subject = req.body.subject;
        const classLevel = req.body.class;

        if (!subject || !classLevel) {
            return res.status(400).json({
                error: 'Subject and class are required',
                received: { subject, class: classLevel }
            });
        }

        const questions = await parseCsvBuffer(req.file.buffer);

        if (questions.length === 0) {
            return res.status(400).json({ error: 'No valid questions found in CSV file' });
        }

        // Validate CSV format
        const firstQuestion = questions[0];
        const requiredFields = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'];
        const missingFields = requiredFields.filter(field => !firstQuestion[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Invalid CSV format',
                missing_fields: missingFields,
                required_fields: requiredFields,
                sample: 'question_text,option_a,option_b,option_c,option_d,correct_answer'
            });
        }

        // Get or create exam
        const existingExam = await get(
            'SELECT id FROM exams WHERE subject = ? AND class = ?',
            [subject, classLevel]
        );

        let examId;

        if (existingExam) {
            examId = existingExam.id;
            // Delete existing questions for this exam
            await run('DELETE FROM questions WHERE exam_id = ?', [examId]);
        } else {
            const result = await run(
                'INSERT INTO exams (subject, class, duration_minutes, is_active) VALUES (?, ?, 60, 0)',
                [subject, classLevel]
            );
            examId = result.lastID;
        }

        // Insert questions (all MCQ, all 1 point)
        let insertedCount = 0;
        for (const q of questions) {
            try {
                // Validate correct answer
                const correctAnswer = (q.correct_answer || '').toUpperCase().trim();
                if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
                    console.warn(`⚠️  Skipping question with invalid correct_answer: "${q.correct_answer}"`);
                    continue;
                }

                await run(`
                    INSERT INTO questions (
                        exam_id, question_text, option_a, option_b, 
                        option_c, option_d, correct_answer
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    examId,
                    q.question_text,
                    q.option_a,
                    q.option_b,
                    q.option_c,
                    q.option_d,
                    correctAnswer
                ]);
                insertedCount++;
            } catch (err) {
                console.error('Failed to insert question:', err.message);
            }
        }

        await logAudit({
            action: ACTIONS.QUESTIONS_UPLOADED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Uploaded ${insertedCount} MCQ questions for ${subject} (${classLevel})`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: {
                subject,
                class: classLevel,
                questionCount: insertedCount,
                examId,
                fileName: req.file.originalname
            }
        });

        res.json({
            success: true,
            message: `Successfully uploaded ${insertedCount} questions for ${subject} (${classLevel})`,
            examId,
            questionCount: insertedCount,
            subject,
            class: classLevel
        });
    } catch (error) {
        await logAudit({
            action: ACTIONS.QUESTIONS_UPLOAD_FAILED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Failed to upload questions: ${error.message}`,
            ipAddress: getClientIp(req),
            status: 'failure',
            metadata: { error: error.message }
        });

        res.status(500).json({
            error: 'Failed to upload questions',
            details: error.message
        });
    }
}

/**
 * Upload single MCQ question with optional image
 */
async function uploadSingleQuestion(req, res) {
    try {
        const {
            subject,
            class: classLevel,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer
        } = req.body;

        if (!subject || !classLevel || !question_text) {
            return res.status(400).json({
                error: 'Subject, class, and question_text are required'
            });
        }

        // Validate MCQ fields
        if (!option_a || !option_b || !option_c || !option_d || !correct_answer) {
            return res.status(400).json({
                error: 'All options (A, B, C, D) and correct_answer are required'
            });
        }

        const correctAnswerUpper = correct_answer.toUpperCase().trim();
        if (!['A', 'B', 'C', 'D'].includes(correctAnswerUpper)) {
            return res.status(400).json({
                error: 'correct_answer must be A, B, C, or D'
            });
        }

        // Get or create exam
        let exam = await get(
            'SELECT id FROM exams WHERE subject = ? AND class = ?',
            [subject, classLevel]
        );

        if (!exam) {
            const result = await run(
                'INSERT INTO exams (subject, class, duration_minutes, is_active) VALUES (?, ?, 60, 0)',
                [subject, classLevel]
            );
            exam = { id: result.lastID };
        }

        // Handle image upload
        let imageFilename = null;
        if (req.file) {
            imageFilename = await saveQuestionImage(req.file);
        }

        // Insert question
        await run(`
            INSERT INTO questions (
                exam_id, question_text, option_a, option_b, 
                option_c, option_d, correct_answer, image_url
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            exam.id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correctAnswerUpper,
            imageFilename
        ]);

        await logAudit({
            action: ACTIONS.QUESTIONS_UPLOADED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Added single MCQ question for ${subject} (${classLevel})${imageFilename ? ' with image' : ''}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: {
                subject,
                class: classLevel,
                hasImage: !!imageFilename,
                examId: exam.id
            }
        });

        res.json({
            success: true,
            message: 'Question added successfully',
            examId: exam.id,
            hasImage: !!imageFilename,
            imageUrl: imageFilename ? `/uploads/questions/${imageFilename}` : null
        });

    } catch (error) {
        console.error('❌ Upload single question error:', error);
        res.status(500).json({
            error: 'Failed to upload question',
            details: error.message
        });
    }
}

/**
 * Get all questions
 */
async function getAllQuestions(req, res) {
    try {
        const questions = await all(`
            SELECT 
                q.*, 
                e.subject, 
                e.class,
                CASE 
                    WHEN q.image_url IS NOT NULL 
                    THEN '/uploads/questions/' || q.image_url 
                    ELSE NULL 
                END as image_url_full
            FROM questions q
            JOIN exams e ON q.exam_id = e.id
            ORDER BY e.subject, e.class, q.id
        `);

        res.json({ questions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get questions' });
    }
}

/**
 * Delete question (and its image if exists)
 */
async function deleteQuestion(req, res) {
    try {
        const { id } = req.params;

        const question = await get('SELECT * FROM questions WHERE id = ?', [id]);

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Delete image file if exists
        if (question.image_url) {
            const imagePath = path.join(UPLOADS_DIR, question.image_url);
            if (await fs.pathExists(imagePath)) {
                await fs.remove(imagePath);
                console.log(`🗑️ Deleted image: ${question.image_url}`);
            }
        }

        await run('DELETE FROM questions WHERE id = ?', [id]);

        await logAudit({
            action: 'QUESTION_DELETED',
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Deleted question ID ${id}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { questionId: id, hadImage: !!question.image_url }
        });

        res.json({
            success: true,
            message: 'Question deleted successfully'
        });
    } catch (error) {
        console.error('❌ Delete question error:', error);
        res.status(500).json({ error: 'Failed to delete question' });
    }
}

/**
 * Update question (including image)
 */
async function updateQuestion(req, res) {
    try {
        const { id } = req.params;
        const {
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer
        } = req.body;

        const question = await get('SELECT * FROM questions WHERE id = ?', [id]);

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Handle image update
        let imageFilename = question.image_url;

        if (req.file) {
            // Delete old image if exists
            if (question.image_url) {
                const oldImagePath = path.join(UPLOADS_DIR, question.image_url);
                if (await fs.pathExists(oldImagePath)) {
                    await fs.remove(oldImagePath);
                }
            }
            // Save new image
            imageFilename = await saveQuestionImage(req.file);
        }

        // Update question
        await run(`
            UPDATE questions 
            SET question_text = ?,
                option_a = ?,
                option_b = ?,
                option_c = ?,
                option_d = ?,
                correct_answer = ?,
                image_url = ?
            WHERE id = ?
        `, [
            question_text || question.question_text,
            option_a || question.option_a,
            option_b || question.option_b,
            option_c || question.option_c,
            option_d || question.option_d,
            correct_answer ? correct_answer.toUpperCase() : question.correct_answer,
            imageFilename,
            id
        ]);

        await logAudit({
            action: 'QUESTION_UPDATED',
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Updated question ID ${id}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: { questionId: id, imageUpdated: !!req.file }
        });

        res.json({
            success: true,
            message: 'Question updated successfully',
            imageUrl: imageFilename ? `/uploads/questions/${imageFilename}` : null
        });
    } catch (error) {
        console.error('❌ Update question error:', error);
        res.status(500).json({ error: 'Failed to update question' });
    }
}

module.exports = {
    uploadQuestions,
    getAllQuestions,
    deleteQuestion,
    updateQuestion
};
