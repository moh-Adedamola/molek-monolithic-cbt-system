// backend/src/routes/adminRoutes.js (DEBUG VERSION)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Import all controllers
const adminController = require('../controllers/adminController');

// Settings Controller
const settingsController = require('../controllers/settingsController');

// Archive Controller
const archiveController = require('../controllers/archiveController');

console.log('🔍 DEBUG: Checking adminController exports...');
console.log('Available functions:', Object.keys(adminController));

// Destructure after checking
const {
    createStudent,
    bulkCreateStudents,
    getClasses,
    deleteStudentsByClass,
    exportStudentsByClass,
    uploadQuestions,
    getAllQuestions,
    activateExam,
    getAllExams,
    getExamById,
    updateExam,
    deleteExam,
    getSubjects,
    getClassResults,
    exportClassResults,
    getFilteredResults,
    getDashboardStats,
    getRecentSubmissions,
    getActiveExamSessions,
    getAuditLogs,
    getAuditStats
} = adminController;

const {
    getSystemSettings,
    updateSystemSettings
} = settingsController;

const {
    archiveTerm,
    resetDatabase,
    listArchives,
    getArchivesPath
} = archiveController;

console.log('🔍 Checking specific functions:');
console.log('  exportClassResults:', typeof exportClassResults);
console.log('  getFilteredResults:', typeof getFilteredResults);
console.log('  getClassResults:', typeof getClassResults);

console.log('📝 Registering admin routes...');

// ============================================
// STUDENTS
// ============================================
console.log('📝 Registering student routes...');
router.post('/students', createStudent);
router.post('/students/bulk', upload.single('file'), bulkCreateStudents);
router.get('/students/classes', getClasses);
router.delete('/students/class', deleteStudentsByClass);
router.get('/students/export/class', exportStudentsByClass);
console.log('✅ Student routes registered');

// ============================================
// QUESTIONS & EXAMS
// ============================================
console.log('📝 Registering question routes...');
router.post('/questions/upload', upload.single('file'), uploadQuestions);
router.get('/questions', getAllQuestions);
console.log('✅ Question routes registered');

console.log('📝 Registering exam routes...');
router.get('/exams', getAllExams);
router.get('/exams/:id', getExamById);
router.put('/exams/:id', updateExam);
router.delete('/exams/:id', deleteExam);
router.patch('/exams/activate', activateExam);
console.log('✅ Exam routes registered');

console.log('📝 Registering subject routes...');
router.get('/subjects', getSubjects);
console.log('✅ Subject routes registered');

// ============================================
// RESULTS
// ============================================
console.log('📝 Registering result routes...');
console.log('  About to register /results/class with', typeof getClassResults);
console.log('  About to register /results/export with', typeof exportClassResults);
console.log('  About to register /results/filtered with', typeof getFilteredResults);

router.get('/results/class', getClassResults);
router.get('/results/export', exportClassResults);
router.get('/results/filtered', getFilteredResults);
console.log('✅ Result routes registered');

// ============================================
// DASHBOARD
// ============================================
console.log('📝 Registering dashboard routes...');
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/recent-submissions', getRecentSubmissions);
console.log('✅ Dashboard routes registered');

// ============================================
// MONITORING
// ============================================
console.log('📝 Registering monitoring routes...');
router.get('/monitoring/sessions', getActiveExamSessions);
console.log('✅ Monitoring routes registered');

// ============================================
// AUDIT LOGS
// ============================================
console.log('📝 Registering audit routes...');
router.get('/audit-logs', getAuditLogs);
router.get('/audit-logs/stats', getAuditStats);
console.log('✅ Audit routes registered');

// ============================================
// SETTINGS
// ============================================
console.log('📝 Registering settings routes...');
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);
console.log('✅ Settings routes registered');

// ============================================
// ARCHIVE
// ============================================
console.log('📝 Registering archive routes...');
router.post('/archive/archive', archiveTerm);
router.post('/archive/reset', resetDatabase);
router.get('/archive/list', listArchives);
router.get('/archive/path', getArchivesPath);
console.log('✅ Archive routes registered');

console.log('✅ ALL ADMIN ROUTES LOADED');

module.exports = router;