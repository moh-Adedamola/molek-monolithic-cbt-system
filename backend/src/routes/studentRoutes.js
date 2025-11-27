const express = require('express');
const { studentLogin, getExamQuestions, submitExam, saveExamProgress} = require('../controllers/studentController');

const router = express.Router();

router.post('/login', studentLogin);
router.get('/exam/:subject', getExamQuestions);
router.post('/save-progress', saveExamProgress);
router.post('/submit', submitExam);

module.exports = router;