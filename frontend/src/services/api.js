import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// STUDENT
export const studentLogin = (data) => API.post('/student/login', data);
export const submitExam = (data) => API.post('/student/submit', data);
export const getExamQuestions = (subject, examCode) =>
    API.get(`/student/exam/${subject}`, { params: { exam_code: examCode } });


// ADMIN: STUDENTS
export const createStudent = (data) => API.post('/admin/students', data);
export const bulkUploadStudents = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    // IMPORTANT: responseType = 'blob' still works for text/plain
    return API.post('/admin/students/bulk', formData, { responseType: 'blob' });
};

// ADMIN: QUESTIONS
export const createQuestions = (data) => API.post('/admin/questions', data);
export const uploadQuestions = (file, subject, classLevel) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    formData.append('class', classLevel);
    return API.post('/admin/questions/upload', formData);
};

export const getAllQuestions = () => API.get('/admin/questions');



// ADMIN: EXAMS
export const activateExam = (subject, classLevel, isActive) => {
    console.log('🔍 api.js - activateExam params:', { subject, classLevel, isActive });  // Debug: Verify input
    if (!subject || !classLevel) {
        console.error('Invalid params for activateExam');
        return Promise.reject(new Error('Missing subject or classLevel'));
    }
    const body = {
        subject,
        class: classLevel,  // Key must be 'class' for backend destructuring
        is_active: isActive
    };
    console.log('🔍 api.js - Sending body:', body);  // Verify before send
    return API.patch('/admin/exams/activate', body);
};
// ADMIN: RESULTS
// Now returns blob (text/plain)
export const exportClassResultsAsText = (classLevel, subject) => {
    return API.get(`/admin/results/export?class=${encodeURIComponent(classLevel)}&subject=${encodeURIComponent(subject)}`, {
        responseType: 'blob'
    });
};