/**
 * Enhanced Question Management Controller
 *
 * NEW FEATURES:
 * ✅ Image upload support for questions
 * ✅ Theory/Essay question support
 * ✅ Mixed question types (MCQ + Theory)
 */

const { run, get, all } = require('../../utils/db');
const { parseCsvBuffer } = require('../../services/csvService');
const { logAudit, ACTIONS } = require('../../services/auditService');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');

// ✅ Image storage directory
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
 * ✅ NEW: Save uploaded image and return filename
 */
async function saveQuestionImage(file) {
    try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const extension = path.extname(file.originalname);
        const filename = `question_${timestamp}_${randomString}${extension}`;

        const filepath = path.join(UPLOADS_DIR, filename);

        // Save file
        await fs.writeFile(filepath, file.buffer);

        console.log(`✅ Image saved: ${filename}`);
        return filename;
    } catch (error) {
        console.error('❌ Failed to save image:', error);
        throw new Error('Failed to save question image');
    }
}

/**
 * ✅ NEW: Upload questions with IMAGE support
 * Supports both CSV (for bulk) and single question with image
 */
async function uploadQuestions(req, res) {
    try {
        // Check if this is a single question upload with image
        const isSingleQuestion = req.body.isSingleQuestion === 'true';

        if (isSingleQuestion) {
            return await uploadSingleQuestion(req, res);
        }

        // Original CSV bulk upload (unchanged for backward compatibility)
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

        const firstQuestion = questions[0];
        const requiredFields = ['question_text', 'question_type'];
        const missingFields = requiredFields.filter(field => !firstQuestion[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Invalid CSV format',
                missing_fields: missingFields,
                required_fields: requiredFields,
                sample: 'question_text,question_type,option_a,option_b,option_c,option_d,correct_answer,points'
            });
        }

        const existingExam = await get(
            'SELECT id FROM exams WHERE subject = ? AND class = ?',
            [subject, classLevel]
        );

        let examId;

        if (existingExam) {
            examId = existingExam.id;
            await run('DELETE FROM questions WHERE exam_id = ?', [examId]);
        } else {
            const result = await run(
                'INSERT INTO exams (subject, class, duration_minutes, is_active) VALUES (?, ?, 60, 0)',
                [subject, classLevel]
            );
            examId = result.lastID;
        }

        let insertedCount = 0;
        for (const q of questions) {
            try {
                const questionType = (q.question_type || 'mcq').toLowerCase();
                const points = parseInt(q.points) || (questionType === 'mcq' ? 1 : 5);

                if (questionType === 'mcq') {
                    // Multiple choice question
                    await run(`
                        INSERT INTO questions (
                            exam_id, question_text, question_type, option_a, option_b, 
                            option_c, option_d, correct_answer, points, image_url
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        examId,
                        q.question_text,
                        'mcq',
                        q.option_a,
                        q.option_b,
                        q.option_c,
                        q.option_d,
                        q.correct_answer?.toUpperCase(),
                        points,
                        null
                    ]);
                } else {
                    // Theory/Essay question
                    await run(`
                        INSERT INTO questions (
                            exam_id, question_text, question_type, option_a, option_b, 
                            option_c, option_d, correct_answer, points, image_url
                        )
                        VALUES (?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL)
                    `, [
                        examId,
                        q.question_text,
                        questionType,
                        points
                    ]);
                }
                insertedCount++;
            } catch (err) {
                console.error('Failed to insert question:', err);
            }
        }

        await logAudit({
            action: ACTIONS.QUESTIONS_UPLOADED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Uploaded ${insertedCount} questions for ${subject} (${classLevel})`,
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
 * ✅ NEW: Upload single question with image
 */
async function uploadSingleQuestion(req, res) {
    try {
        const {
            subject,
            class: classLevel,
            question_text,
            question_type,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer,
            points
        } = req.body;

        if (!subject || !classLevel || !question_text || !question_type) {
            return res.status(400).json({
                error: 'Subject, class, question_text, and question_type are required'
            });
        }

        // Validate question type
        const validTypes = ['mcq', 'theory', 'essay', 'short_answer'];
        if (!validTypes.includes(question_type.toLowerCase())) {
            return res.status(400).json({
                error: `Invalid question_type. Must be one of: ${validTypes.join(', ')}`
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

        // Handle image upload if present
        let imageFilename = null;
        if (req.file) {
            imageFilename = await saveQuestionImage(req.file);
        }

        // Calculate points (default: MCQ=1, Theory=5)
        const questionPoints = parseInt(points) || (question_type === 'mcq' ? 1 : 5);

        // Insert question
        if (question_type === 'mcq') {
            // Validate MCQ fields
            if (!option_a || !option_b || !option_c || !option_d || !correct_answer) {
                return res.status(400).json({
                    error: 'MCQ questions require all options (A, B, C, D) and correct_answer'
                });
            }

            await run(`
                INSERT INTO questions (
                    exam_id, question_text, question_type, option_a, option_b, 
                    option_c, option_d, correct_answer, points, image_url
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                exam.id,
                question_text,
                'mcq',
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer.toUpperCase(),
                questionPoints,
                imageFilename
            ]);
        } else {
            // Theory/Essay question
            await run(`
                INSERT INTO questions (
                    exam_id, question_text, question_type, option_a, option_b, 
                    option_c, option_d, correct_answer, points, image_url
                )
                VALUES (?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, ?)
            `, [
                exam.id,
                question_text,
                question_type,
                questionPoints,
                imageFilename
            ]);
        }

        await logAudit({
            action: ACTIONS.QUESTIONS_UPLOADED,
            userType: 'admin',
            userIdentifier: 'admin',
            details: `Added single ${question_type} question for ${subject} (${classLevel})${imageFilename ? ' with image' : ''}`,
            ipAddress: getClientIp(req),
            status: 'success',
            metadata: {
                subject,
                class: classLevel,
                questionType: question_type,
                hasImage: !!imageFilename,
                examId: exam.id
            }
        });

        res.json({
            success: true,
            message: `Question added successfully`,
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
 * ✅ ENHANCED: Get all questions (now includes images and question types)
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
 * ✅ NEW: Delete question (and its image if exists)
 */
async function deleteQuestion(req, res) {
    try {
        const { id } = req.params;

        // Get question details first
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

        // Delete question from database
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
 * ✅ NEW: Update question (including image)
 */
async function updateQuestion(req, res) {
    try {
        const { id } = req.params;
        const {
            question_text,
            question_type,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer,
            points
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
                question_type = ?,
                option_a = ?,
                option_b = ?,
                option_c = ?,
                option_d = ?,
                correct_answer = ?,
                points = ?,
                image_url = ?
            WHERE id = ?
        `, [
            question_text || question.question_text,
            question_type || question.question_type,
            option_a || question.option_a,
            option_b || question.option_b,
            option_c || question.option_c,
            option_d || question.option_d,
            correct_answer ? correct_answer.toUpperCase() : question.correct_answer,
            points || question.points,
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