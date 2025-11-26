// backend/src/utils/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('========================================');
console.log('DATABASE MODULE LOADING (pure JS sqlite3)');
console.log('========================================');

let db = null;

function getDatabasePath() {
    console.log('Determining database path...');
    console.log('   NODE_ENV:', process.env.NODE_ENV);
    console.log('   DB_PATH env var:', process.env.DB_PATH);

    if (process.env.DB_PATH) {
        if (process.env.DB_PATH.endsWith('.db')) {
            console.log('   Full path detected:', process.env.DB_PATH);
            return process.env.DB_PATH;
        }
        const dbPath = path.join(process.env.DB_PATH, 'cbt.db');
        console.log('   Directory path → cbt.db:', dbPath);
        return dbPath;
    }

    const defaultPath = path.join(__dirname, '../../../cbt.db');
    console.log('   No DB_PATH → using default:', defaultPath);
    return defaultPath;
}

function getDb() {
    if (db) return db;

    const dbPath = getDatabasePath();
    console.log('Opening database:', dbPath);

    return new Promise((resolve, reject) => {
        const connection = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Database connection failed:', err);
                return reject(err);
            }

            console.log('Database connected successfully');

            // Ensure directory exists
            const dir = path.dirname(dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Initialize tables if not exist
            connection.serialize(() => {
                connection.exec(`
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
                        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS submissions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        student_id INTEGER NOT NULL,
                        subject TEXT NOT NULL,
                        answers TEXT NOT NULL,
                        score INTEGER NOT NULL,
                        total_questions INTEGER NOT NULL,
                        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
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

                    -- Indexes
                    CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
                    CREATE INDEX IF NOT EXISTS idx_students_exam_code ON students(exam_code);
                    CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class);
                    CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
                    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
                `, (err) => {
                    if (err) {
                        console.error('Table creation failed:', err);
                        reject(err);
                    } else {
                        console.log('Database ready');
                        db = connection;
                        resolve(connection);
                    }
                });
            });
        });
    });
}

// Helper to run queries with promises
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        getDb().then(db => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        }).catch(reject);
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        getDb().then(db => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        }).catch(reject);
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        getDb().then(db => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }).catch(reject);
    });
}

console.log('Database module loaded (pure JS)');
console.log('========================================');

module.exports = { getDb, run, get, all, getDatabasePath };