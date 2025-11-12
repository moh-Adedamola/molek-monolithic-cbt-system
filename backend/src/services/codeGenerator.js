function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateExamCode(subject, classLevel, seed) {
    const subjectPrefix = subject.substring(0, 3).toUpperCase();
    const classShort = classLevel.replace(/\s+/g, '').substring(0, 4).toUpperCase();
    const paddedId = String(seed % 1000).padStart(3, '0');
    const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    return `${subjectPrefix}-${classShort}-${paddedId}${randomLetter}`;
}

module.exports = { generatePassword, generateExamCode };