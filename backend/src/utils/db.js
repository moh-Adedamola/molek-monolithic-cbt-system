const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Get database path from environment or use default
 */
function getDatabasePath() {
    // Priority 1: Environment variable from Electron
    if (process.env.DB_PATH) {
        // If it's already a full path to .db file
        if (process.env.DB_PATH.endsWith('.db')) {
            console.log('📂 Using DB_PATH:', process.env.DB_PATH);
            return process.env.DB_PATH;
        }
        // If it's a directory, append cbt.db
        const dbPath = path.join(process.env.DB_PATH, 'cbt.db');
        console.log('📂 Using DB_PATH directory:', dbPath);
        return dbPath;
    }

    // Priority 2: Default development path
    const defaultPath = path.join(__dirname, 'cbt.db');
    console.log('📂 Using default DB path:', defaultPath);
    return defaultPath;
}

/**
 * Initialize database if it doesn't exist
 */
function initializeDatabase(dbPath) {
    const dbExists = fs.existsSync(dbPath);

    if (!dbExists) {
        console.log('⚠️  Database not found, creating new one...');

        // Ensure directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Create database with tables
        const db = new Database(dbPath);

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

            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_type ON audit_logs(user_type);
            CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
            CREATE INDEX IF NOT EXISTS idx_students_exam_code ON students(exam_code);
            CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class);
            CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
            CREATE INDEX IF NOT EXISTS idx_submissions_subject ON submissions(subject);
        `);

        console.log('✅ Database created and initialized');
        db.close();
    } else {
        console.log('✅ Database found');
    }
}

/**
 * Get database connection
 */
function getDb() {
    const dbPath = getDatabasePath();

    try {
        // Initialize if needed
        initializeDatabase(dbPath);

        // Open connection
        const db = new Database(dbPath);

        // Enable foreign keys
        db.pragma('foreign_keys = ON');

        return db;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw new Error(`Failed to connect to database: ${error.message}`);
    }
}

module.exports = { getDb, getDatabasePath };