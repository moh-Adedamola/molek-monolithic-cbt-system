import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// ============================================
// STUDENT ENDPOINTS
// ============================================
export const studentLogin = (data) => API.post('/students/login', data);
export const submitExam = (data) => API.post('/students/submit', data);
export const getExamQuestions = (subject, examCode) =>
    API.get(`/students/exam/${subject}`, { params: { exam_code: examCode } });
export const saveExamProgress = (data) => API.post('/students/save-progress', data);



// ============================================
// ADMIN: STUDENTS
// ============================================
export const createStudent = (data) => API.post('/admin/students', data);
export const bulkUploadStudents = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return API.post('/admin/students/bulk', formData, { responseType: 'blob' });
};
export const getClasses = () => API.get('/admin/students/classes');
export const deleteStudentsByClass = (data) => API.delete('/admin/students/class', { data });
export const exportStudentsByClass = (params) => {
    const queryString = new URLSearchParams(params).toString();
    return API.get(`/admin/students/export/class?${queryString}`, { responseType: 'blob' });
};

// ============================================
// ADMIN: QUESTIONS & EXAMS
// ============================================
export const uploadQuestions = (file, subject, classLevel) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    formData.append('class', classLevel);
    return API.post('/admin/questions/upload', formData);
};
export const getAllQuestions = () => API.get('/admin/questions');
export const activateExam = (subject, classLevel, isActive) => {
    return API.patch('/admin/exams/activate', {
        subject,
        class: classLevel,
        is_active: isActive
    });
};
export const getAllExams = (params = {}) => API.get('/admin/exams', { params });
export const getExamById = (id) => API.get(`/admin/exams/${id}`);
export const updateExam = (id, data) => API.put(`/admin/exams/${id}`, data);
export const deleteExam = (id) => API.delete(`/admin/exams/${id}`);
export const getSubjects = () => API.get('/admin/subjects');

// ============================================
// ADMIN: RESULTS
// ============================================
export const getClassResults = (classLevel, subject = null) => {
    const params = { class: classLevel };
    if (subject) params.subject = subject;
    return API.get('/admin/results/class', { params });
}
export const exportClassResultsAsText = (classLevel, subject) => {
    return API.get(`/admin/results/export?class=${encodeURIComponent(classLevel)}&subject=${encodeURIComponent(subject)}`, {
        responseType: 'blob'
    });
};
export const getFilteredResults = (params) => {
    const queryString = new URLSearchParams(params).toString();
    return API.get(`/admin/results/filtered?${queryString}`, { responseType: 'blob' });
};

// ============================================
// ADMIN: DASHBOARD
// ============================================
export const getDashboardStats = () => API.get('/admin/dashboard/stats');
export const getRecentSubmissions = (params = {}) =>
    API.get('/admin/dashboard/recent-submissions', { params });

// ============================================
// ADMIN: MONITORING
// ============================================
export const getActiveExamSessions = () => API.get('/admin/monitoring/sessions');


// ============================================
// ADMIN: AUDIT
// ============================================

export const getAuditLogs = (params = {}) =>
    API.get('/admin/audit-logs', { params });

export const getAuditStats = () =>
    API.get('/admin/audit-logs/stats');


// ============================================
// ADMIN: SYSTEM SETTINGS
// ============================================
export const getSystemSettings = () => API.get('/admin/settings');
export const updateSystemSettings = (data) => API.put('/admin/settings', data);

// ============================================
// ADMIN: ARCHIVE MANAGEMENT
// ============================================
export const archiveTerm = (termName) =>
    API.post('/admin/archive/archive', { termName });
export const resetDatabase = () =>
    API.post('/admin/archive/reset');
export const listArchives = () =>
    API.get('/admin/archive/list');
export const getArchivesPath = () =>
    API.get('/admin/archive/path');
export default API;