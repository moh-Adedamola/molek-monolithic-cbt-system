import { useState, useEffect } from 'react';
import { Download, FileText, Filter } from 'lucide-react';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Select from '../../components/common/Select';
import Alert from '../../components/common/Alert';
import Badge from '../../components/common/Badge';
import { getClasses, getClassResults, exportClassResultsAsText, getFilteredResults, getSubjects } from '../../services/api';
import { downloadBlob } from '../../utils/adminUtils';

const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

const ResultsManagement = () => {
    const [results, setResults] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjectsByClass, setSubjectsByClass] = useState({});
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({
        class: '',
        subject: '',
    });
    const [availableSubjects, setAvailableSubjects] = useState([]);

    useEffect(() => {
        loadClasses();
        loadSubjects();
    }, []);

    useEffect(() => {
        if (filters.class) {
            loadResults();
            if (subjectsByClass[filters.class]) {
                setAvailableSubjects(subjectsByClass[filters.class]);
            } else {
                setAvailableSubjects([]);
            }
        }
    }, [filters.class]);

    const loadClasses = async () => {
        try {
            const response = await getClasses();
            let classList = response.data.classes || [];
            if (classList.length > 0 && typeof classList[0] === 'string') {
                classList = classList.map(cls => ({ class: cls, count: '?' }));
            }
            setClasses(classList);
        } catch (error) {
            console.error('Load classes error:', error);
        }
    };

    const loadSubjects = async () => {
        try {
            const response = await getSubjects();
            setSubjectsByClass(response.data?.subjects || {});
        } catch (error) {
            console.error('Failed to load subjects:', error);
        }
    };

    const loadResults = async () => {
        if (!filters.class) return;

        try {
            setLoading(true);
            const response = await getClassResults(filters.class);
            let resultList = response.data?.results || [];

            // Filter by subject if selected
            if (filters.subject) {
                resultList = resultList.filter(r => r.subject === filters.subject);
            }

            setResults(resultList);
        } catch (error) {
            showAlert('error', error.message || 'Failed to load results');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (type, message) => {
        setAlert({ type, message });
    };

    const handleExportText = async () => {
        if (!filters.class || !filters.subject) {
            showAlert('error', 'Please select both class and subject');
            return;
        }

        try {
            const response = await exportClassResultsAsText(filters.class, filters.subject);
            downloadBlob(response.data, `${filters.class}_${filters.subject}_results.txt`);
            showAlert('success', 'Results exported successfully');
        } catch (error) {
            showAlert('error', 'Failed to export results');
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await getFilteredResults(filters);
            downloadBlob(response.data, 'filtered_results.csv');
            showAlert('success', 'CSV exported successfully');
        } catch (error) {
            showAlert('error', 'Failed to export CSV');
        }
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
            render: (value) => (
                <Badge variant="info">{value}</Badge>
            ),
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
                    <h1 className="text-2xl font-bold text-gray-900">Results Management</h1>
                    <p className="mt-1 text-sm text-gray-600">View and export exam results</p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                        label="Class"
                        value={filters.class}
                        onChange={(e) => {
                            setFilters({ ...filters, class: e.target.value, subject: '' });
                            setResults([]);
                        }}
                        options={[
                            { value: '', label: 'Select Class' },
                            ...CLASS_LEVELS.map(c => ({ value: c, label: c }))
                        ]}
                        required
                    />
                    <Select
                        label="Subject"
                        value={filters.subject}
                        onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                        options={[
                            { value: '', label: 'All Subjects' },
                            ...availableSubjects.map(s => ({ value: s, label: s }))
                        ]}
                        disabled={!filters.class}
                    />
                    <div className="flex items-end gap-2">
                        <Button
                            onClick={loadResults}
                            disabled={!filters.class}
                            className="flex-1"
                        >
                            Load Results
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Export Buttons */}
            {results.length > 0 && (
                <Card>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="outline"
                            onClick={handleExportText}
                            disabled={!filters.subject}
                        >
                            <FileText className="mr-2 h-4 w-4" />
                            Export as Text
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleExportCSV}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export as CSV
                        </Button>
                    </div>
                </Card>
            )}

            {/* Results Table */}
            <div className="card">
                <Table
                    columns={columns}
                    data={results}
                    loading={loading}
                    emptyMessage="No results found. Select a class and load results."
                />
            </div>

            {/* Statistics */}
            {results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card
                        title="Total Students"
                        value={results.length}
                    />
                    <Card
                        title="Average Score"
                        value={`${Math.round(results.reduce((sum, r) => sum + (r.score / r.total_questions * 100), 0) / results.length)}%`}
                    />
                    <Card
                        title="Pass Rate"
                        value={`${Math.round((results.filter(r => (r.score / r.total_questions * 100) >= 50).length / results.length) * 100)}%`}
                        subtitle="≥50% passing"
                    />
                    <Card
                        title="Excellence Rate"
                        value={`${Math.round((results.filter(r => (r.score / r.total_questions * 100) >= 70).length / results.length) * 100)}%`}
                        subtitle="≥70% excellent"
                    />
                </div>
            )}
        </div>
    );
};

export default ResultsManagement;