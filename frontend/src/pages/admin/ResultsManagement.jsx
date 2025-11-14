import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Eye } from 'lucide-react';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { resultService } from '../../services/services';
import { downloadBlob, isValidFilter } from '../../utils/adminUtils';

const ResultsManagement = () => {
    const [searchParams] = useSearchParams();
    const examIdFromUrl = searchParams.get('exam');

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [selectedResult, setSelectedResult] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Filter state for exports
    const [exportFilter, setExportFilter] = useState({
        type: '',
        class: '',
        subject: '',
        exam_code: ''
    });
    const [exporting, setExporting] = useState(false);

    // Filter state for table
    const [filters, setFilters] = useState({
        exam_id: examIdFromUrl || '',
        student_id: '',
        status: '',
        search: '',
    });

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        published: 0,
        pending: 0,
        averageScore: 0,
        passRate: 0,
    });

    useEffect(() => {
        loadResults();
    }, [filters]);

    const loadResults = async () => {
        try {
            setLoading(true);
            const params = { ...filters };
            const response = await resultService.getAll(params);
            const resultsList = response.data?.results || response.data || [];
            setResults(resultsList);

            // Calculate stats
            const published = resultsList.filter(r => r.is_published || r.isPublished).length;
            const totalScore = resultsList.reduce((sum, r) => {
                const score = r.percentage_score || r.percentageScore || r.score || 0;
                return sum + score;
            }, 0);
            const avgScore = resultsList.length > 0 ? totalScore / resultsList.length : 0;
            const passRate = resultsList.length > 0 ? (published / resultsList.length * 100) : 0;

            setStats({
                total: resultsList.length,
                published,
                pending: resultsList.length - published,
                averageScore: avgScore,
                passRate
            });
        } catch (error) {
            setAlert({
                type: 'error',
                message: error.response?.data?.error || error.message || 'Failed to load results'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExportResults = async () => {
        if (!isValidFilter(exportFilter)) {
            setAlert({
                type: 'error',
                message: 'Please fill all required fields for the selected filter type.'
            });
            return;
        }

        setExporting(true);
        try {
            const response = await resultService.getFiltered(exportFilter);
            const { type, class: classLevel, subject, exam_code } = exportFilter;

            let filename = 'results.txt';
            if (type === 'class') filename = `${classLevel}_all_results.txt`;
            else if (type === 'subject') filename = `${classLevel}_${subject}_results.txt`;
            else if (type === 'exam_code') filename = `student_${exam_code}_results.txt`;

            downloadBlob(response.data, filename);
            setAlert({ type: 'success', message: 'Results exported successfully' });
        } catch (error) {
            setAlert({
                type: 'error',
                message: error.response?.data?.error || 'Failed to export results'
            });
        } finally {
            setExporting(false);
        }
    };

    const handleViewDetails = (result) => {
        setSelectedResult(result);
        setIsDetailsModalOpen(true);
    };

    const handlePublishClick = (result) => {
        setSelectedResult(result);
        setIsPublishDialogOpen(true);
    };

    const handlePublishConfirm = async () => {
        try {
            setSubmitting(true);
            await resultService.publish(selectedResult.id || selectedResult.result_id);
            setAlert({ type: 'success', message: 'Result published successfully' });
            setIsPublishDialogOpen(false);
            setSelectedResult(null);
            loadResults();
        } catch (error) {
            setAlert({
                type: 'error',
                message: error.response?.data?.error || 'Failed to publish result'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownloadPDF = async (result) => {
        try {
            const response = await resultService.downloadPDF(result.id || result.result_id);
            downloadBlob(response.data, `result_${result.exam_code || result.examCode}.pdf`);
        } catch (error) {
            setAlert({
                type: 'error',
                message: error.response?.data?.error || 'Failed to download PDF'
            });
        }
    };

    const getStatusBadge = (result) => {
        const isPublished = result.is_published || result.isPublished;
        return isPublished ? 'success' : 'warning';
    };

    const columns = [
        {
            key: 'studentName',
            label: 'Student',
            render: (value, row) => {
                const name = row.student_name || row.studentName ||
                    `${row.first_name || ''} ${row.last_name || ''}`.trim();
                const examCode = row.exam_code || row.examCode;
                return (
                    <div>
                        <p className="font-medium text-gray-900">{name}</p>
                        <p className="text-sm text-gray-500">{examCode}</p>
                    </div>
                );
            }
        },
        {
            key: 'examName',
            label: 'Exam',
            render: (value, row) => row.exam_name || row.examName || '-'
        },
        {
            key: 'score',
            label: 'Score',
            render: (value, row) => {
                const score = row.score || row.total_score || 0;
                const percentage = row.percentage_score || row.percentageScore || 0;
                return (
                    <div>
                        <p className="font-medium text-gray-900">{percentage.toFixed(1)}%</p>
                        <p className="text-sm text-gray-500">{score} points</p>
                    </div>
                );
            }
        },
        {
            key: 'status',
            label: 'Status',
            render: (value, row) => {
                const isPublished = row.is_published || row.isPublished;
                return (
                    <Badge variant={getStatusBadge(row)}>
                        {isPublished ? 'Published' : 'Pending'}
                    </Badge>
                );
            }
        },
        {
            key: 'submittedAt',
            label: 'Submitted',
            render: (value, row) => {
                const date = row.submitted_at || row.submittedAt || row.created_at;
                if (!date) return '-';
                return new Date(date).toLocaleDateString();
            }
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleViewDetails(row)}
                        className="rounded p-1 text-blue-600 hover:bg-blue-50"
                        title="View Details"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    {!(row.is_published || row.isPublished) && (
                        <button
                            onClick={() => handlePublishClick(row)}
                            className="rounded p-1 text-green-600 hover:bg-green-50"
                            title="Publish"
                        >
                            <Download className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => handleDownloadPDF(row)}
                        className="rounded p-1 text-purple-600 hover:bg-purple-50"
                        title="Download PDF"
                    >
                        <Download className="h-4 w-4" />
                    </button>
                </div>
            )
        },
    ];

    return (
        <div className="mx-auto max-w-7xl space-y-6 py-6">
            {/* Alert */}
            {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Results Management</h1>
                    <p className="mt-1 text-sm text-gray-600">View and manage exam results</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card title="Total Results" value={stats.total} />
                <Card title="Published" value={stats.published} />
                <Card title="Pending" value={stats.pending} />
                <Card title="Avg Score" value={`${stats.averageScore.toFixed(1)}%`} />
                <Card title="Pass Rate" value={`${stats.passRate.toFixed(1)}%`} />
            </div>

            {/* Export Filters */}
            <Card>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Export Results</h3>
                <div className="space-y-4">
                    <Select
                        label="Filter Type"
                        value={exportFilter.type}
                        onChange={(e) => setExportFilter({
                            type: e.target.value,
                            class: '',
                            subject: '',
                            exam_code: ''
                        })}
                        options={[
                            { value: '', label: 'Select type' },
                            { value: 'class', label: 'By Class' },
                            { value: 'subject', label: 'By Class & Subject' },
                            { value: 'exam_code', label: 'By Exam Code' }
                        ]}
                    />
                    {exportFilter.type === 'class' && (
                        <Input
                            label="Class"
                            value={exportFilter.class}
                            onChange={(e) => setExportFilter({ ...exportFilter, class: e.target.value })}
                            placeholder="e.g., SS1"
                        />
                    )}
                    {exportFilter.type === 'subject' && (
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Class"
                                value={exportFilter.class}
                                onChange={(e) => setExportFilter({ ...exportFilter, class: e.target.value })}
                                placeholder="e.g., SS1"
                            />
                            <Input
                                label="Subject"
                                value={exportFilter.subject}
                                onChange={(e) => setExportFilter({ ...exportFilter, subject: e.target.value })}
                                placeholder="e.g., Mathematics"
                            />
                        </div>
                    )}
                    {exportFilter.type === 'exam_code' && (
                        <Input
                            label="Exam Code"
                            value={exportFilter.exam_code}
                            onChange={(e) => setExportFilter({ ...exportFilter, exam_code: e.target.value })}
                            placeholder="Enter student exam code"
                        />
                    )}
                    <Button
                        onClick={handleExportResults}
                        loading={exporting}
                        disabled={!isValidFilter(exportFilter)}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export Results
                    </Button>
                </div>
            </Card>

            {/* Table Filters */}
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Search"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        placeholder="Search by student name or exam"
                    />
                    <Select
                        label="Status"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        options={[
                            { value: '', label: 'All Status' },
                            { value: 'published', label: 'Published' },
                            { value: 'pending', label: 'Pending' }
                        ]}
                    />
                </div>
            </Card>

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    data={results}
                    loading={loading}
                    emptyMessage="No results found."
                />
            </Card>

            {/* Details Modal */}
            <Modal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                title="Result Details"
            >
                {selectedResult && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600">Student</p>
                            <p className="font-medium">
                                {selectedResult.student_name || selectedResult.studentName}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Exam</p>
                            <p className="font-medium">
                                {selectedResult.exam_name || selectedResult.examName}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Score</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {(selectedResult.percentage_score || selectedResult.percentageScore || 0).toFixed(1)}%
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <Badge variant={getStatusBadge(selectedResult)}>
                                {(selectedResult.is_published || selectedResult.isPublished) ? 'Published' : 'Pending'}
                            </Badge>
                        </div>
                        <Button onClick={() => handleDownloadPDF(selectedResult)} className="w-full">
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                        </Button>
                    </div>
                )}
            </Modal>

            {/* Publish Confirmation */}
            <ConfirmDialog
                isOpen={isPublishDialogOpen}
                onClose={() => setIsPublishDialogOpen(false)}
                onConfirm={handlePublishConfirm}
                title="Publish Result"
                message="Are you sure you want to publish this result? Students will be able to view it."
                confirmText="Publish"
                type="default"
                loading={submitting}
            />
        </div>
    );
};

export default ResultsManagement;