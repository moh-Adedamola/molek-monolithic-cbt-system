/**
 * Centralized Helper Functions
 * Eliminates code duplication across controllers
 * 
 * Place this file in: backend/src/utils/helpers.js
 */

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} - Client IP address
 */
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown';
}

/**
 * Calculate percentage and grade
 * @param {number} score - Achieved score
 * @param {number} total - Total possible points
 * @returns {Object} - { percentage, grade }
 */
function calculateGrade(score, total) {
    if (!total || total === 0) return { percentage: 0, grade: 'F' };
    
    const percentage = Math.round((score / total) * 100);
    let grade;
    
    if (percentage >= 70) grade = 'A';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 40) grade = 'D';
    else grade = 'F';
    
    return { percentage, grade };
}

/**
 * Format full name from parts
 * @param {string} firstName 
 * @param {string} middleName 
 * @param {string} lastName 
 * @returns {string}
 */
function formatFullName(firstName, middleName, lastName) {
    return `${firstName || ''} ${middleName ? middleName + ' ' : ''}${lastName || ''}`.trim();
}

/**
 * Validate class level
 * @param {string} classLevel 
 * @returns {boolean}
 */
function isValidClassLevel(classLevel) {
    const validClasses = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
    return validClasses.includes(classLevel?.toUpperCase());
}

/**
 * Sanitize string for safe use
 * @param {string} str 
 * @returns {string}
 */
function sanitize(str) {
    if (!str) return '';
    return str.toString().trim();
}

/**
 * Parse integer with default
 * @param {any} value 
 * @param {number} defaultVal 
 * @returns {number}
 */
function parseIntOrDefault(value, defaultVal = 0) {
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultVal : parsed;
}

/**
 * Format date to ISO string for database
 * @param {Date|string} date 
 * @returns {string}
 */
function formatDateISO(date) {
    if (!date) return new Date().toISOString();
    const d = new Date(date);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Truncate text to specified length
 * @param {string} text 
 * @param {number} maxLength 
 * @returns {string}
 */
function truncate(text, maxLength = 100) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Generate subject code from subject name
 * Used for Django export compatibility
 * @param {string} subjectName 
 * @returns {string}
 */
function generateSubjectCode(subjectName) {
    const subjectCodes = {
        'mathematics': 'MTH101',
        'english': 'ENG101',
        'english language': 'ENG101',
        'physics': 'PHY101',
        'chemistry': 'CHM101',
        'biology': 'BIO101',
        'economics': 'ECO101',
        'government': 'GOV101',
        'civic education': 'CIV101',
        'civics': 'CIV101',
        'geography': 'GEO101',
        'agricultural science': 'AGR101',
        'agriculture': 'AGR101',
        'computer science': 'CSC101',
        'computer studies': 'CSC101',
        'further mathematics': 'FMT101',
        'technical drawing': 'TDR101',
        'literature': 'LIT101',
        'literature in english': 'LIT101',
        'commerce': 'COM101',
        'accounting': 'ACC101',
        'financial accounting': 'ACC101',
        'book keeping': 'BKP101',
        'history': 'HIS101',
        'christian religious studies': 'CRS101',
        'crs': 'CRS101',
        'islamic religious studies': 'IRS101',
        'irs': 'IRS101',
        'french': 'FRE101',
        'yoruba': 'YOR101',
        'igbo': 'IGB101',
        'hausa': 'HAU101',
        'basic science': 'BSC101',
        'basic technology': 'BTC101',
        'home economics': 'HEC101',
        'music': 'MUS101',
        'fine arts': 'FAR101',
        'physical education': 'PHE101',
        'health education': 'HED101',
        'social studies': 'SST101'
    };
    
    const normalized = (subjectName || '').toLowerCase().trim();
    return subjectCodes[normalized] || normalized.substring(0, 3).toUpperCase() + '101';
}

/**
 * Format date for Django import (YYYY-MM-DD HH:MM:SS)
 * @param {string} isoDate 
 * @returns {string}
 */
function formatDateForDjango(isoDate) {
    if (!isoDate) return new Date().toISOString().replace('T', ' ').substring(0, 19);
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return new Date().toISOString().replace('T', ' ').substring(0, 19);
    return d.toISOString().replace('T', ' ').substring(0, 19);
}

module.exports = {
    getClientIp,
    calculateGrade,
    formatFullName,
    isValidClassLevel,
    sanitize,
    parseIntOrDefault,
    formatDateISO,
    truncate,
    generateSubjectCode,
    formatDateForDjango
};