export const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const calculatePercentage = (score, total) => {
    if (!total || total === 0) return 0;
    return Math.round((score / total) * 100);
};

export const getGradeColor = (percentage) => {
    if (percentage >= 70) return 'success';
    if (percentage >= 50) return 'warning';
    return 'error';
};

export const validateCsvFile = (file) => {
    if (!file) return { valid: false, error: 'No file selected' };

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        return { valid: false, error: 'File must be CSV format' };
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
        return { valid: false, error: 'File size must be less than 5MB' };
    }

    return { valid: true };
};

export default {
    downloadBlob,
    formatDateTime,
    calculatePercentage,
    getGradeColor,
    validateCsvFile
};