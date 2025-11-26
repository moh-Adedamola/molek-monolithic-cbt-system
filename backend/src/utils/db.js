// backend/src/utils/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('========================================');
console.log('DATABASE LOADING – sqlite3 (Async)');
console.log('========================================');

let db = null;
let isInitialized = false;

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

        db = new sqlite3.Database(dbPath, async (err) => {
            if (err) {
                console.error('Database connection error:', err);
                return reject(err);
            }

            console.log('Database opened successfully:', dbPath);

            // Initialize database tables if not already done
            if (!isInitialized) {
                try {
                    await initDatabase();
                    isInitialized = true;
                } catch (initErr) {
                    console.error('Database initialization error:', initErr);
                    return reject(initErr);
                }
            }

            resolve(db);
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

/**
 * Initialize database - Create all tables
 */
async function initDatabase() {
    try {
        console.log('🔧 Initializing database tables...');

        // Create students table
        await run(`
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
            )
        `);
        console.log('✅ Students table ready');

        // Create exams table
        await run(`
            CREATE TABLE IF NOT EXISTS exams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                class TEXT NOT NULL,
                is_active INTEGER DEFAULT 0,
                duration_minutes INTEGER DEFAULT 60,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(subject, class)
            )
        `);
        console.log('✅ Exams table ready');

        // Create questions table
        await run(`
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
            )
        `);
        console.log('✅ Questions table ready');

        // Create submissions table
        await run(`
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
            )
        `);
        console.log('✅ Submissions table ready');

        // Create audit_logs table
        await run(`
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
            )
        `);
        console.log('✅ Audit logs table ready');

        // Create settings table
        await run(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                system_name TEXT DEFAULT 'Molek CBT System',
                school_name TEXT DEFAULT 'Molek School',
                academic_session TEXT DEFAULT '2024/2025',
                current_term TEXT DEFAULT 'First Term',
                default_exam_duration INTEGER DEFAULT 60,
                auto_submit INTEGER DEFAULT 1,
                shuffle_questions INTEGER DEFAULT 0,
                show_results INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Settings table ready');

        // Check if default settings exist, if not create them
        const existingSettings = await get('SELECT COUNT(*) as c FROM settings');
        if (existingSettings.c === 0) {
            await run(`
                INSERT INTO settings (
                    id, system_name, school_name, academic_session, current_term,
                    default_exam_duration, auto_submit, shuffle_questions, show_results
                ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'Molek CBT System',
                'Molek School',
                '2024/2025',
                'First Term',
                60,
                1,
                0,
                1
            ]);
            console.log('✅ Default settings initialized');
        }

        // Create indexes
        await run('CREATE INDEX IF NOT EXISTS idx_students_class ON students(class)');
        await run('CREATE INDEX IF NOT EXISTS idx_students_exam_code ON students(exam_code)');
        await run('CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class)');
        await run('CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id)');
        await run('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)');
        console.log('✅ Indexes ready');

        console.log('✅ Database initialization complete!');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        throw error;
    }
}

module.exports = {
    getDb,
    run,
    get,
    all,
    getDatabasePath,
    initDatabase
};