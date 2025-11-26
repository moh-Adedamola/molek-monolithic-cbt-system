// backend/src/services/archiveService.js
const { all } = require('../utils/db');
const fs = require('fs-extra');
const path = require('path');

class ArchiveService {
    constructor() {
        this.archiveDir = process.env.ARCHIVES_PATH || path.join(__dirname, '../../archives');
        console.log('Archive service initialized →', this.archiveDir);
    }

    getDatabasePath() {
        if (process.env.DB_PATH) {
            return process.env.DB_PATH.endsWith('.db')
                ? process.env.DB_PATH
                : path.join(process.env.DB_PATH, 'cbt.db');
        }
        return path.join(__dirname, '../db/cbt.db');
    }

    async exportAllData() {
        const students = await all('SELECT * FROM students ORDER BY class, last_name');
        const exams = await all('SELECT * FROM exams ORDER BY class, subject');
        const questions = await all('SELECT * FROM questions ORDER BY exam_id');
        const submissions = await all(`
            SELECT s.*, st.first_name, st.last_name, st.class, st.exam_code
            FROM submissions s
            JOIN students st ON s.student_id = st.id
            ORDER BY st.class, st.last_name, s.submitted_at
        `);

        return { students, exams, questions, submissions };
    }

    async archiveTerm(termName) {
        const timestamp = Date.now();
        const safeName = termName.replace(/[^a-zA-Z0-9-]/g, '_').toLowerCase();
        const archivePath = path.join(this.archiveDir, safeName);

        try {
            await fs.ensureDir(archivePath);
            console.log(`Archiving term: ${termName}`);

            const data = await this.exportAllData();

            await fs.writeJSON(path.join(archivePath, `data_${timestamp}.json`), data, { spaces: 2 });
            await fs.copy(this.getDatabasePath(), path.join(archivePath, `cbt_${timestamp}.db`));

            // Export CSVs
            await this.exportStudentsCSV(data.students, path.join(archivePath, `students_${timestamp}.csv`));
            await this.exportResultsByClass(data, archivePath, timestamp);
            await this.exportQuestionsBySubject(data, archivePath, timestamp);
            await this.generateSummaryReport(data, archivePath, timestamp, termName);

            console.log(`Archive completed: ${archivePath}`);
            return { success: true, path: archivePath };
        } catch (error) {
            console.error('Archive failed:', error);
            throw error;
        }
    }

    async exportStudentsCSV(students, filePath) {
        const headers = 'First Name,Middle Name,Last Name,Class,Student ID,Exam Code\n';
        const rows = students.map(s =>
            `${s.first_name},${s.middle_name || ''},${s.last_name},${s.class},${s.student_id || ''},${s.exam_code}`
        ).join('\n');
        await fs.writeFile(filePath, headers + rows);
    }

    async exportResultsByClass(data, archivePath, timestamp) {
        const { submissions, students } = data;
        const classMap = students.reduce((acc, s) => {
            acc[s.id] = s;
            return acc;
        }, {});

        const classGroups = submissions.reduce((acc, sub) => {
            const student = classMap[sub.student_id];
            const cls = student?.class || 'Unknown';
            if (!acc[cls]) acc[cls] = [];
            acc[cls].push(sub);
            return acc;
        }, {});

        for (const [cls, subs] of Object.entries(classGroups)) {
            const csv = 'Name,Subject,Score,Total,Percentage,Date\n' +
                subs.map(s => {
                    const student = classMap[s.student_id];
                    const name = `${student.first_name} ${student.last_name}`.trim();
                    const perc = Math.round((s.score / s.total_questions) * 100);
                    return `${name},${s.subject},${s.score},${s.total_questions},${perc},${s.submitted_at}`;
                }).join('\n');
            await fs.writeFile(path.join(archivePath, `results_${cls}_${timestamp}.csv`), csv);
        }
    }

    async exportQuestionsBySubject(data, archivePath, timestamp) {
        const { questions, exams } = data;
        const examMap = exams.reduce((acc, e) => { acc[e.id] = e; return acc; }, {});

        const subjectGroups = questions.reduce((acc, q) => {
            const exam = examMap[q.exam_id];
            const key = `${exam.subject} (${exam.class})`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(q);
            return acc;
        }, {});

        for (const [subject, qs] of Object.entries(subjectGroups)) {
            const safe = subject.replace(/[^a-zA-Z0-9]/g, '_');
            const txt = qs.map((q, i) => `${i + 1}. ${q.question_text}\nA) ${q.option_a}\nB) ${q.option_b}\nC) ${q.option_c}\nD) ${q.option_d}\nAnswer: ${q.correct_answer}\n`).join('\n');
            await fs.writeFile(path.join(archivePath, `questions_${safe}_${timestamp}.txt`), txt);
        }
    }

    async generateSummaryReport(data, archivePath, timestamp, termName) {
        const report = `
════════════════════════════════════════════════════════════════════
                     MOLEK CBT SYSTEM - TERM ARCHIVE
                           ${termName.toUpperCase()}
════════════════════════════════════════════════════════════════════
Export Date: ${new Date().toLocaleString()}
Total Students: ${data.students.length}
Active Exams: ${data.exams.filter(e => e.is_active).length}
Total Questions: ${data.questions.length}
Total Submissions: ${data.submissions.length}

Class Breakdown:
${this.getClassBreakdown(data.students)}

Performance Summary:
${this.getPerformanceSummary(data.submissions)}

Keep this archive in a safe location.
════════════════════════════════════════════════════════════════════
        `.trim();
        await fs.writeFile(path.join(archivePath, `SUMMARY_${timestamp}.txt`), report);
    }

    getClassBreakdown(students) {
        const counts = students.reduce((acc, s) => {
            acc[s.class] = (acc[s.class] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([c, n]) => `${c.padEnd(10)} : ${n} students`)
            .join('\n');
    }

    getPerformanceSummary(submissions) {
        if (!submissions.length) return 'No submissions recorded';
        const totalScore = submissions.reduce((s, sub) => s + sub.score, 0);
        const totalPossible = submissions.reduce((s, sub) => s + sub.total_questions, 0);
        const avg = Math.round((totalScore / totalPossible) * 100);
        const passed = submissions.filter(s => (s.score / s.total_questions) >= 0.5).length;
        return `Average Score: ${avg}%\nPassed (50%+): ${passed}/${submissions.length}`;
    }

    async resetForNewTerm() {
        try {
            console.log('Resetting database...');
            await run('DELETE FROM submissions');
            await run('DELETE FROM questions');
            await run('DELETE FROM exams');
            await run('DELETE FROM students');
            console.log('Database reset complete');
            return { success: true, message: 'Ready for new term!' };
        } catch (error) {
            console.error('Reset failed:', error);
            throw error;
        }
    }

    async listArchives() {
        try {
            await fs.ensureDir(this.archiveDir);
            const items = await fs.readdir(this.archiveDir);
            const archives = [];

            for (const item of items) {
                const fullPath = path.join(this.archiveDir, item);
                const stat = await fs.stat(fullPath);
                if (stat.isDirectory()) {
                    archives.push({
                        name: item.replace(/_/g, ' '),
                        path: fullPath,
                        created: stat.birthtime,
                        fileCount: (await fs.readdir(fullPath)).length
                    });
                }
            }
            return archives.sort((a, b) => b.created - a.created);
        } catch (error) {
            console.error('listArchives error:', error);
            return [];
        }
    }
}

module.exports = new ArchiveService();