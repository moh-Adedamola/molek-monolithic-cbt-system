// backend/src/services/codeGenerator.js

/**
 * Generates a random 4-character alphanumeric suffix
 * Format: [0-9A-Z] (uppercase letters and numbers only)
 */
function generateRandomSuffix() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, 1, I)
    let suffix = '';
    for (let i = 0; i < 4; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return suffix;
}

/**
 * Generates exam code in MOLEK format
 * Format: MOLEK-CLASS-XXXX
 * Example: MOLEK-JSS1-330Y, MOLEK-SS3-442M
 *
 * @param {string} classLevel - The student's class (e.g., 'JSS1', 'SS3')
 * @returns {string} Unique exam code
 */
function generateExamCode(classLevel) {
    const prefix = 'MOLEK';
    const suffix = generateRandomSuffix();
    return `${prefix}-${classLevel}-${suffix}`;
}

/**
 * Generates a 6-character random password
 * Mix of uppercase, lowercase, and numbers
 * Excludes confusing characters (0, O, 1, l, I)
 */
function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 6; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

module.exports = {
    generateExamCode,
    generatePassword,
    generateRandomSuffix
};