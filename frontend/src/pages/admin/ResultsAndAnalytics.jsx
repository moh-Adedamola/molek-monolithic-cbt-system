import { useState, useEffect } from 'react';
import { Download, FileText, Filter, TrendingUp, Users, Award, X } from 'lucide-react';
import { getClassResults, exportClassResultsAsText, getSubjects, getSystemSettings } from '../../services/api';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ResultsAndAnalytics() {
    const [activeTab, setActiveTab] = useState('results');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [results, setResults] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [subjectsByClass, setSubjectsByClass] = useState({});
    const [allSubjects, setAllSubjects] = useState([]);

    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        try {
            const res = await getSubjects();
            const subjects = res.data?.subjects || {};
            setSubjectsByClass(subjects);

            // Get unique list of all subjects across all classes
            const uniqueSubjects = [...new Set(Object.values(subjects).flat())];
            setAllSubjects(uniqueSubjects.sort());

            console.log('📚 Loaded subjects by class:', subjects);
            console.log('📚 All unique subjects:', uniqueSubjects);
            console.log('📚 Subject state set!');
        } catch (error) {
            console.error('❌ Failed to load subjects:', error);
        }
    };

    const handleLoadResults = async () => {
        setLoading(true);
        setAlert(null);

        try {
            // ✅ FIX: Convert empty strings to null
            const classParam = selectedClass && selectedClass.trim() !== '' ? selectedClass : null;
            const subjectParam = selectedSubject && selectedSubject.trim() !== '' ? selectedSubject : null;

            console.log('🔍 Loading with filters:', {
                selectedClass,
                selectedSubject,
                classParam,
                subjectParam
            });

            const res = await getClassResults(classParam, subjectParam);

            console.log('📦 Received results:', res.data.results?.length || 0);

            if (!res.data.results || res.data.results.length === 0) {
                setAlert({
                    type: 'info',
                    message: 'No results found for the selected filters.'
                });
                setResults([]);
                setAnalytics(null);
                return;
            }

            // ✅ FIX: Filter out incomplete submissions (null scores)
            const completeResults = res.data.results.filter(r => {
                const isComplete = r.score !== null &&
                    r.score !== undefined &&
                    r.total_questions !== null &&
                    r.total_questions !== undefined &&
                    r.total_questions > 0;

                if (!isComplete) {
                    console.log('⚠️ Skipping incomplete:', r.subject, r.first_name);
                }

                return isComplete;
            });

            console.log('✅ Complete results:', completeResults.length);

            if (completeResults.length === 0) {
                setAlert({
                    type: 'warning',
                    message: `Found ${res.data.results.length} submission(s) but none are completed yet.`
                });
                setResults([]);
                setAnalytics(null);
                return;
            }

            setResults(completeResults);
            calculateAnalytics(completeResults);

            let filterMsg = 'All Results';
            if (classParam && subjectParam) {
                filterMsg = `${classParam} - ${subjectParam}`;
            } else if (classParam) {
                filterMsg = `${classParam} (All Subjects)`;
            } else if (subjectParam) {
                filterMsg = `${subjectParam} (All Classes)`;
            }

            setAlert({
                type: 'success',
                message: `Loaded ${completeResults.length} completed result(s) for: ${filterMsg}`
            });
        } catch (error) {
            console.error('❌ Load results error:', error);
            setAlert({
                type: 'error',
                message: error.response?.data?.error || 'Failed to load results'
            });
        } finally {
            setLoading(false);
        }
    };

    const calculateAnalytics = (data) => {
        console.log('📊 calculateAnalytics called with:', data.length, 'results');

        if (!data || data.length === 0) {
            setAnalytics(null);
            return;
        }

        // ✅ FIX: Double-check for valid data
        const validData = data.filter(r => {
            const isValid = r.score != null &&
                r.score !== undefined &&
                r.total_questions != null &&
                r.total_questions !== undefined &&
                r.total_questions > 0;

            if (!isValid) {
                console.log('⚠️ Invalid data in analytics:', r);
            }

            return isValid;
        });

        console.log('✅ Valid data for analytics:', validData.length);

        if (validData.length === 0) {
            setAnalytics(null);
            return;
        }

        const totalStudents = validData.length;
        const avgScore = Math.round(
            validData.reduce((sum, r) => sum + ((r.score / r.total_questions) * 100), 0) / totalStudents
        );

        const passCount = validData.filter(r => ((r.score / r.total_questions) * 100) >= 50).length;
        const passRate = Math.round((passCount / totalStudents) * 100);

        const excellenceCount = validData.filter(r => ((r.score / r.total_questions) * 100) >= 70).length;
        const excellenceRate = Math.round((excellenceCount / totalStudents) * 100);

        // ✅ FIX: Subject performance - group ALL subjects
        const subjectPerformance = {};
        validData.forEach(r => {
            const subject = r.subject || 'Unknown';
            if (!subjectPerformance[subject]) {
                subjectPerformance[subject] = { total: 0, scores: [] };
            }
            subjectPerformance[subject].total++;
            const percentage = (r.score / r.total_questions) * 100;
            subjectPerformance[subject].scores.push(percentage);

            console.log('📝 Adding to', subject, ':', percentage.toFixed(1) + '%');
        });

        console.log('📊 Subject Performance:', subjectPerformance);

        const subjectChartData = Object.entries(subjectPerformance).map(([subject, data]) => {
            const average = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);
            console.log('📈 Chart data for', subject, ':', average + '%');
            return {
                subject,
                average,
                students: data.total
            };
        });

        console.log('📊 Final chart data:', subjectChartData);

        // Grade distribution
        const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        validData.forEach(r => {
            const percentage = (r.score / r.total_questions) * 100;
            if (percentage >= 70) gradeDistribution.A++;
            else if (percentage >= 60) gradeDistribution.B++;
            else if (percentage >= 50) gradeDistribution.C++;
            else if (percentage >= 40) gradeDistribution.D++;
            else gradeDistribution.F++;
        });

        const gradeChartData = Object.entries(gradeDistribution)
            .filter(([_, count]) => count > 0)
            .map(([grade, count]) => ({ grade, count }));

        console.log('✅ Analytics completed:', {
            totalStudents,
            avgScore,
            subjects: Object.keys(subjectPerformance),
            chartDataPoints: subjectChartData.length
        });

        setAnalytics({
            totalStudents,
            averageScore: avgScore,
            passRate,
            passCount,
            excellenceRate,
            excellenceCount,
            subjectChartData,
            gradeChartData
        });
    };

    const handleExportText = async () => {
        if (!selectedClass || !selectedSubject) {
            setAlert({
                type: 'error',
                message: 'Please select both Class and Subject for text export'
            });
            return;
        }

        try {
            const response = await exportClassResultsAsText(selectedClass, selectedSubject);
            const blob = new Blob([response.data], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedClass}_${selectedSubject}_results.txt`;
            a.click();
            window.URL.revokeObjectURL(url);
            setAlert({ type: 'success', message: 'Text file exported successfully' });
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to export text file' });
        }
    };

    const handleExportCSV = async () => {
        if (results.length === 0) {
            setAlert({ type: 'error', message: 'No results to export' });
            return;
        }

        try {
            const settings = await getSystemSettings();
            const settingsData = settings.data.settings;

            const csv = [
                ['EXAM RESULTS'],
                [`School: ${settingsData.schoolName}`],
                [`Academic Session: ${settingsData.academicSession}`],
                [`Term: ${settingsData.currentTerm}`],
                [`Filter: ${selectedClass || 'All Classes'} - ${selectedSubject || 'All Subjects'}`],
                [`Generated: ${new Date().toLocaleString()}`],
                [''],
                ['STUDENT RESULTS'],
                ['Name', 'Exam Code', 'Class', 'Subject', 'Score', 'Total', 'Percentage', 'Grade', 'Submitted At'].join(','),
                ...results.map(r => {
                    const fullName = `${r.first_name} ${r.middle_name || ''} ${r.last_name}`.trim();
                    const percentage = Math.round((r.score / r.total_questions) * 100);
                    const grade = percentage >= 70 ? 'A' :
                        percentage >= 60 ? 'B' :
                            percentage >= 50 ? 'C' :
                                percentage >= 40 ? 'D' : 'F';
                    return [
                        `"${fullName}"`,
                        r.exam_code,
                        r.class,
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
            const filename = `results_${selectedClass || 'all'}_${selectedSubject || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);

            setAlert({ type: 'success', message: 'CSV exported successfully' });
        } catch (error) {
            console.error('Export CSV error:', error);
            setAlert({ type: 'error', message: 'Failed to export CSV' });
        }
    };

    const handleClearFilters = () => {
        setSelectedClass('');
        setSelectedSubject('');
        setResults([]);
        setAnalytics(null);
    };

    const getAvailableSubjects = () => {
        if (selectedClass && subjectsByClass[selectedClass]) {
            return subjectsByClass[selectedClass];
        }
        return allSubjects;
    };

    return (
        <div className="space-y-6">
            {alert && (
                <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            )}

            <div>
                <h1 className="text-2xl font-bold text-gray-900">Results & Analytics</h1>
                <p className="mt-1 text-sm text-gray-600">
                    View, analyze, and export exam results with flexible filtering
                </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('results')}
                        className={`${
                            activeTab === 'results'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        View Results
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`${
                            activeTab === 'analytics'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        disabled={!analytics}
                    >
                        Analytics
                    </button>
                </nav>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Filters</h3>
                    {(selectedClass || selectedSubject) && (
                        <button
                            onClick={handleClearFilters}
                            className="ml-auto text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                        >
                            <X className="h-4 w-4" />
                            Clear Filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Class (Optional)
                        </label>
                        <select
                            value={selectedClass}
                            onChange={(e) => {
                                setSelectedClass(e.target.value);
                                // Clear subject if selected class doesn't have it
                                if (e.target.value && subjectsByClass[e.target.value] &&
                                    selectedSubject && !subjectsByClass[e.target.value].includes(selectedSubject)) {
                                    setSelectedSubject('');
                                }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Classes</option>
                            {CLASS_LEVELS.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subject (Optional)
                        </label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => {
                                const newSubject = e.target.value;
                                console.log('📝 Subject dropdown changed to:', newSubject);
                                console.log('📝 Current state - selectedClass:', selectedClass);
                                console.log('📝 Available subjects:', getAvailableSubjects());
                                setSelectedSubject(newSubject);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Subjects</option>
                            {getAvailableSubjects().map(subj => (
                                <option key={subj} value={subj}>{subj}</option>
                            ))}
                        </select>
                        {selectedClass && getAvailableSubjects().length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                {getAvailableSubjects().length} subject(s) available
                                {selectedSubject && selectedSubject !== '' && ` | Selected: ${selectedSubject}`}
                            </p>
                        )}
                        {!selectedClass && allSubjects.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                Showing all {allSubjects.length} subjects from all classes
                            </p>
                        )}
                    </div>

                    <div className="flex items-end">
                        <Button
                            onClick={handleLoadResults}
                            loading={loading}
                            className="w-full"
                        >
                            Generate Report
                        </Button>
                    </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                        💡 <strong>Tip:</strong> You can filter by class only, subject only, both, or leave both empty to see all results
                    </p>
                </div>
            </Card>

            {/* Results Tab */}
            {activeTab === 'results' && results.length > 0 && (
                <>
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Students</p>
                                    <p className="text-2xl font-bold text-gray-900">{analytics?.totalStudents || 0}</p>
                                </div>
                                <Users className="h-10 w-10 text-blue-600" />
                            </div>
                        </Card>

                        <Card>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Average Score</p>
                                    <p className="text-2xl font-bold text-gray-900">{analytics?.averageScore || 0}%</p>
                                </div>
                                <TrendingUp className="h-10 w-10 text-green-600" />
                            </div>
                        </Card>

                        <Card>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Pass Rate</p>
                                    <p className="text-2xl font-bold text-gray-900">{analytics?.passRate || 0}%</p>
                                </div>
                                <Award className="h-10 w-10 text-purple-600" />
                            </div>
                        </Card>

                        <Card>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Excellence Rate</p>
                                    <p className="text-2xl font-bold text-gray-900">{analytics?.excellenceRate || 0}%</p>
                                </div>
                                <Award className="h-10 w-10 text-yellow-600" />
                            </div>
                        </Card>
                    </div>

                    {/* Export Buttons */}
                    <Card>
                        <div className="flex flex-wrap gap-3">
                            <Button onClick={handleExportCSV} variant="secondary">
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                            <Button
                                onClick={handleExportText}
                                variant="secondary"
                                disabled={!selectedClass || !selectedSubject}
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Export Text
                                {(!selectedClass || !selectedSubject) && (
                                    <span className="text-xs ml-2">(Requires both filters)</span>
                                )}
                            </Button>
                        </div>
                    </Card>

                    {/* Results Table */}
                    <Card>
                        <h3 className="font-semibold text-gray-900 mb-4">Results</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {results.map((result, idx) => {
                                    const fullName = `${result.first_name} ${result.middle_name || ''} ${result.last_name}`.trim();
                                    const percentage = Math.round((result.score / result.total_questions) * 100);
                                    const grade = percentage >= 70 ? 'A' :
                                        percentage >= 60 ? 'B' :
                                            percentage >= 50 ? 'C' :
                                                percentage >= 40 ? 'D' : 'F';
                                    return (
                                        <tr key={idx}>
                                            <td className="px-4 py-3 text-sm text-gray-900">{fullName}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{result.class}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{result.subject}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{result.score}/{result.total_questions}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{percentage}%</td>
                                            <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                                        grade === 'A' ? 'bg-green-100 text-green-800' :
                                                            grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                                                grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                                                    grade === 'D' ? 'bg-orange-100 text-orange-800' :
                                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {grade}
                                                    </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && analytics && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <p className="text-sm text-gray-600 mb-1">Total Students</p>
                            <p className="text-3xl font-bold text-blue-600">{analytics.totalStudents}</p>
                        </Card>
                        <Card>
                            <p className="text-sm text-gray-600 mb-1">Average Score</p>
                            <p className="text-3xl font-bold text-green-600">{analytics.averageScore}%</p>
                        </Card>
                        <Card>
                            <p className="text-sm text-gray-600 mb-1">Passed (≥50%)</p>
                            <p className="text-3xl font-bold text-purple-600">{analytics.passCount}/{analytics.totalStudents}</p>
                            <p className="text-xs text-gray-500 mt-1">{analytics.passRate}% pass rate</p>
                        </Card>
                        <Card>
                            <p className="text-sm text-gray-600 mb-1">Excellent (≥70%)</p>
                            <p className="text-3xl font-bold text-yellow-600">{analytics.excellenceCount}/{analytics.totalStudents}</p>
                            <p className="text-xs text-gray-500 mt-1">{analytics.excellenceRate}% excellence rate</p>
                        </Card>
                    </div>

                    {/* Charts */}
                    {analytics.subjectChartData.length > 0 && (
                        <Card>
                            <h3 className="font-semibold text-gray-900 mb-4">Subject Performance</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analytics.subjectChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="subject" />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="average" fill="#3b82f6" name="Average Score (%)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    )}

                    {analytics.gradeChartData.length > 0 && (
                        <Card>
                            <h3 className="font-semibold text-gray-900 mb-4">Grade Distribution</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={analytics.gradeChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ grade, count }) => `${grade}: ${count}`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="count"
                                    >
                                        {analytics.gradeChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    )}
                </>
            )}

            {/* Empty State */}
            {results.length === 0 && !loading && (
                <Card>
                    <div className="text-center py-12">
                        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
                        <p className="text-gray-600 mb-4">
                            Select your filters and click "Load Results" to view exam results and analytics
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}