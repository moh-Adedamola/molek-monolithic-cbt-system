import { useState, useEffect } from 'react';
import { Download, FileText, Filter, Users, TrendingUp, Award, Loader2, Info } from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Select from '../../components/common/Select';
import Table from '../../components/common/Table';
import Alert from '../../components/common/Alert';
import { getClassResults, exportResultsToDjango, exportClassResults, getSubjects } from '../../services/api';

/**
 * Nigerian School Grading Format:
 * - CA1: 15 marks
 * - CA2: 15 marks
 * - OBJ/CBT: 30 marks (THIS IS WHAT CBT EXPORTS)
 * - Theory: 40 marks
 * - Total: 100 marks
 * 
 * Grading Scale:
 * A: 75-100 (Excellent)
 * B: 70-74 (Very Good)
 * C: 60-69 (Good)
 * D: 50-59 (Pass)
 * E: 45-49 (Fair)
 * F: 0-44 (Fail)
 */

export default function ResultsAndAnalytics() {
    const [results, setResults] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [alert, setAlert] = useState(null);

    const [filters, setFilters] = useState({
        class: '',
        subject: ''
    });

    const classLevels = [
        { value: '', label: 'All Classes' },
        { value: 'JSS1', label: 'JSS1' },
        { value: 'JSS2', label: 'JSS2' },
        { value: 'JSS3', label: 'JSS3' },
        { value: 'SS1', label: 'SS1' },
        { value: 'SS2', label: 'SS2' },
        { value: 'SS3', label: 'SS3' }
    ];

    useEffect(() => {
        loadSubjects();
    }, []);

    useEffect(() => {
        loadResults();
    }, [filters]);

    const loadSubjects = async () => {
        try {
            const res = await getSubjects();
            const subjectList = res.data.subjects || [];
            setSubjects([
                { value: '', label: 'All Subjects' },
                ...subjectList.map(s => ({ value: s, label: s }))
            ]);
        } catch (error) {
            console.error('Failed to load subjects:', error);
        }
    };

    const loadResults = async () => {
        try {
            setLoading(true);
            const res = await getClassResults(filters.class, filters.subject);
            setResults(res.data.results || []);
        } catch (error) {
            console.error('Failed to load results:', error);
            setAlert({ type: 'error', message: 'Failed to load results' });
        } finally {
            setLoading(false);
        }
    };

    const handleExportToDjango = async () => {
        try {
            setExporting(true);
            setAlert(null);

            if (results.length === 0) {
                setAlert({ type: 'error', message: 'No results to export' });
                return;
            }

            const response = await exportResultsToDjango(filters.class, filters.subject);

            // Create download link
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            const filename = filters.class && filters.subject
                ? `${filters.class}_${filters.subject}_obj_scores.csv`
                : 'obj_scores_for_django.csv';

            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setAlert({
                type: 'success',
                message: 'OBJ scores exported! Upload to Django Admin → Import OBJ/CBT Scores'
            });
        } catch (error) {
            console.error('Export to Django error:', error);
            setAlert({
                type: 'error',
                message: error.response?.data?.error || 'Failed to export results'
            });
        } finally {
            setExporting(false);
        }
    };

    const handleExportReport = async () => {
        try {
            if (!filters.class || !filters.subject) {
                setAlert({
                    type: 'error',
                    message: 'Please select both class and subject for text report export'
                });
                return;
            }

            const response = await exportClassResults(filters.class, filters.subject);

            // Create download link
            const blob = new Blob([response.data], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filters.class}_${filters.subject}_report.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setAlert({ type: 'success', message: 'Report exported successfully' });
        } catch (error) {
            console.error('Export report error:', error);
            setAlert({ type: 'error', message: 'Failed to export report' });
        }
    };

    // Nigerian grading function
    const getNigerianGrade = (percentage) => {
        if (percentage >= 75) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' };
        if (percentage >= 70) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' };
        if (percentage >= 60) return { grade: 'C', color: 'text-cyan-600', bg: 'bg-cyan-100' };
        if (percentage >= 50) return { grade: 'D', color: 'text-yellow-600', bg: 'bg-yellow-100' };
        if (percentage >= 45) return { grade: 'E', color: 'text-orange-600', bg: 'bg-orange-100' };
        return { grade: 'F', color: 'text-red-600', bg: 'bg-red-100' };
    };

    const calculateStats = () => {
        if (results.length === 0) return null;

        const totalStudents = results.length;
        const scores = results.map(r => {
            const totalPoints = r.total_questions;
            return (r.score / totalPoints) * 100;
        });

        const average = scores.reduce((a, b) => a + b, 0) / totalStudents;
        const passed = scores.filter(s => s >= 45).length; // Nigerian pass mark (E grade)
        const excellent = scores.filter(s => s >= 75).length; // A grade
        const highest = Math.max(...scores);
        const lowest = Math.min(...scores);

        return {
            totalStudents,
            average: Math.round(average),
            passRate: Math.round((passed / totalStudents) * 100),
            excellenceRate: Math.round((excellent / totalStudents) * 100),
            highest: Math.round(highest),
            lowest: Math.round(lowest)
        };
    };

    const stats = calculateStats();

    const columns = [
        {
            key: 'admission_number',
            label: 'Admission No.',
            render: (val) => <span className="font-mono">{val}</span>
        },
        {
            key: 'first_name',
            label: 'Name',
            render: (val, row) => {
                const fullName = `${row.first_name} ${row.middle_name || ''} ${row.last_name}`.trim();
                return <span className="font-medium">{fullName}</span>;
            }
        },
        {
            key: 'class',
            label: 'Class',
            render: (val) => <span className="font-semibold">{val}</span>
        },
        {
            key: 'subject',
            label: 'Subject'
        },
        {
            key: 'score',
            label: 'Raw Score',
            render: (val, row) => (
                <span className="font-semibold">{val}/{row.total_questions}</span>
            )
        },
        {
            key: 'obj_score',
            label: 'OBJ (30)',
            render: (val, row) => {
                const objScore = row.obj_score || Math.round((row.score / row.total_questions) * 30);
                return (
                    <span className="font-bold text-blue-600">{objScore}/30</span>
                );
            }
        },
        {
            key: 'percentage',
            label: '%',
            render: (val, row) => {
                const pct = row.percentage || Math.round((row.score / row.total_questions) * 100);
                const gradeInfo = getNigerianGrade(pct);
                return (
                    <div className="flex items-center gap-2">
                        <span>{pct}%</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${gradeInfo.bg} ${gradeInfo.color}`}>
                            {gradeInfo.grade}
                        </span>
                    </div>
                );
            }
        },
        {
            key: 'submitted_at',
            label: 'Submitted',
            render: (val) => new Date(val).toLocaleString()
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Results & Analytics</h1>
                    <p className="text-gray-600 mt-1">View and export CBT exam results (OBJ Component - 30 marks)</p>
                </div>
            </div>

            {alert && (
                <Alert
                    type={alert.type}
                    message={alert.message}
                    onClose={() => setAlert(null)}
                />
            )}

            {/* Nigerian Grading Info */}
            <Card>
                <div className="p-4 bg-blue-50 border-l-4 border-blue-500">
                    <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-blue-900">Nigerian School Grading Structure</h3>
                            <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
                                <div className="bg-white p-2 rounded text-center border border-blue-200">
                                    <span className="font-bold">CA1</span>: 15 marks
                                </div>
                                <div className="bg-white p-2 rounded text-center border border-blue-200">
                                    <span className="font-bold">CA2</span>: 15 marks
                                </div>
                                <div className="bg-blue-100 p-2 rounded text-center border-2 border-blue-400">
                                    <span className="font-bold">OBJ/CBT</span>: 30 marks ✓
                                </div>
                                <div className="bg-white p-2 rounded text-center border border-blue-200">
                                    <span className="font-bold">Theory</span>: 40 marks
                                </div>
                            </div>
                            <p className="text-xs text-blue-700 mt-2">
                                This CBT system exports the OBJ (Objective) component. Total = 100 marks.
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Filters */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Filter className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Class"
                            value={filters.class}
                            onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                            options={classLevels}
                        />
                        <Select
                            label="Subject"
                            value={filters.subject}
                            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                            options={subjects}
                        />
                    </div>
                </div>
            </Card>

            {/* Statistics */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <div className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Total Students</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <TrendingUp className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Average Score</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.average}%</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Award className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Pass Rate (≥45%)</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.passRate}%</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <Award className="h-6 w-6 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Excellence (A Grade)</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.excellenceRate}%</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Export Actions */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Download className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Export Options</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="primary"
                            onClick={handleExportToDjango}
                            disabled={exporting || results.length === 0}
                        >
                            {exporting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export OBJ Scores (CSV)
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleExportReport}
                            disabled={!filters.class || !filters.subject || results.length === 0}
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Export Text Report
                        </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                        <strong>CSV Format:</strong> admission_number, subject, obj_score, total_questions
                    </p>
                </div>
            </Card>

            {/* Results Table */}
            <Card>
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Results</h2>
                    <Table
                        columns={columns}
                        data={results}
                        loading={loading}
                        emptyMessage="No results found. Select filters above to view results."
                    />
                </div>
            </Card>

            {/* Django Import Instructions */}
            <Card>
                <div className="p-6 bg-green-50">
                    <h3 className="font-semibold text-green-900 mb-3">📥 Django Import Instructions:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
                        <li><strong>First:</strong> Upload CA Scores (CA1 + CA2) in Django Admin</li>
                        <li><strong>Second:</strong> Export OBJ scores from this page using "Export OBJ Scores (CSV)"</li>
                        <li><strong>Third:</strong> In Django Admin → Exam Results → Import OBJ/CBT Scores → Upload CSV</li>
                        <li><strong>Fourth:</strong> Upload Theory scores after manual marking</li>
                        <li><strong>Finally:</strong> Recalculate positions in Django to generate class rankings</li>
                    </ol>
                    <div className="mt-4 p-3 bg-white rounded border border-green-200">
                        <p className="text-xs text-green-700">
                            <strong>CSV Format:</strong> admission_number,subject,obj_score,total_questions<br/>
                            <strong>Example:</strong> MOL/2026/001,Mathematics,25,30
                        </p>
                    </div>
                </div>
            </Card>

            {/* Grading Scale Reference */}
            <Card>
                <div className="p-6 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-3">📊 Nigerian Grading Scale:</h3>
                    <div className="grid grid-cols-6 gap-2 text-center text-sm">
                        <div className="bg-green-100 text-green-800 p-2 rounded">
                            <span className="font-bold">A</span><br/>75-100
                        </div>
                        <div className="bg-blue-100 text-blue-800 p-2 rounded">
                            <span className="font-bold">B</span><br/>70-74
                        </div>
                        <div className="bg-cyan-100 text-cyan-800 p-2 rounded">
                            <span className="font-bold">C</span><br/>60-69
                        </div>
                        <div className="bg-yellow-100 text-yellow-800 p-2 rounded">
                            <span className="font-bold">D</span><br/>50-59
                        </div>
                        <div className="bg-orange-100 text-orange-800 p-2 rounded">
                            <span className="font-bold">E</span><br/>45-49
                        </div>
                        <div className="bg-red-100 text-red-800 p-2 rounded">
                            <span className="font-bold">F</span><br/>0-44
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}