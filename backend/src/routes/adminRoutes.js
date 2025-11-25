const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

console.log('========================================');
console.log('📋 LOADING ADMIN ROUTES');
console.log('========================================');

// ✅ CRITICAL FIX: Use memory storage for CSV uploads
console.log('🔧 Configuring multer with memory storage...');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        console.log('📁 Multer file filter triggered');
        console.log('   Original name:', file.originalname);
        console.log('   Mimetype:', file.mimetype);
        console.log('   Field name:', file.fieldname);

        // Accept CSV and text files
        if (file.mimetype === 'text/csv' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.mimetype === 'text/plain' ||
            file.originalname.endsWith('.csv')) {
            console.log('   ✅ File accepted');
            cb(null, true);
        } else {
            console.log('   ❌ File rejected - invalid type');
            cb(new Error('Only CSV files are allowed'), false);
        }
    }
});

console.log('✅ Multer configured with memory storage');
console.log('   Storage: Memory');
console.log('   Max file size: 5MB');
console.log('========================================');

// Logging middleware for all admin routes
router.use((req, res, next) => {
    console.log('========================================');
    console.log(`📨 ADMIN REQUEST: ${req.method} ${req.path}`);
    console.log('========================================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('IP:', req.ip);
    console.log('User-Agent:', req.get('user-agent'));

    if (Object.keys(req.body).length > 0) {
        console.log('Body keys:', Object.keys(req.body));
    }

    if (Object.keys(req.query).length > 0) {
        console.log('Query params:', req.query);
    }

    if (req.file) {
        console.log('File present:', req.file.originalname);
    }

    console.log('========================================');
    next();
});

// STUDENTS
console.log('📝 Registering student routes...');
router.post('/students', createStudent);
router.post('/students/bulk', upload.single('file'), bulkCreateStudents);
router.get('/students/classes', getClasses);
router.delete('/students/class', deleteStudentsByClass);
router.get('/students/export/class', exportStudentsByClass);
console.log('✅ Student routes registered');

// QUESTIONS & EXAMS
console.log('📝 Registering question/exam routes...');
router.post('/questions/upload', upload.single('file'), uploadQuestions);
router.get('/questions', getAllQuestions);
router.patch('/exams/activate', activateExam);
router.get('/exams', getAllExams);
router.get('/exams/:id', getExamById);
router.put('/exams/:id', updateExam);
router.delete('/exams/:id', deleteExam);
router.get('/subjects', getSubjects);
console.log('✅ Question/exam routes registered');

// RESULTS
console.log('📝 Registering result routes...');
router.get('/results/class', getClassResults);
router.get('/results/export', exportClassResultsAsText);
router.get('/results/filtered', getFilteredResults);
console.log('✅ Result routes registered');

// DASHBOARD
console.log('📝 Registering dashboard routes...');
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/recent-submissions', getRecentSubmissions);
console.log('✅ Dashboard routes registered');

// MONITORING
console.log('📝 Registering monitoring routes...');
router.get('/monitoring/sessions', getActiveExamSessions);
console.log('✅ Monitoring routes registered');

// AUDIT LOGS
console.log('📝 Registering audit log routes...');
router.get('/audit-logs', getAuditLogsController);
router.get('/audit-logs/stats', getAuditStatsController);
console.log('✅ Audit log routes registered');

console.log('========================================');
console.log('✅ ALL ADMIN ROUTES LOADED SUCCESSFULLY');
console.log('========================================');

module.exports = router;