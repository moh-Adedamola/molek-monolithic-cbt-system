const express = require('express');
const multer = require('multer');
const {
    getFilteredResults, getAllQuestions,
    uploadQuestions, createStudent, bulkCreateStudents, activateExam, getClassResults, exportClassResultsAsText, deleteStudentsByClass,  exportStudentsByClass, getClasses
} = require('../controllers/adminController');

const router = express.Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/students/bulk', upload.single('file'), bulkCreateStudents);
router.post('/students', createStudent);
router.delete('/students/class', deleteStudentsByClass);
router.get('/students/export/class', exportStudentsByClass);
router.get('/students/classes', getClasses);
router.patch('/exams/activate', activateExam);
router.get('/results/class', getClassResults);
router.post('/questions/upload', upload.single('file'), uploadQuestions);
router.get('/results/export', exportClassResultsAsText);
router.get('/questions', getAllQuestions);
router.get('/results/filtered', getFilteredResults);

module.exports = router;