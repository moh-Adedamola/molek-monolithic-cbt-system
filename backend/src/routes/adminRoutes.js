const express = require('express');
const multer = require('multer');
const {
    // Students
    createStudent,
    bulkCreateStudents,
    getClasses,
    deleteStudentsByClass,
    exportStudentsByClass,

    // Questions & Exams
    uploadQuestions,
    getAllQuestions,
    activateExam,
    getAllExams,
    getExamById,
    updateExam,
    deleteExam,
    getSubjects,

    // Results
    getClassResults,
    exportClassResultsAsText,
    getFilteredResults,

    // Dashboard
    getDashboardStats,
    getRecentSubmissions,

    // Monitoring
    getActiveExamSessions,

    // Audit Logs
    getAuditLogsController,
    getAuditStatsController
} = require('../controllers/adminController');

const router = express.Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

// STUDENTS
router.post('/students', createStudent);
router.post('/students/bulk', upload.single('file'), bulkCreateStudents);
router.get('/students/classes', getClasses);
router.delete('/students/class', deleteStudentsByClass);
router.get('/students/export/class', exportStudentsByClass);

// QUESTIONS & EXAMS
router.post('/questions/upload', upload.single('file'), uploadQuestions);
router.get('/questions', getAllQuestions);
router.patch('/exams/activate', activateExam);
router.get('/exams', getAllExams);
router.get('/exams/:id', getExamById);
router.put('/exams/:id', updateExam);
router.delete('/exams/:id', deleteExam);
router.get('/subjects', getSubjects);

// RESULTS
router.get('/results/class', getClassResults);
router.get('/results/export', exportClassResultsAsText);
router.get('/results/filtered', getFilteredResults);

// DASHBOARD
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/recent-submissions', getRecentSubmissions);

// MONITORING
router.get('/monitoring/sessions', getActiveExamSessions);

// AUDIT LOGS
router.get('/audit-logs', getAuditLogsController);
router.get('/audit-logs/stats', getAuditStatsController);

module.exports = router;