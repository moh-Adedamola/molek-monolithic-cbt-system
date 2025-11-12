const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../cbt.db');

function getDb() {
    return new Database(DB_PATH, { verbose: console.log });
}

module.exports = { getDb };