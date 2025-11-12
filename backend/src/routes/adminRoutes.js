const express = require('express');
const multer = require('multer');
const { getAllQuestions, uploadQuestions, createStudent, bulkCreateStudents, activateExam, getClassResults, exportClassResultsAsText} = require('../controllers/adminController');


const router = express.Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/students/bulk', upload.single('file'), bulkCreateStudents);
router.patch('/exams/activate', activateExam);
router.get('/results/class', getClassResults);
router.post('/students', createStudent);
router.post('/questions/upload', upload.single('file'), uploadQuestions);
router.get('/results/export', exportClassResultsAsText);
router.get('/questions', getAllQuestions);

module.exports = router;