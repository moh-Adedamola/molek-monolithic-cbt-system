import { useState, useEffect } from 'react';
import { Download, FileText, Filter, TrendingUp, Users, BookOpen, Eye, RefreshCw } from 'lucide-react';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Select from '../../components/common/Select';
import Alert from '../../components/common/Alert';
import Badge from '../../components/common/Badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getClasses, getSubjects, getClassResults, getDashboardStats, exportClassResultsAsText } from '../../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

const ResultsAndAnalytics = () => {
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [stats, setStats] = useState(null);
    const [subjectsByClass, setSubjectsByClass] = useState({});
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [results, setResults] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [activeTab, setActiveTab] = useState('results');

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedClass && subjectsByClass[selectedClass]) {
            setAvailableSubjects(subjectsByClass[selectedClass]);
        } else {
            setAvailableSubjects([]);
        }
    }, [selectedClass, subjectsByClass]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [statsRes, subjectsRes] = await Promise.all([
                getDashboardStats(),
                getSubjects()
            ]);

            setStats(statsRes.data);

            // Handle subjects response - could be .subjects or .subjectsByClass
            const subjectsData = subjectsRes.data.subjects || subjectsRes.data.subjectsByClass || {};
            setSubjectsByClass(subjectsData);

            console.log('📚 Loaded subjects by class:', subjectsData);
        } catch (error) {
            console.error('Load initial data error:', error);
            setAlert({ type: 'error', message: 'Failed to load data' });
        } finally {
            setLoading(false);
        }
    };

    const loadResults = async () => {
        if (!selectedClass) {
            setAlert({ type: 'error', message: 'Please select a class' });
            return;
        }

        try {
            setLoading(true);

            // ✅ FIXED: Call API with class (required) and subject (optional)
            const params = { class: selectedClass };
            if (selectedSubject) {
                params.subject = selectedSubject;
            }

            console.log('📊 Loading results with params:', params);

            const response = await getClassResults(params.class, params.subject);
            const resultList = response.data?.results || [];

            console.log(`✅ Loaded ${resultList.length} results`);

            setResults(resultList);
            generateAnalytics(resultList);

            if (resultList.length > 0) {
                setAlert({ type: 'success', message: `Loaded ${resultList.length} result(s) successfully` });
            } else {
                setAlert({ type: 'info', message: 'No results found for this class/subject' });
            }
        } catch (error) {
            console.error('Load results error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to load results';
            setAlert({ type: 'error', message: errorMessage });
            setResults([]);
            setAnalytics(null);
        } finally {
            setLoading(false);
        }
    };

    const generateAnalytics = (resultList) => {
        if (resultList.length === 0) {
            setAnalytics(null);
            return;
        }

        // Calculate subject performance
        const subjectPerformance = {};
        resultList.forEach(r => {
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

        resultList.forEach(r => {
            const percentage = Math.round((r.score / r.total_questions) * 100);
            if (percentage >= 70) gradeDistribution['A (70-100%)']++;
            else if (percentage >= 60) gradeDistribution['B (60-69%)']++;
            else if (percentage >= 50) gradeDistribution['C (50-59%)']++;
            else if (percentage >= 40) gradeDistribution['D (40-49%)']++;
            else gradeDistribution['F (0-39%)']++;
        });

        const pieData = Object.entries(gradeDistribution)
            .map(([grade, count]) => ({ name: grade, value: count }))
            .filter(d => d.value > 0);

        const totalStudents = resultList.length;
        const averageScore = Math.round(
            resultList.reduce((sum, r) => sum + (r.score / r.total_questions * 100), 0) / totalStudents
        );
        const passRate = Math.round(
            (resultList.filter(r => (r.score / r.total_questions * 100) >= 50).length / totalStudents) * 100
        );
        const excellenceRate = Math.round(
            (resultList.filter(r => (r.score / r.total_questions * 100) >= 70).length / totalStudents) * 100
        );

        setAnalytics({
            chartData,
            pieData,
            totalStudents,
            averageScore,
            passRate,
            excellenceRate
        });
    };

    const handleExportText = async () => {
        if (!selectedClass || !selectedSubject) {
            setAlert({ type: 'error', message: 'Please select both class and subject to export as text' });
            return;
        }

        try {
            console.log('📤 Exporting text:', { class: selectedClass, subject: selectedSubject });

            const response = await exportClassResultsAsText(selectedClass, selectedSubject);

            // Create download
            const blob = new Blob([response.data], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedClass}_${selectedSubject}_results.txt`;
            a.click();
            window.URL.revokeObjectURL(url);

            setAlert({ type: 'success', message: 'Results exported as text successfully' });
        } catch (error) {
            console.error('Export text error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to export results';
            setAlert({ type: 'error', message: errorMessage });
        }
    };

    const handleExportCSV = () => {
        if (results.length === 0) {
            setAlert({ type: 'error', message: 'No results to export' });
            return;
        }

        const csv = [
            ['EXAM RESULTS'],
            [`Class: ${selectedClass}`],
            [`Subject: ${selectedSubject || 'All Subjects'}`],
            [`Generated: ${new Date().toLocaleString()}`],
            [''],
            ['STUDENT RESULTS'],
            ['Name', 'Exam Code', 'Subject', 'Score', 'Total', 'Percentage', 'Grade', 'Submitted At'].join(','),
            ...results.map(r => {
                const fullName = `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.trim();
                const percentage = Math.round((r.score / r.total_questions) * 100);
                const grade = percentage >= 70 ? 'A' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 40 ? 'D' : 'F';
                return [
                    `"${fullName}"`,
                    r.exam_code,
                    r.subject,
                    r.score,
                    r.total_questions,
                    `${percentage}%`,
                    grade,
                    new Date(r.submitted_at).toLocaleString()
                ].join(',');
            })
        ];

        if (analytics) {
            csv.push(
                [''],
                ['SUMMARY STATISTICS'],
                ['Total Students', analytics.totalStudents],
                ['Average Score', `${analytics.averageScore}%`],
                ['Pass Rate', `${analytics.passRate}%`],
                ['Excellence Rate', `${analytics.excellenceRate}%`]
            );
        }

        const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `results_${selectedClass}_${selectedSubject || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        setAlert({ type: 'success', message: 'CSV exported successfully' });
    };

    const getGradeBadge = (percentage) => {
        if (percentage >= 70) return 'success';
        if (percentage >= 50) return 'warning';
        return 'error';
    };

    const columns = [
        {
            key: 'name',
            label: 'Student Name',
            render: (_, row) => {
                const fullName = `${row.first_name} ${row.middle_name || ''} ${row.last_name}`.trim();
                return (
                    <div>
                        <p className="font-medium text-gray-900">{fullName}</p>
                        <p className="text-sm text-gray-500">{row.exam_code}</p>
                    </div>
                );
            },
        },
        {
            key: 'subject',
            label: 'Subject',
            render: (value) => <Badge variant="info">{value}</Badge>,
        },
        {
            key: 'score',
            label: 'Score',
            render: (value, row) => {
                const percentage = Math.round((row.score / row.total_questions) * 100);
                return (
                    <div>
                        <p className="font-medium">{row.score}/{row.total_questions}</p>
                        <Badge variant={getGradeBadge(percentage)} size="sm">
                            {percentage}%
                        </Badge>
                    </div>
                );
            },
        },
        {
            key: 'submitted_at',
            label: 'Submitted',
            render: (value) => {
                const date = new Date(value);
                return (
                    <div className="text-sm text-gray-600">
                        <p>{date.toLocaleDateString()}</p>
                        <p className="text-xs">{date.toLocaleTimeString()}</p>
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-6">
            {alert && (
                <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Results & Analytics</h1>
                    <p className="mt-1 text-sm text-gray-600">View results and generate performance analytics</p>
                </div>
            </div>

            {/* System Overview */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card title="Total Students" value={stats.totalStudents} icon={Users} />
                    <Card title="Total Exams" value={stats.totalExams} icon={BookOpen} />
                    <Card title="Active Exams" value={stats.activeExams} icon={TrendingUp} />
                    <Card title="Submissions" value={stats.totalSubmissions || stats.completedExams || 0} icon={FileText} />
                </div>
            )}

            {/* Filters */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold">Select Class & Subject</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                        label="Class"
                        value={selectedClass}
                        onChange={(e) => {
                            setSelectedClass(e.target.value);
                            setSelectedSubject('');
                            setResults([]);
                            setAnalytics(null);
                        }}
                        options={[
                            { value: '', label: 'Select Class' },
                            ...CLASS_LEVELS.map(c => ({ value: c, label: c }))
                        ]}
                        required
                    />
                    <Select
                        label="Subject (Optional)"
                        value={selectedSubject}
                        onChange={(e) => {
                            setSelectedSubject(e.target.value);
                        }}
                        options={[
                            { value: '', label: 'All Subjects' },
                            ...availableSubjects.map(s => ({ value: s, label: s }))
                        ]}
                        disabled={!selectedClass}
                    />
                    <div className="flex items-end gap-2">
                        <Button
                            onClick={loadResults}
                            disabled={!selectedClass || loading}
                            className="flex-1"
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <TrendingUp className="mr-2 h-4 w-4" />
                                    Load Results
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Tabs */}
            {results.length > 0 && (
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex gap-8">
                        <button
                            onClick={() => setActiveTab('results')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === 'results'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <Eye className="inline-block mr-2 h-4 w-4" />
                            View Results ({results.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === 'analytics'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <TrendingUp className="inline-block mr-2 h-4 w-4" />
                            Analytics
                        </button>
                    </nav>
                </div>
            )}

            {/* Results Tab */}
            {results.length > 0 && activeTab === 'results' && (
                <>
                    {/* Export Buttons */}
                    <Card>
                        <div className="flex flex-wrap gap-3">
                            <Button
                                variant="outline"
                                onClick={handleExportText}
                                disabled={!selectedSubject}
                            >
                                <FileText className="mr-2 h-4 w-4" />
                                Export as Text {!selectedSubject && '(Select subject)'}
                            </Button>
                            <Button variant="outline" onClick={handleExportCSV}>
                                <Download className="mr-2 h-4 w-4" />
                                Export as CSV
                            </Button>
                        </div>
                    </Card>

                    {/* Results Table */}
                    <div className="card">
                        <Table
                            columns={columns}
                            data={results}
                            loading={loading}
                            emptyMessage="No results found"
                        />
                    </div>

                    {/* Quick Stats */}
                    {analytics && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <Card title="Total Students" value={analytics.totalStudents} />
                            <Card title="Average Score" value={`${analytics.averageScore}%`} />
                            <Card title="Pass Rate" value={`${analytics.passRate}%`} subtitle="≥50% passing" />
                            <Card title="Excellence Rate" value={`${analytics.excellenceRate}%`} subtitle="≥70% excellent" />
                        </div>
                    )}
                </>
            )}

            {/* Analytics Tab */}
            {results.length > 0 && activeTab === 'analytics' && analytics && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card title="Total Students" value={analytics.totalStudents} subtitle="Took the exam" />
                        <Card title="Average Score" value={`${analytics.averageScore}%`} subtitle="Class average" />
                        <Card title="Pass Rate" value={`${analytics.passRate}%`} subtitle="≥50% passing" />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Subject Performance */}
                        <Card title="Subject Performance">
                            {analytics.chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={analytics.chartData}>
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
                            {analytics.pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={analytics.pieData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => `${entry.name}: ${entry.value}`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {analytics.pieData.map((entry, index) => (
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

            {/* Empty State */}
            {results.length === 0 && (
                <Card>
                    <div className="text-center py-12">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">No results loaded</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Select a class and click "Load Results" to view exam results and analytics.
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                            Subject filter is optional - leave empty to see all subjects.
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default ResultsAndAnalytics;