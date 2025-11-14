const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../cbt.db');
const db = new Database(DB_PATH);

function initDB() {
    try {
        // Students table
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
                has_submitted BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Exams table
        db.exec(`
            CREATE TABLE IF NOT EXISTS exams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                class TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 0,
                duration_minutes INTEGER DEFAULT 60,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(subject, class)
            )
        `);

        // Questions table
        db.exec(`
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                option_a TEXT,
                option_b TEXT,
                option_c TEXT,
                option_d TEXT,
                correct_answer TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE
            )
        `);

        // Submissions table
        db.exec(`CREATE TABLE IF NOT EXISTS submissions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        student_id INTEGER NOT NULL,
                        subject TEXT NOT NULL,
                        answers TEXT NOT NULL,
                        score INTEGER NOT NULL,
                        total_questions INTEGER NOT NULL,
                        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
                )
        `);

        console.log('✅ Database ready: cbt.db (using better-sqlite3)');
    } catch (error) {
        console.error('💥 Setup error:', error);
        throw error;
    } finally {
        db.close();
    }
}

initDB();