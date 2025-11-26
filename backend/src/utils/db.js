// backend/src/utils/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('========================================');
console.log('DATABASE LOADING — sqlite3 (Async)');
console.log('========================================');

let db = null;

function getDatabasePath() {
    console.log('Determining database path...');
    if (process.env.DB_PATH) {
        if (process.env.DB_PATH.endsWith('.db')) {
            console.log('Full path from env:', process.env.DB_PATH);
            return process.env.DB_PATH;
        }
        const fullPath = path.join(process.env.DB_PATH, 'cbt.db');
        console.log('Directory + cbt.db:', fullPath);
        return fullPath;
    }
    const defaultPath = path.join(__dirname, '../../../cbt.db');
    console.log('Default path:', defaultPath);
    return defaultPath;
}

function getDb() {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const dbPath = getDatabasePath();
        const dir = path.dirname(dbPath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log('Created database directory:', dir);
        }

        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Database connection error:', err);
                return reject(err);
            }

            console.log('Database opened successfully:', dbPath);

            // Create tables
            db.exec(`
                CREATE TABLE IF NOT EXISTS students (
                                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                        first_name TEXT NOT NULL,
                                                        middle_name TEXT,
                                                        last_name TEXT NOT NULL,
                                                        class TEXT NOT NULL,
                                                        student_id TEXT,
                                                        exam_code TEXT UNIQUE NOT NULL,
                                                        password_hash TEXT NOT NULL,
                                                        plain_password TEXT,
                                                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS exams (
                                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                     subject TEXT NOT NULL,
                                                     class TEXT NOT NULL,
                                                     is_active INTEGER DEFAULT 0,
                                                     duration_minutes INTEGER DEFAULT 60,
                                                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                     UNIQUE(subject, class)
                    );

                CREATE TABLE IF NOT EXISTS questions (
                                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                         exam_id INTEGER NOT NULL,
                                                         question_text TEXT NOT NULL,
                                                         option_a TEXT NOT NULL,
                                                         option_b TEXT NOT NULL,
                                                         option_c TEXT NOT NULL,
                                                         option_d TEXT NOT NULL,
                                                         correct_answer TEXT NOT NULL CHECK(correct_answer IN ('A', 'B', 'C', 'D')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE
                    );

                CREATE TABLE IF NOT EXISTS submissions (
                                                           id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                           student_id INTEGER NOT NULL,
                                                           subject TEXT NOT NULL,
                                                           answers TEXT NOT NULL,
                                                           score INTEGER NOT NULL,
                                                           total_questions INTEGER NOT NULL,
                                                           submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                           FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
                    UNIQUE(student_id, subject)
                    );

                CREATE TABLE IF NOT EXISTS audit_logs (
                                                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                          action TEXT NOT NULL,
                                                          user_type TEXT NOT NULL CHECK(user_type IN ('admin', 'student')),
                    user_identifier TEXT,
                    details TEXT,
                    ip_address TEXT,
                    status TEXT NOT NULL CHECK(status IN ('success', 'failure', 'warning')),
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );

                CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
                CREATE INDEX IF NOT EXISTS idx_students_exam_code ON students(exam_code);
                CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class);
                CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
                CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
            `, (err) => {
                if (err) {
                    console.error('Table creation error:', err);
                    return reject(err);
                }
                console.log('Database & tables ready');
                resolve(db);
            });
        });
    });
}

// Promise wrappers for sqlite3
async function run(sql, params = []) {
    const database = await getDb();
    return new Promise((resolve, reject) => {
        database.run(sql, params, function(err) {
            if (err) {
                console.error('DB run error:', err);
                return reject(err);
            }
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

async function get(sql, params = []) {
    const database = await getDb();
    return new Promise((resolve, reject) => {
        database.get(sql, params, (err, row) => {
            if (err) {
                console.error('DB get error:', err);
                return reject(err);
            }
            resolve(row);
        });
    });
}

async function all(sql, params = []) {
    const database = await getDb();
    return new Promise((resolve, reject) => {
        database.all(sql, params, (err, rows) => {
            if (err) {
                console.error('DB all error:', err);
                return reject(err);
            }
            resolve(rows);
        });
    });
}

module.exports = { getDb, run, get, all, getDatabasePath };