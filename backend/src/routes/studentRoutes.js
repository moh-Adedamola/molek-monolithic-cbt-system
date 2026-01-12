const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// ========================================
// STUDENT AUTHENTICATION
// ========================================
router.post('/login', studentController.login);

// ========================================
// EXAM -
// ========================================
router.get('/exam/:subject/questions', studentController.getExamQuestions); // ?admission_number=...
router.post('/exam/save-progress', studentController.saveExamProgress);
router.post('/exam/submit', studentController.submitExam);

module.exports = router;