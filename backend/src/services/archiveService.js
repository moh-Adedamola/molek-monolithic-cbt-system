const { getDb } = require('../utils/db');
const fs = require('fs-extra');
const path = require('path');

class ArchiveService {
    constructor() {
        // Archives path from environment or default
        // Development: backend/archives/
        // Production: Documents/MolekCBT_Archives/
        this.archiveDir = process.env.ARCHIVES_PATH ||
            path.join(__dirname, '../../archives');

        console.log('📁 Archive service initialized');
        console.log('   Archives directory:', this.archiveDir);
    }

    /**
     * Archive current term/session data
     */
    async archiveTerm(termName) {
        const timestamp = Date.now();
        const safeName = termName.replace(/[^a-zA-Z0-9-]/g, '_').toLowerCase();
        const archivePath = path.join(this.archiveDir, safeName);

        try {
            await fs.ensureDir(archivePath);

            console.log(`📦 Starting archive for: ${termName}`);

            // 1. Export all data to JSON
            const data = await this.exportAllData();

            // 2. Save JSON backup
            await fs.writeJSON(
                path.join(archivePath, `data_${timestamp}.json`),
                data,
                { spaces: 2 }
            );

            // 3. Copy database file
            const dbPath = this.getDatabasePath();
            await fs.copy(
                dbPath,
                path.join(archivePath, `cbt_${timestamp}.db`)
            );

            // 4. Export CSVs
            await this.exportStudentsCSV(data.students, path.join(archivePath, `students_${timestamp}.csv`));
            await this.exportResultsByClass(data, archivePath, timestamp);

            // 5. Export questions by subject
            await this.exportQuestionsBySubject(data, archivePath, timestamp);

            // 6. Generate summary report
            await this.generateSummaryReport(data, archivePath, timestamp, termName);

            console.log(`✅ Archive completed: ${archivePath}`);

            return {
                success: true,
                path: archivePath,
                message: `Term archived successfully to: ${archivePath}`
            };
        } catch (error) {
            console.error('❌ Archive failed:', error);
            throw new Error(`Archive failed: ${error.message}`);
        }
    }

    /**
     * Get database path based on environment
     */
    getDatabasePath() {
        // Check if DB_PATH is set by Electron
        if (process.env.DB_PATH) {
            if (process.env.DB_PATH.endsWith('.db')) {
                return process.env.DB_PATH;
            }
            return path.join(process.env.DB_PATH, 'cbt.db');
        }

        // Default: Development path
        return path.join(__dirname, '../db/cbt.db');
    }

    async exportAllData() {
        let db;
        try {
            db = getDb();

            const data = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    version: '1.0.0',
                    database: this.getDatabasePath()
                },
                students: db.prepare('SELECT * FROM students ORDER BY class, last_name').all(),
                exams: db.prepare('SELECT * FROM exams ORDER BY class, subject').all(),
                questions: db.prepare('SELECT * FROM questions ORDER BY exam_id').all(),
                submissions: db.prepare(`
                    SELECT s.*, st.first_name, st.last_name, st.class, st.exam_code
                    FROM submissions s
                             JOIN students st ON s.student_id = st.id
                    ORDER BY st.class, st.last_name, s.subject
                `).all(),
                audit_logs: db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1000').all()
            };

            return data;
        } finally {
            if (db) db.close();
        }
    }

    async exportStudentsCSV(students, filepath) {
        const header = 'first_name,middle_name,last_name,class,student_id,exam_code,created_at\n';
        const rows = students.map(s =>
            `${s.first_name},${s.middle_name || ''},${s.last_name},${s.class},${s.student_id || ''},${s.exam_code},${s.created_at}`
        ).join('\n');

        await fs.writeFile(filepath, header + rows);
    }

    async exportResultsByClass(data, archivePath, timestamp) {
        const classes = [...new Set(data.students.map(s => s.class))];

        for (const cls of classes) {
            const classResults = data.submissions.filter(sub => sub.class === cls);

            if (classResults.length > 0) {
                const header = 'name,exam_code,subject,score,total,percentage,submitted_at\n';
                const rows = classResults.map(r => {
                    const percentage = Math.round((r.score / r.total_questions) * 100);
                    const fullName = `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.trim();
                    return `${fullName},${r.exam_code},${r.subject},${r.score},${r.total_questions},${percentage}%,${r.submitted_at}`;
                }).join('\n');

                await fs.writeFile(
                    path.join(archivePath, `results_${cls}_${timestamp}.csv`),
                    header + rows
                );
            }
        }
    }

    async exportQuestionsBySubject(data, archivePath, timestamp) {
        const examMap = new Map(data.exams.map(e => [e.id, e]));
        const questionsBySubject = {};

        data.questions.forEach(q => {
            const exam = examMap.get(q.exam_id);
            if (exam) {
                const key = `${exam.subject}_${exam.class}`;
                if (!questionsBySubject[key]) {
                    questionsBySubject[key] = [];
                }
                questionsBySubject[key].push(q);
            }
        });

        for (const [key, questions] of Object.entries(questionsBySubject)) {
            const header = 'question_text,option_a,option_b,option_c,option_d,correct_answer\n';
            const rows = questions.map(q =>
                `"${q.question_text.replace(/"/g, '""')}","${q.option_a}","${q.option_b}","${q.option_c}","${q.option_d}",${q.correct_answer}`
            ).join('\n');

            await fs.writeFile(
                path.join(archivePath, `questions_${key}_${timestamp}.csv`),
                header + rows
            );
        }
    }

    async generateSummaryReport(data, archivePath, timestamp, termName) {
        const classCounts = this.getClassBreakdown(data.students);
        const subjectsList = this.getSubjectBreakdown(data.exams);
        const performance = this.getPerformanceSummary(data.submissions);

        const report = `
╔════════════════════════════════════════════════════════════════════╗
║           MOLEK CBT SYSTEM - TERM ARCHIVE SUMMARY                  ║
╚════════════════════════════════════════════════════════════════════╝

Term: ${termName}
Archive Date: ${new Date().toLocaleString()}
Archive Location: ${archivePath}
Database Source: ${data.metadata.database}

════════════════════════════════════════════════════════════════════

📊 STATISTICS
────────────────────────────────────────────────────────────────────
Total Students:     ${data.students.length}
Total Exams:        ${data.exams.length}
Total Questions:    ${data.questions.length}
Total Submissions:  ${data.submissions.length}
Audit Log Entries:  ${data.audit_logs.length}

════════════════════════════════════════════════════════════════════

🏫 CLASS BREAKDOWN
────────────────────────────────────────────────────────────────────
${classCounts}

════════════════════════════════════════════════════════════════════

📚 SUBJECTS
────────────────────────────────────────────────────────────────────
${subjectsList}

════════════════════════════════════════════════════════════════════

📈 PERFORMANCE SUMMARY
────────────────────────────────────────────────────────────────────
${performance}

════════════════════════════════════════════════════════════════════

📂 ARCHIVED FILES
────────────────────────────────────────────────────────────────────
✓ cbt_${timestamp}.db                    (Complete database backup)
✓ data_${timestamp}.json                 (All data in JSON format)
✓ students_${timestamp}.csv              (All students list)
✓ results_[CLASS]_${timestamp}.csv       (Results by class)
✓ questions_[SUBJECT]_${timestamp}.csv   (Questions by subject)

════════════════════════════════════════════════════════════════════

⚠️  IMPORTANT NOTES
────────────────────────────────────────────────────────────────────
- Keep this archive in a safe location
- Database file can be restored if needed
- CSV files can be opened in Excel
- Do not modify archived files

════════════════════════════════════════════════════════════════════
`;

        await fs.writeFile(
            path.join(archivePath, `SUMMARY_${timestamp}.txt`),
            report
        );
    }

    getClassBreakdown(students) {
        const classCounts = students.reduce((acc, s) => {
            acc[s.class] = (acc[s.class] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(classCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cls, count]) => `${cls.padEnd(10)} : ${count} students`)
            .join('\n');
    }

    getSubjectBreakdown(exams) {
        const subjects = [...new Set(exams.map(e => `${e.subject} (${e.class})`))];
        return subjects.sort().map((s, i) => `${(i + 1).toString().padStart(2)}. ${s}`).join('\n');
    }

    getPerformanceSummary(submissions) {
        if (submissions.length === 0) return 'No submissions recorded';

        const totalScore = submissions.reduce((sum, s) => sum + s.score, 0);
        const totalPossible = submissions.reduce((sum, s) => sum + s.total_questions, 0);
        const avgPercentage = Math.round((totalScore / totalPossible) * 100);
        const passCount = submissions.filter(s => (s.score / s.total_questions * 100) >= 50).length;
        const passRate = Math.round((passCount / submissions.length) * 100);

        return `Average Score:        ${avgPercentage}%
Total Submissions:    ${submissions.length}
Students Who Passed:  ${passCount} (${passRate}%)
Students Who Failed:  ${submissions.length - passCount} (${100 - passRate}%)`;
    }

    /**
     * Reset database for new term
     */
    async resetForNewTerm() {
        let db;
        try {
            db = getDb();

            console.log('🔄 Resetting database for new term...');

            // Delete all data
            db.prepare('DELETE FROM submissions').run();
            db.prepare('DELETE FROM questions').run();
            db.prepare('DELETE FROM exams').run();
            db.prepare('DELETE FROM students').run();

            console.log('✅ Database reset completed');

            return {
                success: true,
                message: 'Database reset successfully. Ready for new term!'
            };
        } finally {
            if (db) db.close();
        }
    }

    /**
     * List all archived terms
     */
    async listArchives() {
        try {
            await fs.ensureDir(this.archiveDir);
            const dirs = await fs.readdir(this.archiveDir);

            const archives = [];
            for (const dir of dirs) {
                const dirPath = path.join(this.archiveDir, dir);
                const stat = await fs.stat(dirPath);

                if (stat.isDirectory()) {
                    const files = await fs.readdir(dirPath);
                    const summaryFile = files.find(f => f.startsWith('SUMMARY_'));

                    archives.push({
                        name: dir.replace(/_/g, ' '),
                        path: dirPath,
                        created: stat.birthtime,
                        fileCount: files.length,
                        hasSummary: !!summaryFile
                    });
                }
            }

            return archives.sort((a, b) => b.created - a.created);
        } catch (error) {
            console.error('Failed to list archives:', error);
            return [];
        }
    }
}

module.exports = new ArchiveService();