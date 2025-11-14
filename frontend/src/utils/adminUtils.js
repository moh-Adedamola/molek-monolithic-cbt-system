export const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const isValidFilter = (filter) => {
    if (!filter.type) return false;
    if (filter.type === 'class' && filter.class) return true;
    if (filter.type === 'subject' && filter.class && filter.subject) return true;
    if (filter.type === 'exam_code' && filter.exam_code) return true;
    return false;
};