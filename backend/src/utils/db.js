const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// ============================================
// DATABASE PATH CONFIGURATION
// ============================================
const getDbPath = () => {
    if (process.env.DB_PATH) {
        return path.join(process.env.DB_PATH, 'molek_cbt.db');
    }

    // Default: backend/src/db/molek_cbt.db
    const dbDir = path.join(__dirname, '../db');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    return path.join(dbDir, 'molek_cbt.db');
};

const DB_PATH = getDbPath();
console.log('📁 Database path:', DB_PATH);

// ============================================
// DATABASE CONNECTION
// ============================================
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// ============================================
// PROMISE WRAPPERS
// ============================================
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Database error:', err.message);
                console.error('   SQL:', sql);
                console.error('   Params:', params);
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                console.error('   SQL:', sql);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                console.error('   SQL:', sql);
                reject(err);
            } else {
                resolve(rows || []);
            }
        });
    });
}

// ============================================
// SCHEMA INITIALIZATION (MCQ ONLY - NO THEORY)
// ============================================
async function initializeDatabase() {
    console.log('🔧 Initializing database schema...');

    try {
        // ========================================
        // STUDENTS TABLE
        // ========================================
        await run(`
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admission_number TEXT NOT NULL UNIQUE,
                first_name TEXT NOT NULL,
                middle_name TEXT,
                last_name TEXT NOT NULL,
                class TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table: students');

        // ========================================
        // EXAMS TABLE
        // ========================================
        await run(`
            CREATE TABLE IF NOT EXISTS exams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                class TEXT NOT NULL,
                duration_minutes INTEGER DEFAULT 60,
                is_active INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(subject, class)
            )
        `);
        console.log('✅ Table: exams');

        // ========================================
        // QUESTIONS TABLE (MCQ ONLY - NO THEORY)
        // All questions = 1 point each
        // ========================================
        await run(`
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                option_a TEXT,
                option_b TEXT,
                option_c TEXT,
                option_d TEXT,
                correct_answer TEXT,
                image_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Table: questions');

        // ========================================
        // EXAM SESSIONS TABLE
        // Tracks student progress during exams
        // ========================================
        await run(`
            CREATE TABLE IF NOT EXISTS exam_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                subject TEXT NOT NULL,
                start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                time_remaining INTEGER NOT NULL,
                answers TEXT,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                UNIQUE(student_id, subject)
            )
        `);
        console.log('✅ Table: exam_sessions');

        // ========================================
        // SUBMISSIONS TABLE (SIMPLIFIED - NO THEORY)
        // score = number of correct answers
        // total_questions = total MCQ questions
        // ========================================
        await run(`
            CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                subject TEXT NOT NULL,
                class TEXT NOT NULL,
                answers TEXT NOT NULL,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                auto_submitted INTEGER DEFAULT 0,
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                UNIQUE(student_id, subject)
            )
        `);
        console.log('✅ Table: submissions');

        // Check for class column in submissions (for older databases)
        const submissionsInfo = await all("PRAGMA table_info(submissions)");
        const hasClass = submissionsInfo.some(col => col.name === 'class');
        if (!hasClass) {
            await run('ALTER TABLE submissions ADD COLUMN class TEXT');
            console.log('✅ Added class column to submissions');
        }

        // ========================================
        // SETTINGS TABLE
        // ========================================
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
        console.log('✅ Table: settings');

        // Insert default settings if not exists
        const settingsCount = await get('SELECT COUNT(*) as c FROM settings');
        if (settingsCount.c === 0) {
            await run(`
                INSERT INTO settings (id, system_name, school_name, academic_session, current_term)
                VALUES (1, 'Molek CBT System', 'Molek School', '2024/2025', 'First Term')
            `);
            console.log('✅ Default settings created');
        }

        // ========================================
        // AUDIT LOGS TABLE
        // ========================================
        await run(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                user_type TEXT NOT NULL,
                user_identifier TEXT NOT NULL,
                details TEXT,
                ip_address TEXT,
                status TEXT DEFAULT 'success',
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table: audit_logs');

        // ========================================
        // CREATE INDEXES FOR PERFORMANCE
        // ========================================
        await run('CREATE INDEX IF NOT EXISTS idx_students_admission ON students(admission_number)');
        await run('CREATE INDEX IF NOT EXISTS idx_students_class ON students(class)');
        await run('CREATE INDEX IF NOT EXISTS idx_exams_subject_class ON exams(subject, class)');
        await run('CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id)');
        await run('CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id)');
        await run('CREATE INDEX IF NOT EXISTS idx_submissions_subject ON submissions(subject)');
        await run('CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)');
        await run('CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)');
        console.log('✅ Indexes created');

        console.log('========================================');
        console.log('✅ DATABASE INITIALIZED SUCCESSFULLY');
        console.log('========================================');

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

// Initialize database on module load
initializeDatabase().catch(err => {
    console.error('Fatal database error:', err);
    process.exit(1);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});

// ============================================
// HELPER FUNCTIONS FOR OTHER SERVICES
// ============================================

function getDb() {
    return db;
}

function getDatabasePath() {
    return DB_PATH;
}

module.exports = {
    db,
    run,
    get,
    all,
    getDb,
    getDatabasePath,
    DB_PATH
};
