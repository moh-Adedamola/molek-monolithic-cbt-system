// import axios from 'axios';
//
// const API = axios.create({ baseURL: '/api' });
//
// // STUDENT
// export const studentLogin = (data) => API.post('/student/login', data);
// export const submitExam = (data) => API.post('/student/submit', data);
// export const getExamQuestions = (subject, examCode) =>
//     API.get(`/student/exam/${subject}`, { params: { exam_code: examCode } });
//
//
// // ADMIN: STUDENTS
// export const createStudent = (data) => API.post('/admin/students', data);
// export const bulkUploadStudents = (file) => {
//     const formData = new FormData();
//     formData.append('file', file);
//     // IMPORTANT: responseType = 'blob' still works for text/plain
//     return API.post('/admin/students/bulk', formData, { responseType: 'blob' });
// };
//
// // ADMIN: QUESTIONS
// export const createQuestions = (data) => API.post('/admin/questions', data);
// export const uploadQuestions = (file, subject, classLevel) => {
//     const formData = new FormData();
//     formData.append('file', file);
//     formData.append('subject', subject);
//     formData.append('class', classLevel);
//     return API.post('/admin/questions/upload', formData);
// };
// export const getAllQuestions = () => API.get('/admin/questions');
// export const getFilteredResults = (params) => {
//     const queryString = new URLSearchParams(params).toString();
//     return API.get(`/admin/results/filtered?${queryString}`, { responseType: 'blob' });
// };
//
//
// // ADMIN: EXAMS
// export const activateExam = (subject, classLevel, isActive) => {
//     console.log('🔍 api.js - activateExam params:', { subject, classLevel, isActive });  // Debug: Verify input
//     if (!subject || !classLevel) {
//         console.error('Invalid params for activateExam');
//         return Promise.reject(new Error('Missing subject or classLevel'));
//     }
//     const body = {
//         subject,
//         class: classLevel,  // Key must be 'class' for backend destructuring
//         is_active: isActive
//     };
//     console.log('🔍 api.js - Sending body:', body);  // Verify before send
//     return API.patch('/admin/exams/activate', body);
// };
// // ADMIN: RESULTS
// export const exportClassResultsAsText = (classLevel, subject) => {
//     return API.get(`/admin/results/export?class=${encodeURIComponent(classLevel)}&subject=${encodeURIComponent(subject)}`, {
//         responseType: 'blob'
//     });
// };

import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// ============================================
// STUDENT ENDPOINTS
// ============================================
export const studentLogin = (data) => API.post('/student/login', data);
export const submitExam = (data) => API.post('/student/submit', data);
export const getExamQuestions = (subject, examCode) =>
    API.get(`/student/exam/${subject}`, { params: { exam_code: examCode } });

// ============================================
// ADMIN: STUDENTS
// ============================================

export const getClasses = () => API.get('/admin/students/classes');
export const deleteStudentsByClass = (data) => API.delete('/admin/students/class', { data });
export const exportStudentsByClass = (params) => {
    const queryString = new URLSearchParams(params).toString();
    return API.get(`/admin/students/export/class?${queryString}`, { responseType: 'blob' });
};
export const createStudent = (data) => API.post('/admin/students', data);
export const bulkUploadStudents = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return API.post('/admin/students/bulk', formData, { responseType: 'blob' });
};

export const getAllStudents = (params = {}) =>
    API.get('/admin/students', { params });

export const getStudentById = (id) =>
    API.get(`/admin/students/${id}`);

export const updateStudent = (id, data) =>
    API.put(`/admin/students/${id}`, data);

export const deleteStudent = (id) =>
    API.delete(`/admin/students/${id}`);

// ============================================
// ADMIN: QUESTIONS
// ============================================
export const createQuestions = (data) => API.post('/admin/questions', data);

export const uploadQuestions = (file, subject, classLevel) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    formData.append('class', classLevel);
    return API.post('/admin/questions/upload', formData);
};

export const getAllQuestions = (params = {}) =>
    API.get('/admin/questions', { params });

export const getQuestionById = (id) =>
    API.get(`/admin/questions/${id}`);

export const updateQuestion = (id, data) =>
    API.put(`/admin/questions/${id}`, data);

export const deleteQuestion = (id) =>
    API.delete(`/admin/questions/${id}`);

export const bulkDeleteQuestions = (ids) =>
    API.post('/admin/questions/bulk-delete', { ids });

// ============================================
// ADMIN: SUBJECTS
// ============================================
export const getAllSubjects = (params = {}) =>
    API.get('/admin/subjects', { params });

export const getSubjectById = (id) =>
    API.get(`/admin/subjects/${id}`);

export const createSubject = (data) =>
    API.post('/admin/subjects', data);

export const updateSubject = (id, data) =>
    API.put(`/admin/subjects/${id}`, data);

export const deleteSubject = (id) =>
    API.delete(`/admin/subjects/${id}`);

export const toggleSubjectActive = (id) =>
    API.patch(`/admin/subjects/${id}/toggle-active`);

// ============================================
// ADMIN: EXAMS
// ============================================
export const getAllExams = (params = {}) =>
    API.get('/admin/exams', { params });

export const getExamById = (id) =>
    API.get(`/admin/exams/${id}`);

export const createExam = (data) =>
    API.post('/admin/exams', data);

export const updateExam = (id, data) =>
    API.put(`/admin/exams/${id}`, data);

export const deleteExam = (id) =>
    API.delete(`/admin/exams/${id}`);

export const publishExam = (id) =>
    API.post(`/admin/exams/${id}/publish`);

export const cloneExam = (id, data) =>
    API.post(`/admin/exams/${id}/clone`, data);

export const activateExam = (subject, classLevel, isActive) => {
    console.log('🔍 api.js - activateExam params:', { subject, classLevel, isActive });
    if (!subject || !classLevel) {
        console.error('Invalid params for activateExam');
        return Promise.reject(new Error('Missing subject or classLevel'));
    }
    const body = {
        subject,
        class: classLevel,
        is_active: isActive
    };
    console.log('🔍 api.js - Sending body:', body);
    return API.patch('/admin/exams/activate', body);
};

// ============================================
// ADMIN: RESULTS
// ============================================
export const getAllResults = (params = {}) =>
    API.get('/admin/results', { params });

export const getResultById = (id) =>
    API.get(`/admin/results/${id}`);

export const publishResult = (id) =>
    API.post(`/admin/results/${id}/publish`);

export const publishBulkResults = (ids) =>
    API.post('/admin/results/bulk-publish', { ids });

export const getFilteredResults = (params) => {
    const queryString = new URLSearchParams(params).toString();
    return API.get(`/admin/results/filtered?${queryString}`, { responseType: 'blob' });
};

export const exportClassResultsAsText = (classLevel, subject) => {
    return API.get(`/admin/results/export?class=${encodeURIComponent(classLevel)}&subject=${encodeURIComponent(subject)}`, {
        responseType: 'blob'
    });
};

export const downloadResultPDF = (id) =>
    API.get(`/admin/results/${id}/pdf`, { responseType: 'blob' });

// ============================================
// ADMIN: USERS
// ============================================
export const getAllUsers = (params = {}) =>
    API.get('/admin/users', { params });

export const getUserById = (id) =>
    API.get(`/admin/users/${id}`);

export const createUser = (data) =>
    API.post('/admin/users', data);

export const updateUser = (id, data) =>
    API.put(`/admin/users/${id}`, data);

export const deleteUser = (id) =>
    API.delete(`/admin/users/${id}`);

export const activateUser = (id) =>
    API.patch(`/admin/users/${id}/activate`);

export const deactivateUser = (id) =>
    API.patch(`/admin/users/${id}/deactivate`);

// ============================================
// ADMIN: DASHBOARD
// ============================================
export const getDashboardStats = () =>
    API.get('/admin/dashboard/stats');

export const getUpcomingExams = (params = {}) =>
    API.get('/admin/dashboard/upcoming-exams', { params });

export const getRecentActivity = (params = {}) =>
    API.get('/admin/dashboard/recent-activity', { params });

export const getPerformanceData = (params = {}) =>
    API.get('/admin/dashboard/performance', { params });

// ============================================
// ADMIN: REPORTS
// ============================================
export const getExamReport = (examId) =>
    API.get(`/admin/reports/exam/${examId}`);

export const getStudentReport = (studentId) =>
    API.get(`/admin/reports/student/${studentId}`);

export const getClassReport = (classLevel) =>
    API.get(`/admin/reports/class/${classLevel}`);

export const getSubjectReport = (subjectId) =>
    API.get(`/admin/reports/subject/${subjectId}`);

// ============================================
// ADMIN: AUDIT LOGS
// ============================================
export const getAuditLogs = (params = {}) =>
    API.get('/admin/audit-logs', { params });

export const getAuditLogById = (id) =>
    API.get(`/admin/audit-logs/${id}`);

// ============================================
// ADMIN: SYSTEM SETTINGS
// ============================================
export const getSystemSettings = () =>
    API.get('/admin/settings');

export const updateSystemSettings = (data) =>
    API.put('/admin/settings', data);

export const getExamSettings = () =>
    API.get('/admin/settings/exam');

export const updateExamSettings = (data) =>
    API.put('/admin/settings/exam', data);

export const testEmailSettings = (data) =>
    API.post('/admin/settings/email/test', data);

export const backupDatabase = () =>
    API.post('/admin/settings/backup', {}, { responseType: 'blob' });

export const restoreDatabase = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return API.post('/admin/settings/restore', formData);
};

// ============================================
// ADMIN: EXAM MONITORING
// ============================================
export const getActiveExamSessions = (examId) =>
    API.get(`/admin/monitoring/exam/${examId}/sessions`);

export const getStudentProgress = (examId, studentId) =>
    API.get(`/admin/monitoring/exam/${examId}/student/${studentId}`);

export const flagSuspiciousActivity = (sessionId, data) =>
    API.post(`/admin/monitoring/session/${sessionId}/flag`, data);

export default API;