const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// ========================================
// STUDENT AUTHENTICATION
// ========================================
router.post('/login', studentController.login);

// ========================================
// EXAM
// ========================================
router.get('/exam/:subject/questions', studentController.getExamQuestions);
router.post('/exam/save-progress', studentController.saveExamProgress);
router.post('/exam/submit', studentController.submitExam);

// Admin: score student from saved progress (when auto-submit failed)
router.post('/exam/score-from-progress', studentController.scoreFromProgress);

module.exports = router;