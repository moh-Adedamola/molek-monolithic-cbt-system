const express = require('express');
const { studentLogin, getExamQuestions, submitExam } = require('../controllers/studentController');

const router = express.Router();

router.post('/login', studentLogin);
router.get('/exam/:subject', getExamQuestions);
router.post('/submit', submitExam);

module.exports = router;