const { getDb, getDatabasePath } = require('../utils/db');
const { getSettings } = require('./settingsService');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class ArchiveService {
    constructor() {
        // Determine archive directory based on environment
        this.archiveDir = this.getArchiveDirectory();
        this.ensureArchiveDirectory();
        console.log('📁 Archive directory:', this.archiveDir);
    }

    /**
     * Get archive directory - works in both dev and production
     */
    getArchiveDirectory() {
        // Try to detect if running in Electron (packaged app)
        if (process.versions.electron) {
            // Running in Electron - use app data directory
            const appName = 'molek-cbt';
            const platform = process.platform;

            if (platform === 'win32') {
                return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appName, 'archives');
            } else if (platform === 'darwin') {
                return path.join(os.homedir(), 'Library', 'Application Support', appName, 'archives');
            } else {
                return path.join(os.homedir(), '.config', appName, 'archives');
            }
        } else {
            // Running in dev mode - use project directory
            return path.join(__dirname, '../../../archives');
        }
    }

    ensureArchiveDirectory() {
        if (!fs.existsSync(this.archiveDir)) {
            fs.mkdirSync(this.archiveDir, { recursive: true });
            console.log('✅ Created archive directory');
        }
    }

    getArchivePath() {
        return this.archiveDir;
    }

    /**
     * Archive current term with all data
     */
    async archiveTerm(termName) {
        try {
            const db = await getDb();
            const settings = await getSettings();
            const timestamp = Date.now();

            // Create archive name: Session_Term_Timestamp
            // Example: 2024-2025_First_Term_1732654821345
            const sessionSafe = settings.academicSession.replace(/\//g, '-');
            const termSafe = (termName || settings.currentTerm).replace(/\s+/g, '_');
            const archiveName = `${sessionSafe}_${termSafe}_${timestamp}`;
            const archivePath = path.join(this.archiveDir, archiveName);

            console.log(`📦 Archiving: ${archiveName}`);

            await fs.ensureDir(archivePath);

            // Export all data from database
            const data = await this.exportAllData(db);

            // Save data.json
            await fs.writeJSON(
                path.join(archivePath, 'data.json'),
                data,
                { spaces: 2 }
            );

            // Copy database file
            const dbPath = getDatabasePath();
            if (fs.existsSync(dbPath)) {
                await fs.copy(dbPath, path.join(archivePath, 'cbt.db'));
            }

            // Export students CSV
            await this.exportStudentsCSV(data.students, path.join(archivePath, 'students.csv'));

            // Export results CSV
            await this.exportResultsCSV(data.submissions, path.join(archivePath, 'results.csv'));

            // Create summary text file
            await this.createSummary(data, settings, termName, path.join(archivePath, 'SUMMARY.txt'));

            console.log(`✅ Archive created: ${archiveName}`);

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
    async exportAllData(db) {
        const { all } = require('../utils/db');

        const data = {
            students: await all('SELECT * FROM students ORDER BY class, last_name'),
            exams: await all('SELECT * FROM exams ORDER BY class, subject'),
            questions: await all('SELECT * FROM questions ORDER BY exam_id, id'),
            submissions: await all('SELECT * FROM submissions ORDER BY submitted_at DESC'),
            auditLogs: await all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1000')
        };

        return data;
    }

    /**
     * Export students to CSV
     */
    async exportStudentsCSV(students, filepath) {
        const headers = ['First Name', 'Middle Name', 'Last Name', 'Class', 'Student ID', 'Exam Code', 'Created At'];
        const rows = students.map(s => [
            s.first_name,
            s.middle_name || '',
            s.last_name,
            s.class,
            s.student_id || '',
            s.exam_code,
            s.created_at
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        await fs.writeFile(filepath, csv, 'utf8');
    }

    /**
     * Export results to CSV
     */
    async exportResultsCSV(submissions, filepath) {
        const { all } = require('../utils/db');

        const headers = ['Student Name', 'Class', 'Exam Code', 'Subject', 'Score', 'Total', 'Percentage', 'Submitted At'];

        const rows = [];
        for (const sub of submissions) {
            const student = await require('../utils/db').get(
                'SELECT first_name, middle_name, last_name, class, exam_code FROM students WHERE id = ?',
                [sub.student_id]
            );

            if (student) {
                const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim();
                const percentage = ((sub.score / sub.total_questions) * 100).toFixed(2);

                rows.push([
                    fullName,
                    student.class,
                    student.exam_code,
                    sub.subject,
                    sub.score,
                    sub.total_questions,
                    `${percentage}%`,
                    sub.submitted_at
                ]);
            }
        }

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        await fs.writeFile(filepath, csv, 'utf8');
    }

    /**
     * Create summary text file
     */
    async createSummary(data, settings, termName, filepath) {
        const summary = `
╔════════════════════════════════════════════════════════════════╗
║                    ARCHIVE SUMMARY                             ║
╚════════════════════════════════════════════════════════════════╝

Academic Session: ${settings.academicSession}
Term: ${termName || settings.currentTerm}
Archive Date: ${new Date().toLocaleString()}
System: ${settings.systemName}
School: ${settings.schoolName}

═══════════════════════════════════════════════════════════════════
                         STATISTICS
═══════════════════════════════════════════════════════════════════

Total Students: ${data.students.length}
Total Exams: ${data.exams.length}
Total Questions: ${data.questions.length}
Total Submissions: ${data.submissions.length}

═══════════════════════════════════════════════════════════════════
                         FILES INCLUDED
═══════════════════════════════════════════════════════════════════

✅ data.json - Complete database export
✅ cbt.db - Database backup file
✅ students.csv - Student list
✅ results.csv - Exam results
✅ SUMMARY.txt - This file

═══════════════════════════════════════════════════════════════════
                         IMPORTANT NOTES
═══════════════════════════════════════════════════════════════════

• This archive contains all data for ${termName || settings.currentTerm}
• Keep this archive in a safe location
• Do not delete this archive - it's your backup
• To restore data, use the database backup file (cbt.db)

═══════════════════════════════════════════════════════════════════
        `.trim();

        await fs.writeFile(filepath, summary, 'utf8');
    }

    /**
     * Reset database for new term - clear students and submissions, keep exams/questions
     */
    async resetDatabase() {
        try {
            console.log('🗑️  Resetting database for new term...');

            const { run } = require('../utils/db');

            // Clear students table
            await run('DELETE FROM students');
            console.log('   ✅ Students cleared');

            // Clear submissions table
            await run('DELETE FROM submissions');
            console.log('   ✅ Submissions cleared');

            // Clear audit logs (optional - you may want to keep these)
            await run('DELETE FROM audit_logs');
            console.log('   ✅ Audit logs cleared');

            // Note: exams and questions tables are NOT cleared
            // This allows reusing questions across terms

            console.log('✅ Database reset complete - Ready for new term!');

            return {
                success: true,
                message: 'Database reset successfully',
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
            console.error('❌ Reset database error:', error);
            throw error;
        }
    }

    /**
     * List all archives
     */
    async listArchives() {
        try {
            const archives = [];
            const files = await fs.readdir(this.archiveDir);

            for (const file of files) {
                const archivePath = path.join(this.archiveDir, file);
                const stats = await fs.stat(archivePath);

                if (stats.isDirectory()) {
                    // Try to read summary from data.json
                    const dataJsonPath = path.join(archivePath, 'data.json');
                    let summary = null;

                    if (await fs.pathExists(dataJsonPath)) {
                        const data = await fs.readJSON(dataJsonPath);

                        // Try to read settings from archived data
                        const settingsPath = path.join(archivePath, 'settings.json');
                        let archivedSettings = null;
                        if (await fs.pathExists(settingsPath)) {
                            archivedSettings = await fs.readJSON(settingsPath);
                        }

                        summary = {
                            session: archivedSettings?.academicSession || 'Unknown',
                            term: archivedSettings?.currentTerm || 'Unknown',
                            students: data.students?.length || 0,
                            submissions: data.submissions?.length || 0,
                            archivedAt: stats.birthtime
                        };
                    }

                    archives.push({
                        name: file,
                        path: archivePath,
                        size: await this.getDirectorySize(archivePath),
                        createdAt: stats.birthtime,
                        summary
                    });
                }
            }

            // Sort by creation date (newest first)
            archives.sort((a, b) => b.createdAt - a.createdAt);

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

            if (stats.isFile()) {
                totalSize += stats.size;
            } else if (stats.isDirectory()) {
                totalSize += await this.getDirectorySize(filePath);
            }
        }

        // Convert to human-readable format
        if (totalSize < 1024) return `${totalSize} B`;
        if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(2)} KB`;
        if (totalSize < 1024 * 1024 * 1024) return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
        return `${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
}

// Export singleton instance
module.exports = new ArchiveService();