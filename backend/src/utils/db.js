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
 * ✅ Check database version and run migrations if needed
 */
async function checkAndRunMigrations() {
    try {
        console.log('🔍 Checking database version...');

        // Create migrations table if it doesn't exist
        await run(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version INTEGER NOT NULL UNIQUE,
                name TEXT NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Get current version
        const currentVersion = await get('SELECT MAX(version) as version FROM migrations');
        const dbVersion = currentVersion?.version || 0;

        console.log(`📊 Current database version: ${dbVersion}`);

        // Define all migrations
        const migrations = [
            {
                version: 1,
                name: 'Add timer tracking columns to submissions',
                migrate: async () => {
                    console.log('🔧 Running migration 1: Add timer tracking...');

                    // Check if submissions table exists
                    const tableExists = await get(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name='submissions'"
                    );

                    if (!tableExists) {
                        console.log('ℹ️  Submissions table does not exist yet, will be created fresh');
                        return; // Table will be created by initDatabase
                    }

                    // Check current schema
                    const columns = await all('PRAGMA table_info(submissions)');
                    const columnNames = columns.map(col => col.name);

                    console.log('📋 Current columns:', columnNames);

                    // Check if migration is needed
                    const needsMigration =
                        !columnNames.includes('exam_started_at') ||
                        !columnNames.includes('duration_minutes') ||
                        columns.find(col => col.name === 'answers' && col.notnull === 1); // Check if answers is NOT NULL

                    if (!needsMigration) {
                        console.log('✅ Schema already up to date, skipping migration');
                        return;
                    }

                    console.log('⚠️  Migration needed: Updating submissions table schema...');

                    // Get current data
                    const existingData = await all('SELECT * FROM submissions');
                    console.log(`📦 Found ${existingData.length} existing submissions to preserve`);

                    // Create new table with correct schema
                    await run(`
                        CREATE TABLE submissions_new (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            student_id INTEGER NOT NULL,
                            subject TEXT NOT NULL,
                            exam_started_at DATETIME,
                            duration_minutes INTEGER,
                            answers TEXT,
                            score INTEGER,
                            total_questions INTEGER,
                            submitted_at DATETIME,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
                        )
                    `);

                    // Migrate existing data
                    if (existingData.length > 0) {
                        for (const row of existingData) {
                            await run(`
                                INSERT INTO submissions_new (
                                    id, student_id, subject, exam_started_at, duration_minutes,
                                    answers, score, total_questions, submitted_at, created_at
                                )
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `, [
                                row.id,
                                row.student_id,
                                row.subject,
                                row.exam_started_at || null,
                                row.duration_minutes || null,
                                row.answers,
                                row.score,
                                row.total_questions,
                                row.submitted_at,
                                row.created_at
                            ]);
                        }
                        console.log(`✅ Migrated ${existingData.length} submissions`);
                    }

                    // Drop old table and rename new one
                    await run('DROP TABLE submissions');
                    await run('ALTER TABLE submissions_new RENAME TO submissions');

                    // Recreate indexes
                    await run('CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id)');
                    await run('CREATE INDEX IF NOT EXISTS idx_submissions_subject ON submissions(subject)');
                    await run('CREATE INDEX IF NOT EXISTS idx_submissions_started_at ON submissions(exam_started_at)');

                    console.log('✅ Migration 1 completed successfully!');
                }
            }
            // Add more migrations here in the future:
            // {
            //     version: 2,
            //     name: 'Add new feature',
            //     migrate: async () => { ... }
            // }
        ];

        // Run pending migrations
        for (const migration of migrations) {
            if (migration.version > dbVersion) {
                console.log(`\n🚀 Applying migration ${migration.version}: ${migration.name}`);

                try {
                    await migration.migrate();

                    // Record migration
                    await run(
                        'INSERT INTO migrations (version, name) VALUES (?, ?)',
                        [migration.version, migration.name]
                    );

                    console.log(`✅ Migration ${migration.version} applied successfully!\n`);
                } catch (err) {
                    console.error(`❌ Migration ${migration.version} failed:`, err);
                    throw err;
                }
            }
        }

        const finalVersion = await get('SELECT MAX(version) as version FROM migrations');
        console.log(`✅ Database is up to date (version ${finalVersion?.version || 0})`);

    } catch (error) {
        console.error('❌ Migration check failed:', error);
        throw error;
    }
}

/**
 * Initialize database - Create all tables
 */
async function initDatabase() {
    try {
        console.log('🔧 Initializing database tables...');

        // Run migrations first
        await checkAndRunMigrations();

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

        // Create submissions table with correct schema
        await run(`
            CREATE TABLE IF NOT EXISTS submissions (
                                                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                       student_id INTEGER NOT NULL,
                                                       subject TEXT NOT NULL,
                                                       exam_started_at DATETIME,
                                                       duration_minutes INTEGER,
                                                       answers TEXT,
                                                       score INTEGER,
                                                       total_questions INTEGER,
                                                       submitted_at DATETIME,
                                                       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                       FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
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
        await run('CREATE INDEX IF NOT EXISTS idx_submissions_subject ON submissions(subject)');
        await run('CREATE INDEX IF NOT EXISTS idx_submissions_started_at ON submissions(exam_started_at)');
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