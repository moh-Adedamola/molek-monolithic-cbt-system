import { useState, useEffect } from 'react';
import { Download, FileText, Filter, Users, TrendingUp, Award, Loader2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Select from '../../components/common/Select';
import Table from '../../components/common/Table';
import Alert from '../../components/common/Alert';
import { getClassResults, exportResultsToDjango, exportClassResults, getSubjects } from '../../services/api';

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
                ? `${filters.class}_${filters.subject}_for_django.csv`
                : 'exam_results_for_django.csv';

            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setAlert({
                type: 'success',
                message: 'Results exported successfully! Upload this CSV to Django backend.'
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

    const calculateStats = () => {
        if (results.length === 0) return null;

        const totalStudents = results.length;
        const scores = results.map(r => {
            const totalPoints = r.total_possible_points || r.total_questions;
            return (r.score / totalPoints) * 100;
        });

        const average = scores.reduce((a, b) => a + b, 0) / totalStudents;
        const passed = scores.filter(s => s >= 50).length;
        const excellent = scores.filter(s => s >= 70).length;
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
            label: 'Score',
            render: (val, row) => {
                const totalPoints = row.total_possible_points || row.total_questions;
                const percentage = Math.round((val / totalPoints) * 100);
                return (
                    <div>
                        <span className="font-semibold">{val}/{totalPoints}</span>
                        <span className="text-sm text-gray-600 ml-2">({percentage}%)</span>
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
                    <p className="text-gray-600 mt-1">View and export exam results</p>
                </div>
            </div>

            {alert && (
                <Alert
                    type={alert.type}
                    message={alert.message}
                    onClose={() => setAlert(null)}
                />
            )}

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
                                    <p className="text-sm text-gray-600">Pass Rate</p>
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
                                    <p className="text-sm text-gray-600">Excellence</p>
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
                                    Export to Django (CSV)
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
                        Export to Django: CSV format for importing to Django backend (includes CA score calculation)
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

            {/* Info Box */}
            <Card>
                <div className="p-6 bg-blue-50">
                    <h3 className="font-semibold text-blue-900 mb-2">Django Import Instructions:</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                        <li>Export results using "Export to Django (CSV)" button</li>
                        <li>Log in to your Django admin panel</li>
                        <li>Navigate to Exam Results → Bulk Upload</li>
                        <li>Upload the downloaded CSV file</li>
                        <li>Django will automatically:
                            <ul className="list-disc list-inside ml-6 mt-1">
                                <li>Look up students by admission number</li>
                                <li>Look up subjects by name</li>
                                <li>Fetch CA scores for the current session/term</li>
                                <li>Calculate total score (CA + Exam)</li>
                                <li>Generate grades and statistics</li>
                            </ul>
                        </li>
                    </ol>
                </div>
            </Card>
        </div>
    );
}