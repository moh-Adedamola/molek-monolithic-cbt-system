const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

let studentController, resultController, questionController, examController;
let settingsController, dashboardController, auditController, monitoringController;

try {
    studentController = require('../controllers/admin/studentController');
} catch (err) {
    console.log('⚠️  Admin studentController not found, skipping student routes');
    studentController = null;
}

try {
    resultController = require('../controllers/admin/resultController');
} catch (err) {
    console.log('⚠️  Admin resultController not found, skipping result routes');
    resultController = null;
}

try {
    questionController = require('../controllers/admin/questionController');
} catch (err) {
    console.log('⚠️  questionController not found, skipping question routes');
    questionController = null;
}

try {
    examController = require('../controllers/admin/examController');
} catch (err) {
    console.log('⚠️  examController not found, skipping exam routes');
    examController = null;
}

try {
    settingsController = require('../controllers/admin/settingsController');
} catch (err) {
    console.log('⚠️  settingsController not found, skipping settings routes');
    settingsController = null;
}

try {
    dashboardController = require('../controllers/admin/dashboardController');
} catch (err) {
    console.log('⚠️  dashboardController not found, skipping dashboard routes');
    dashboardController = null;
}

try {
    auditController = require('../controllers/admin/auditController');
} catch (err) {
    console.log('⚠️  auditController not found, skipping audit routes');
    auditController = null;
}

try {
    monitoringController = require('../controllers/admin/monitoringController');
} catch (err) {
    console.log('⚠️  monitoringController not found, skipping monitoring routes');
    monitoringController = null;
}

// ========================================
// STUDENT MANAGEMENT
// ========================================
if (studentController) {
    if (studentController.bulkCreateStudents) {
        router.post('/students/bulk', upload.single('file'), studentController.bulkCreateStudents);
    }
    if (studentController.getClasses) {
        router.get('/students/classes', studentController.getClasses);
    }
    if (studentController.deleteStudentsByClass) {
        router.delete('/students/class', studentController.deleteStudentsByClass);
    }
    if (studentController.exportStudentsByClass) {
        router.get('/students/export', studentController.exportStudentsByClass);
    }
}

// ========================================
// RESULTS
// ========================================
if (resultController) {
    if (resultController.getClassResults) {
        router.get('/results/class', resultController.getClassResults);
    }
    if (resultController.exportResultsToDjango) {
        router.get('/results/export-django', resultController.exportResultsToDjango);
    }
    if (resultController.exportClassResults) {
        router.get('/results/export', resultController.exportClassResults);
    }
    if (resultController.getSubmissionDetails) {
        router.get('/results/submission/:submissionId', resultController.getSubmissionDetails);
    }
}

// ========================================
// QUESTIONS
// ========================================
if (questionController) {
    if (questionController.uploadQuestions) {
        router.post('/questions/upload', upload.single('file'), questionController.uploadQuestions);
    }
    if (questionController.getAllQuestions) {
        router.get('/questions', questionController.getAllQuestions);
    }
    if (questionController.deleteQuestion) {
        router.delete('/questions/:id', questionController.deleteQuestion);
    }
    if (questionController.updateQuestion) {
        router.put('/questions/:id', upload.single('file'), questionController.updateQuestion);
    }
}

// ========================================
// EXAMS
// ========================================
if (examController) {
    if (examController.getAllExams) {
        router.get('/exams', examController.getAllExams);
    }
    if (examController.getExamById) {
        router.get('/exams/:id', examController.getExamById);
    }
    if (examController.updateExam) {
        router.put('/exams/:id', examController.updateExam);
    }
    if (examController.deleteExam) {
        router.delete('/exams/:id', examController.deleteExam);
    }
    if (examController.activateExam) {
        router.patch('/exams/activate', examController.activateExam);
    }
    if (examController.getSubjects) {
        router.get('/subjects', examController.getSubjects);
    }
}

// ========================================
// SETTINGS
// ========================================
if (settingsController) {
    if (settingsController.getSettings) {
        router.get('/settings', settingsController.getSettings);
    }
    if (settingsController.updateSettings) {
        router.put('/settings', settingsController.updateSettings);
    }
}

// ========================================
// DASHBOARD
// ========================================
if (dashboardController) {
    if (dashboardController.getStats) {
        router.get('/dashboard/stats', dashboardController.getStats);
    }
    if (dashboardController.getRecentSubmissions) {
        router.get('/dashboard/recent-submissions', dashboardController.getRecentSubmissions);
    }
}

// ========================================
// MONITORING
// ========================================
if (monitoringController) {
    if (monitoringController.getActiveExamSessions) {
        router.get('/monitoring/sessions', monitoringController.getActiveExamSessions);
    }
}

// ========================================
// AUDIT
// ========================================
if (auditController) {
    if (auditController.getAuditLogs) {
        router.get('/audit-logs', auditController.getAuditLogs);
    }
    if (auditController.getAuditStats) {
        router.get('/audit-logs/stats', auditController.getAuditStats);
    }
}

console.log('✅ Admin routes loaded');

module.exports = router;