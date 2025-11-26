// backend/src/services/archiveService.js
const { getDb } = require('../utils/db');
const { getSettings } = require('./settingsService');
const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');

class ArchiveService {
    constructor() {
        // Use app.getPath('userData') for consistent location
        const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '../../');
        this.archiveDir = path.join(userDataPath, 'archives');
        this.ensureArchiveDirectory();
        console.log('📁 Archive directory:', this.archiveDir);
    }

    ensureArchiveDirectory() {
        if (!fs.existsSync(this.archiveDir)) {
            fs.mkdirSync(this.archiveDir, { recursive: true });
            console.log('✅ Created archive directory');
        }
    }

    getDatabasePath() {
        if (app) {
            return path.join(app.getPath('userData'), 'data', 'cbt.db');
        }
        return path.join(__dirname, '../db/cbt.db');
    }

    /**
     * Archive current term with all data
     */
    async archiveTerm(termName) {
        try {
            const db = getDb();
            const settings = getSettings();
            const timestamp = Date.now();

            // Create archive name: Session_Term_Timestamp
            // Example: 2024-2025_First_Term_1732654821345
            const sessionSafe = settings.academicSession.replace(/\//g, '-');
            const termSafe = (termName || settings.currentTerm).replace(/\s+/g, '_');
            const archiveName = `${sessionSafe}_${termSafe}_${timestamp}`;
            const archivePath = path.join(this.archiveDir, archiveName);

            console.log(`📦 Archiving: ${archiveName}`);

            await fs.ensureDir(archivePath);

            // 1. Export all data to JSON
            const data = this.exportAllData(db);
            await fs.writeJSON(
                path.join(archivePath, 'data.json'),
                { ...data, settings, archivedAt: new Date().toISOString() },
                { spaces: 2 }
            );

            // 2. Copy database file
            const dbPath = this.getDatabasePath();
            if (fs.existsSync(dbPath)) {
                await fs.copy(dbPath, path.join(archivePath, 'cbt.db'));
            }

            // 3. Export students CSV
            await this.exportStudentsCSV(data.students, path.join(archivePath, 'students.csv'));

            // 4. Export results CSV
            await this.exportResultsCSV(data.submissions, path.join(archivePath, 'results.csv'));

            // 5. Create summary file
            await this.createSummary(data, settings, termName, path.join(archivePath, 'SUMMARY.txt'));

            console.log(`✅ Archive created: ${archivePath}`);

            return {
                success: true,
                archiveName,
                archivePath,
                stats: {
                    students: data.students.length,
                    exams: data.exams.length,
                    questions: data.questions.length,
                    submissions: data.submissions.length
                }
            };
        } catch (error) {
            console.error('❌ Archive error:', error);
            throw error;
        }
    }

    /**
     * Export all data from database
     */
    exportAllData(db) {
        const students = db.prepare('SELECT * FROM students ORDER BY class, last_name').all();
        const exams = db.prepare('SELECT * FROM exams ORDER BY class, subject').all();
        const questions = db.prepare('SELECT * FROM questions ORDER BY exam_id').all();
        const submissions = db.prepare(`
            SELECT s.*, st.first_name, st.last_name, st.class, st.exam_code
            FROM submissions s
                     JOIN students st ON s.student_id = st.id
            ORDER BY st.class, st.last_name, s.submitted_at
        `).all();

        return { students, exams, questions, submissions };
    }

    /**
     * Export students to CSV
     */
    async exportStudentsCSV(students, filepath) {
        const headers = 'First Name,Middle Name,Last Name,Class,Student ID,Exam Code,Created At\n';
        const rows = students.map(s =>
            `${s.first_name || ''},${s.middle_name || ''},${s.last_name || ''},${s.class || ''},${s.student_id || ''},${s.exam_code || ''},${s.created_at || ''}`
        ).join('\n');

        await fs.writeFile(filepath, headers + rows);
    }

    /**
     * Export results to CSV
     */
    async exportResultsCSV(submissions, filepath) {
        const headers = 'Student Name,Class,Exam Code,Subject,Score,Total,Percentage,Submitted At\n';
        const rows = submissions.map(s => {
            const name = `${s.first_name} ${s.last_name}`;
            const percentage = s.total_questions > 0 ? Math.round((s.score / s.total_questions) * 100) : 0;
            return `${name},${s.class},${s.exam_code},${s.subject},${s.score},${s.total_questions},${percentage}%,${s.submitted_at}`;
        }).join('\n');

        await fs.writeFile(filepath, headers + rows);
    }

    /**
     * Create summary text file
     */
    async createSummary(data, settings, termName, filepath) {
        const summary = `
════════════════════════════════════════════════════════════════
                    MOLEK CBT SYSTEM - ARCHIVE SUMMARY
════════════════════════════════════════════════════════════════

Archive Details:
  Academic Session: ${settings.academicSession}
  Term: ${termName || settings.currentTerm}
  Archived On: ${new Date().toLocaleString()}
  School: ${settings.schoolName}

Statistics:
  Total Students: ${data.students.length}
  Total Exams: ${data.exams.length}
  Total Questions: ${data.questions.length}
  Total Submissions: ${data.submissions.length}

Files Included:
  - data.json (Complete database export)
  - cbt.db (Database backup)
  - students.csv (Student list)
  - results.csv (Exam results)
  - SUMMARY.txt (This file)

════════════════════════════════════════════════════════════════
                        IMPORTANT NOTES
════════════════════════════════════════════════════════════════

This archive contains ALL data from ${termName || settings.currentTerm}.
Keep this archive safe for record-keeping and audit purposes.

To restore this data in the future, contact your system administrator.

════════════════════════════════════════════════════════════════
`;

        await fs.writeFile(filepath, summary.trim());
    }

    /**
     * Reset database for new term
     * Keeps: exams, questions, settings
     * Clears: students, submissions, audit_logs
     */
    async resetDatabase() {
        try {
            const db = getDb();

            console.log('🗑️  Resetting database for new term...');

            // Clear student data
            db.prepare('DELETE FROM students').run();
            console.log('   ✅ Students cleared');

            // Clear submissions
            db.prepare('DELETE FROM submissions').run();
            console.log('   ✅ Submissions cleared');

            // Clear audit logs
            db.prepare('DELETE FROM audit_logs').run();
            console.log('   ✅ Audit logs cleared');

            // Keep: exams, questions, settings

            console.log('✅ Database reset complete - Ready for new term!');

            return {
                success: true,
                message: 'Database cleared. Exams and questions retained.',
                cleared: {
                    students: true,
                    submissions: true,
                    auditLogs: true
                },
                retained: {
                    exams: true,
                    questions: true,
                    settings: true
                }
            };
        } catch (error) {
            console.error('❌ Reset error:', error);
            throw error;
        }
    }

    /**
     * List all archives
     */
    async listArchives() {
        try {
            await this.ensureArchiveDirectory();

            const archives = [];
            const dirs = await fs.readdir(this.archiveDir);

            for (const dir of dirs) {
                const archivePath = path.join(this.archiveDir, dir);
                const stats = await fs.stat(archivePath);

                if (stats.isDirectory()) {
                    const summaryPath = path.join(archivePath, 'SUMMARY.txt');
                    const dataPath = path.join(archivePath, 'data.json');

                    let summary = null;
                    if (fs.existsSync(dataPath)) {
                        const data = await fs.readJSON(dataPath);
                        summary = {
                            session: data.settings?.academicSession || 'Unknown',
                            term: data.settings?.currentTerm || 'Unknown',
                            students: data.students?.length || 0,
                            submissions: data.submissions?.length || 0,
                            archivedAt: data.archivedAt || stats.birthtime.toISOString()
                        };
                    }

                    archives.push({
                        name: dir,
                        path: archivePath,
                        size: await this.getDirectorySize(archivePath),
                        createdAt: stats.birthtime,
                        summary
                    });
                }
            }

            // Sort by creation date (newest first)
            archives.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return archives;
        } catch (error) {
            console.error('❌ List archives error:', error);
            return [];
        }
    }

    /**
     * Get total size of directory
     */
    async getDirectorySize(dirPath) {
        let totalSize = 0;
        const files = await fs.readdir(dirPath);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);
            totalSize += stats.size;
        }

        // Convert to human-readable format
        if (totalSize < 1024) return `${totalSize} B`;
        if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(2)} KB`;
        return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
    }

    /**
     * Get archive directory path
     */
    getArchivePath() {
        return this.archiveDir;
    }
}

module.exports = new ArchiveService();