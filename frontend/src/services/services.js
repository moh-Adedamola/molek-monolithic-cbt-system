import * as api from './api';

// ============================================
// STUDENT SERVICE
// ============================================
export const studentService = {
    login: (data) => api.studentLogin(data),
    getExamQuestions: (subject, examCode) => api.getExamQuestions(subject, examCode),
    submitExam: (data) => api.submitExam(data),
    getAll: (params) => api.getAllStudents(params),
    getById: (id) => api.getStudentById(id),
    create: (data) => api.createStudent(data),
    update: (id, data) => api.updateStudent(id, data),
    delete: (id) => api.deleteStudent(id),
    bulkUpload: (file) => api.bulkUploadStudents(file),
};

// ============================================
// SUBJECT SERVICE
// ============================================
export const subjectService = {
    getAll: (params) => api.getAllSubjects(params),
    getById: (id) => api.getSubjectById(id),
    create: (data) => api.createSubject(data),
    update: (id, data) => api.updateSubject(id, data),
    delete: (id) => api.deleteSubject(id),
    toggleActive: (id) => api.toggleSubjectActive(id),
};

// ============================================
// QUESTION SERVICE
// ============================================
export const questionService = {
    getAll: (params) => api.getAllQuestions(params),
    getById: (id) => api.getQuestionById(id),
    create: (data) => api.createQuestions(data),
    update: (id, data) => api.updateQuestion(id, data),
    delete: (id) => api.deleteQuestion(id),
    bulkDelete: (ids) => api.bulkDeleteQuestions(ids),
    upload: (file, subject, classLevel) => api.uploadQuestions(file, subject, classLevel),
};

// ============================================
// EXAM SERVICE
// ============================================
export const examService = {
    getAll: (params) => api.getAllExams(params),
    getById: (id) => api.getExamById(id),
    create: (data) => api.createExam(data),
    update: (id, data) => api.updateExam(id, data),
    delete: (id) => api.deleteExam(id),
    publish: (id) => api.publishExam(id),
    clone: (id, data) => api.cloneExam(id, data),
    activate: (subject, classLevel, isActive) => api.activateExam(subject, classLevel, isActive),
};

// ============================================
// RESULT SERVICE
// ============================================
export const resultService = {
    getAll: (params) => api.getAllResults(params),
    getById: (id) => api.getResultById(id),
    publish: (id) => api.publishResult(id),
    bulkPublish: (ids) => api.publishBulkResults(ids),
    getFiltered: (params) => api.getFilteredResults(params),
    exportClassResults: (classLevel, subject) => api.exportClassResultsAsText(classLevel, subject),
    downloadPDF: (id) => api.downloadResultPDF(id),
};

// ============================================
// USER SERVICE
// ============================================
export const userService = {
    getAll: (params) => api.getAllUsers(params),
    getById: (id) => api.getUserById(id),
    create: (data) => api.createUser(data),
    update: (id, data) => api.updateUser(id, data),
    delete: (id) => api.deleteUser(id),
    activate: (id) => api.activateUser(id),
    deactivate: (id) => api.deactivateUser(id),
};

// ============================================
// DASHBOARD SERVICE
// ============================================
export const dashboardService = {
    getStats: () => api.getDashboardStats(),
    getUpcomingExams: (params) => api.getUpcomingExams(params),
    getRecentActivity: (params) => api.getRecentActivity(params),
    getPerformanceData: (params) => api.getPerformanceData(params),
};

// ============================================
// REPORT SERVICE
// ============================================
export const reportService = {
    getExamReport: (examId) => api.getExamReport(examId),
    getStudentReport: (studentId) => api.getStudentReport(studentId),
    getClassReport: (classLevel) => api.getClassReport(classLevel),
    getSubjectReport: (subjectId) => api.getSubjectReport(subjectId),
};

// ============================================
// AUDIT LOG SERVICE
// ============================================
export const auditLogService = {
    getAll: (params) => api.getAuditLogs(params),
    getById: (id) => api.getAuditLogById(id),
};

// ============================================
// SYSTEM SETTINGS SERVICE
// ============================================
export const settingsService = {
    getSystemSettings: () => api.getSystemSettings(),
    updateSystemSettings: (data) => api.updateSystemSettings(data),
    getExamSettings: () => api.getExamSettings(),
    updateExamSettings: (data) => api.updateExamSettings(data),
    testEmail: (data) => api.testEmailSettings(data),
    backupDatabase: () => api.backupDatabase(),
    restoreDatabase: (file) => api.restoreDatabase(file),
};

// ============================================
// MONITORING SERVICE
// ============================================
export const monitoringService = {
    getActiveSessions: (examId) => api.getActiveExamSessions(examId),
    getStudentProgress: (examId, studentId) => api.getStudentProgress(examId, studentId),
    flagActivity: (sessionId, data) => api.flagSuspiciousActivity(sessionId, data),
};

export default {
    student: studentService,
    subject: subjectService,
    question: questionService,
    exam: examService,
    result: resultService,
    user: userService,
    dashboard: dashboardService,
    report: reportService,
    auditLog: auditLogService,
    settings: settingsService,
    monitoring: monitoringService,
};

export class analyticsService {
}