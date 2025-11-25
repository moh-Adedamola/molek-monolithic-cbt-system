const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('========================================');
console.log('🗄️  DATABASE MODULE LOADING');
console.log('========================================');

/**
 * Get database path from environment or use default
 */
function getDatabasePath() {
    console.log('📂 Determining database path...');
    console.log('   NODE_ENV:', process.env.NODE_ENV);
    console.log('   DB_PATH env var:', process.env.DB_PATH);
    console.log('   __dirname:', __dirname);

    // Priority 1: Environment variable from Electron
    if (process.env.DB_PATH) {
        console.log('   ✅ Using DB_PATH from environment');

        // If it's already a full path to .db file
        if (process.env.DB_PATH.endsWith('.db')) {
            console.log('   📂 Full path detected:', process.env.DB_PATH);
            console.log('   File exists?', fs.existsSync(process.env.DB_PATH));
            return process.env.DB_PATH;
        }

        // If it's a directory, append cbt.db
        const dbPath = path.join(process.env.DB_PATH, 'cbt.db');
        console.log('   📂 Directory path, appending cbt.db:', dbPath);
        console.log('   Directory exists?', fs.existsSync(process.env.DB_PATH));
        console.log('   File exists?', fs.existsSync(dbPath));
        return dbPath;
    }

    // Priority 2: Default development path
    const defaultPath = path.join(__dirname, 'cbt.db');
    console.log('   ⚠️  No DB_PATH set, using default:', defaultPath);
    console.log('   File exists?', fs.existsSync(defaultPath));
    return defaultPath;
}

/**
 * Initialize database if it doesn't exist
 */
function initializeDatabase(dbPath) {
    const dbExists = fs.existsSync(dbPath);

    console.log('========================================');
    console.log('🔧 DATABASE INITIALIZATION');
    console.log('========================================');
    console.log('Database path:', dbPath);
    console.log('Database exists?', dbExists);

    if (!dbExists) {
        console.log('⚠️  Database file not found - creating new database...');

        // Ensure directory exists
        const dbDir = path.dirname(dbPath);
        console.log('   Checking directory:', dbDir);

        if (!fs.existsSync(dbDir)) {
            console.log('   📁 Creating directory...');
            fs.mkdirSync(dbDir, { recursive: true });
            console.log('   ✅ Directory created');
        } else {
            console.log('   ✅ Directory exists');
        }

        console.log('   📝 Creating database tables...');

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

        console.log('   ✅ Database tables created');
        db.close();
        console.log('   ✅ Database initialization complete');
    } else {
        console.log('✅ Database file exists');

        // Auto-migrate: Add missing columns if needed
        console.log('🔧 Checking for schema updates...');
        const db = new Database(dbPath);

        try {
            // Add plain_password if missing
            db.prepare('ALTER TABLE students ADD COLUMN plain_password TEXT').run();
            console.log('   ✅ Added plain_password column');
        } catch (error) {
            if (error.message.includes('duplicate column')) {
                console.log('   ✅ Schema is up to date');
            } else {
                console.error('   ⚠️  Schema update warning:', error.message);
            }
        }

        db.close();
    }

    console.log('========================================');
}

/**
 * Get database connection
 */
function getDb() {
    console.log('========================================');
    console.log('🔌 GET DATABASE CONNECTION');
    console.log('========================================');

    const dbPath = getDatabasePath();

    try {
        console.log('   Initializing database if needed...');
        initializeDatabase(dbPath);

        console.log('   Opening database connection...');
        const db = new Database(dbPath);

        console.log('   Setting PRAGMA foreign_keys...');
        db.pragma('foreign_keys = ON');

        console.log('✅ Database connection established');
        console.log('   Path:', dbPath);
        console.log('========================================');

        return db;
    } catch (error) {
        console.error('========================================');
        console.error('❌ DATABASE CONNECTION FAILED');
        console.error('========================================');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error stack:', error.stack);
        console.error('Database path attempted:', dbPath);
        console.error('========================================');

        throw new Error(`Failed to connect to database: ${error.message}`);
    }
}

console.log('✅ Database module loaded');
console.log('========================================');

module.exports = { getDb, getDatabasePath };