import { useState, useEffect } from 'react';
import { Download, FileText, TrendingUp, Users, BookOpen } from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Select from '../../components/common/Select';
import Alert from '../../components/common/Alert';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getClasses, getSubjects, getClassResults, getDashboardStats } from '../../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Reports = () => {
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [stats, setStats] = useState(null);
    const [classes, setClasses] = useState([]);
    const [subjectsByClass, setSubjectsByClass] = useState({});
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [reportData, setReportData] = useState(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [statsRes, classesRes, subjectsRes] = await Promise.all([
                getDashboardStats(),
                getClasses(),
                getSubjects()
            ]);

            setStats(statsRes.data);
            setClasses(classesRes.data.classes || []);
            setSubjectsByClass(subjectsRes.data.subjects || {});
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to load data' });
        } finally {
            setLoading(false);
        }
    };

    const generateReport = async () => {
        if (!selectedClass) {
            setAlert({ type: 'error', message: 'Please select a class' });
            return;
        }

        try {
            setLoading(true);
            const response = await getClassResults(selectedClass);
            const results = response.data.results || [];

            // Filter by subject if selected
            const filteredResults = selectedSubject
                ? results.filter(r => r.subject === selectedSubject)
                : results;

            // Calculate analytics
            const subjectPerformance = {};
            filteredResults.forEach(r => {
                if (!subjectPerformance[r.subject]) {
                    subjectPerformance[r.subject] = { total: 0, count: 0, scores: [] };
                }
                const percentage = Math.round((r.score / r.total_questions) * 100);
                subjectPerformance[r.subject].total += percentage;
                subjectPerformance[r.subject].count += 1;
                subjectPerformance[r.subject].scores.push(percentage);
            });

            const chartData = Object.entries(subjectPerformance).map(([subject, data]) => ({
                subject,
                average: Math.round(data.total / data.count),
                students: data.count
            }));

            // Grade distribution
            const gradeDistribution = {
                'A (70-100%)': 0,
                'B (60-69%)': 0,
                'C (50-59%)': 0,
                'D (40-49%)': 0,
                'F (0-39%)': 0
            };

            filteredResults.forEach(r => {
                const percentage = Math.round((r.score / r.total_questions) * 100);
                if (percentage >= 70) gradeDistribution['A (70-100%)']++;
                else if (percentage >= 60) gradeDistribution['B (60-69%)']++;
                else if (percentage >= 50) gradeDistribution['C (50-59%)']++;
                else if (percentage >= 40) gradeDistribution['D (40-49%)']++;
                else gradeDistribution['F (0-39%)']++;
            });

            const pieData = Object.entries(gradeDistribution).map(([grade, count]) => ({
                name: grade,
                value: count
            })).filter(d => d.value > 0);

            setReportData({
                results: filteredResults,
                chartData,
                pieData,
                totalStudents: filteredResults.length,
                averageScore: Math.round(filteredResults.reduce((sum, r) =>
                    sum + (r.score / r.total_questions * 100), 0) / filteredResults.length),
                passRate: Math.round((filteredResults.filter(r =>
                    (r.score / r.total_questions * 100) >= 50).length / filteredResults.length) * 100)
            });

            setAlert({ type: 'success', message: 'Report generated successfully' });
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to generate report' });
        } finally {
            setLoading(false);
        }
    };

    const exportReport = () => {
        if (!reportData) return;

        const csv = [
            ['PERFORMANCE REPORT'],
            [`Class: ${selectedClass}`],
            [`Subject: ${selectedSubject || 'All Subjects'}`],
            [`Generated: ${new Date().toLocaleString()}`],
            [''],
            ['SUMMARY'],
            [`Total Students: ${reportData.totalStudents}`],
            [`Average Score: ${reportData.averageScore}%`],
            [`Pass Rate: ${reportData.passRate}%`],
            [''],
            ['STUDENT RESULTS'],
            ['Name', 'Subject', 'Score', 'Total', 'Percentage', 'Submitted At'].join(','),
            ...reportData.results.map(r => [
                `${r.first_name} ${r.last_name}`,
                r.subject,
                r.score,
                r.total_questions,
                `${Math.round((r.score / r.total_questions) * 100)}%`,
                new Date(r.submitted_at).toLocaleString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${selectedClass}_${selectedSubject || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const availableSubjects = selectedClass ? (subjectsByClass[selectedClass] || []) : [];

    return (
        <div className="space-y-6">
            {alert && (
                <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                    <p className="mt-1 text-sm text-gray-600">Generate performance reports and analytics</p>
                </div>
            </div>

            {/* System Overview */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card title="Total Students" value={stats.totalStudents} icon={Users} />
                    <Card title="Total Exams" value={stats.totalExams} icon={BookOpen} />
                    <Card title="Active Exams" value={stats.activeExams} icon={TrendingUp} />
                    <Card title="Submissions" value={stats.completedExams} icon={FileText} />
                </div>
            )}

            {/* Report Generator */}
            <Card>
                <h3 className="text-lg font-semibold mb-4">Generate Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                        label="Class"
                        value={selectedClass}
                        onChange={(e) => {
                            setSelectedClass(e.target.value);
                            setSelectedSubject('');
                            setReportData(null);
                        }}
                        options={[
                            { value: '', label: 'Select Class' },
                            ...classes.map(c => ({
                                value: typeof c === 'string' ? c : c.class,
                                label: typeof c === 'string' ? c : c.class
                            }))
                        ]}
                        required
                    />
                    <Select
                        label="Subject"
                        value={selectedSubject}
                        onChange={(e) => {
                            setSelectedSubject(e.target.value);
                            setReportData(null);
                        }}
                        options={[
                            { value: '', label: 'All Subjects' },
                            ...availableSubjects.map(s => ({ value: s, label: s }))
                        ]}
                        disabled={!selectedClass}
                    />
                    <div className="flex items-end gap-2">
                        <Button
                            onClick={generateReport}
                            disabled={!selectedClass || loading}
                            className="flex-1"
                        >
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Generate Report
                        </Button>
                        {reportData && (
                            <Button
                                onClick={exportReport}
                                variant="outline"
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Report Results */}
            {reportData && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card
                            title="Total Students"
                            value={reportData.totalStudents}
                            subtitle="Took the exam"
                        />
                        <Card
                            title="Average Score"
                            value={`${reportData.averageScore}%`}
                            subtitle="Class average"
                        />
                        <Card
                            title="Pass Rate"
                            value={`${reportData.passRate}%`}
                            subtitle="≥50% passing"
                        />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Subject Performance */}
                        <Card title="Subject Performance">
                            {reportData.chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={reportData.chartData}>
                                        <XAxis dataKey="subject" />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip />
                                        <Bar dataKey="average" fill="#3b82f6" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-gray-500 py-8">No data available</p>
                            )}
                        </Card>

                        {/* Grade Distribution */}
                        <Card title="Grade Distribution">
                            {reportData.pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={reportData.pieData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => `${entry.name}: ${entry.value}`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {reportData.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-gray-500 py-8">No data available</p>
                            )}
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
};

export default Reports;