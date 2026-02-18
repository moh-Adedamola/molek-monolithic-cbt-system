const csv = require('csv-parser');
const { Readable } = require('stream');

function parseCsvBuffer(buffer) {
    return new Promise((resolve, reject) => {
        const results = [];
        
        // Convert buffer to string with UTF-8, strip BOM if present
        // This fixes math symbols (√, ², ÷), Yoruba diacritics (ọ, ẹ, ṣ, ń),
        // chemistry symbols (→, ⟶), and other special characters
        let csvString = buffer.toString('utf-8');
        
        // Strip UTF-8 BOM (Excel adds this)
        if (csvString.charCodeAt(0) === 0xFEFF) {
            csvString = csvString.slice(1);
        }
        
        // Try to detect and fix common encoding issues
        // If buffer looks like latin1/windows-1252, re-decode
        if (csvString.includes('Ã') && csvString.includes('â€')) {
            // Double-encoded UTF-8 detected, try latin1 decode
            try {
                csvString = buffer.toString('latin1');
            } catch(e) { /* keep utf-8 version */ }
        }
        
        const stream = Readable.from([csvString]);
        stream
            .pipe(csv())
            .on('data', (data) => {
                // Trim whitespace from all fields
                const cleaned = {};
                for (const [key, value] of Object.entries(data)) {
                    const cleanKey = key.trim().replace(/^\uFEFF/, ''); // strip BOM from header
                    cleaned[cleanKey] = typeof value === 'string' ? value.trim() : value;
                }
                results.push(cleaned);
            })
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

module.exports = { parseCsvBuffer };