import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// ============================================
// STUDENT ENDPOINTS
// ============================================
export const studentLogin = (data) => API.post('/students/login', data);

// Backend route is /exam/:subject/questions
export const getExamQuestions = (subject, admissionNumber) =>
    API.get(`/students/exam/${subject}/questions`, { params: { admission_number: admissionNumber } });

// Save exam progress
export const saveExamProgress = (admissionNumber, subject, answers, timeRemaining) => {
    console.log('💾 API: Saving progress with data:', {
        admission_number: admissionNumber,
        subject: subject,
        answers_count: Object.keys(answers).length,
        time_remaining: timeRemaining
    });

    return API.post('/students/exam/save-progress', {
        admission_number: admissionNumber,
        subject: subject,
        answers: answers,
        time_remaining: timeRemaining
    });
};

// Submit exam - FIXED: includes auto_submitted parameter
export const submitExam = (admissionNumber, subject, answers, autoSubmitted, timeTaken) => {
    console.log('📤 API: Submitting exam with data:', {
        admission_number: admissionNumber,
        subject: subject,
        answers_count: Object.keys(answers).length,
        auto_submitted: autoSubmitted,
        time_taken: timeTaken
    });

    return API.post('/students/exam/submit', {
        admission_number: admissionNumber,
        subject: subject,
        answers: answers,
        auto_submitted: autoSubmitted,
        time_taken: timeTaken
    });
};

// ============================================
// ADMIN: STUDENTS
// ============================================
export const createStudent = (data) => API.post('/admin/students', data);

export const bulkUploadStudents = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return API.post('/admin/students/bulk', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

export const getClasses = () => API.get('/admin/students/classes');

export const deleteStudentsByClass = (data) =>
    API.delete('/admin/students/class', { data });

export const exportStudentsByClass = (className) =>
    API.get(`/admin/students/export?class=${className}`, { responseType: 'blob' });

// ============================================
// ADMIN: QUESTIONS & EXAMS
// ============================================
export const uploadQuestions = (fileOrFormData, subject, classLevel) => {
    // Check if it's already a FormData object (single question with image)
    if (fileOrFormData instanceof FormData) {
        return API.post('/admin/questions/upload', fileOrFormData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }

    // Otherwise, it's a file (CSV bulk upload)
    const formData = new FormData();
    formData.append('file', fileOrFormData);
    formData.append('subject', subject);
    formData.append('class', classLevel);
    return API.post('/admin/questions/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

export const getAllQuestions = () => API.get('/admin/questions');

export const deleteQuestion = (id) => API.delete(`/admin/questions/${id}`);

export const updateQuestion = (id, formData) => {
    return API.put(`/admin/questions/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

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
export const getClassResults = (classLevel = null, subject = null) => {
    const params = {};
    if (classLevel && classLevel !== '') params.class = classLevel;
    if (subject && subject !== '') params.subject = subject;
    return API.get('/admin/results/class', { params });
};

export const exportResultsToDjango = (classLevel = null, subject = null) => {
    const params = {};
    if (classLevel && classLevel !== '') params.class = classLevel;
    if (subject && subject !== '') params.subject = subject;
    const queryString = new URLSearchParams(params).toString();
    return API.get(`/admin/results/export-django?${queryString}`, {
        responseType: 'blob'
    });
};

export const exportClassResults = (classLevel = null, subject = null) => {
    const params = {};
    if (classLevel && classLevel !== '') params.class = classLevel;
    if (subject && subject !== '') params.subject = subject;
    const queryString = new URLSearchParams(params).toString();
    return API.get(`/admin/results/export?${queryString}`, {
        responseType: 'blob'
    });
};

export const getFilteredResults = (params) => {
    const queryString = new URLSearchParams(params).toString();
    return API.get(`/admin/results/filtered?${queryString}`, { responseType: 'blob' });
};

export const getSubmissionDetails = (submissionId) =>
    API.get(`/admin/results/submission/${submissionId}`);

export const getPendingTheoryGrading = () =>
    API.get('/admin/results/pending-theory');

export const gradeTheoryQuestions = (submissionId, grades) =>
    API.post(`/admin/results/grade-theory/${submissionId}`, grades);

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
