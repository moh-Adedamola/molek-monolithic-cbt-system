const csv = require('csv-parser');
const { Readable } = require('stream');

function parseCsvBuffer(buffer) {
    return new Promise((resolve, reject) => {
        const results = [];
        const stream = Readable.from([buffer]);
        stream
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

module.exports = { parseCsvBuffer };