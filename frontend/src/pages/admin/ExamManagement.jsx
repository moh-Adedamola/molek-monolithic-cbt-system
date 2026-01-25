import { useState, useEffect } from 'react';
import { Clock, ToggleLeft, ToggleRight, Trash2, Eye } from 'lucide-react';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import Alert from '../../components/common/Alert';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Card from '../../components/common/Card';
import { getAllExams, getExamById, updateExam, deleteExam, activateExam, getSubjects, getSystemSettings } from '../../services/api';

const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

const ExamManagement = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedExam, setSelectedExam] = useState(null);
    const [examDetails, setExamDetails] = useState(null);
    const [alert, setAlert] = useState(null);
    const [subjectsByClass, setSubjectsByClass] = useState({});
    const [selectedClass, setSelectedClass] = useState('');
    const [availableSubjects, setAvailableSubjects] = useState([]);

    const [formData, setFormData] = useState({
        duration_minutes: 60
    });
    const [submitting, setSubmitting] = useState(false);
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        loadSettings();
        loadExams();
        loadSubjects();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await getSystemSettings();
            setSettings(res.data.settings);
            console.log('⚙️ Settings loaded - default duration:', res.data.settings.defaultExamDuration);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const loadExams = async () => {
        try {
            setLoading(true);
            const response = await getAllExams();
            const examList = response.data?.exams || response.data || [];

            // ✅ FIXED: Normalize field names - backend returns 'isActive', we need 'is_active'
            const normalizedExams = examList.map(exam => ({
                ...exam,
                is_active: exam.isActive !== undefined ? exam.isActive : exam.is_active,
                duration_minutes: exam.durationMinutes !== undefined ? exam.durationMinutes : exam.duration_minutes,
                question_count: exam.questionCount !== undefined ? exam.questionCount : exam.question_count
            }));

            setExams(normalizedExams);
        } catch (error) {
            showAlert('error', error.message || 'Failed to load exams');
        } finally {
            setLoading(false);
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

    useEffect(() => {
        if (selectedClass && subjectsByClass[selectedClass]) {
            setAvailableSubjects(subjectsByClass[selectedClass]);
        } else {
            setAvailableSubjects([]);
        }
    }, [selectedClass, subjectsByClass]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
    };

    const handleEditClick = (exam) => {
        setSelectedExam(exam);
        const defaultDuration = settings?.defaultExamDuration || 60;
        setFormData({
            duration_minutes: exam.duration_minutes || defaultDuration
        });
        setIsEditModalOpen(true);
    };

    const handleViewClick = async (exam) => {
        try {
            setLoading(true);
            const response = await getExamById(exam.id);
            setExamDetails(response.data);
            setIsViewModalOpen(true);
        } catch (error) {
            showAlert('error', 'Failed to load exam details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();

        try {
            setSubmitting(true);
            await updateExam(selectedExam.id, formData);
            showAlert('success', 'Exam updated successfully');
            setIsEditModalOpen(false);
            setSelectedExam(null);
            loadExams();
        } catch (error) {
            showAlert('error', error.message || 'Failed to update exam');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (exam) => {
        setSelectedExam(exam);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            setSubmitting(true);
            await deleteExam(selectedExam.id);
            showAlert('success', 'Exam deleted successfully');
            setIsDeleteDialogOpen(false);
            setSelectedExam(null);
            loadExams();
        } catch (error) {
            showAlert('error', error.message || 'Failed to delete exam');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (exam) => {
        try {
            const newStatus = !exam.is_active;
            console.log(`🔄 Toggling exam: ${exam.subject} (${exam.class}) to ${newStatus ? 'active' : 'inactive'}`);

            await activateExam(exam.subject, exam.class, newStatus);

            showAlert('success', `Exam ${newStatus ? 'activated' : 'deactivated'} successfully`);

            // ✅ Reload exams to get updated status
            await loadExams();
        } catch (error) {
            console.error('Toggle error:', error);
            showAlert('error', error.response?.data?.error || 'Failed to toggle exam status');
        }
    };

    const columns = [
        {
            key: 'subject',
            label: 'Subject',
            render: (value, row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.subject}</p>
                    <p className="text-sm text-gray-500">{row.class}</p>
                </div>
            ),
        },
        {
            key: 'duration_minutes',
            label: 'Duration',
            render: (value) => (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    {value} min
                </div>
            ),
        },
        {
            key: 'question_count',
            label: 'Questions',
            render: (value) => (
                <span className="text-gray-600">{value || 0}</span>
            ),
        },
        {
            key: 'is_active',
            label: 'Status',
            render: (value) => (
                <Badge variant={value ? 'success' : 'default'}>
                    {value ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleViewClick(row)}
                        className="rounded p-1 text-blue-600 hover:bg-blue-50"
                        title="View Details"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => handleEditClick(row)}
                        className="rounded p-1 text-green-600 hover:bg-green-50"
                        title="Edit Duration"
                    >
                        <Clock className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => handleToggleActive(row)}
                        className={`rounded p-1 ${
                            row.is_active
                                ? 'text-orange-600 hover:bg-orange-50'
                                : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={row.is_active ? 'Deactivate' : 'Activate'}
                    >
                        {row.is_active ? (
                            <ToggleRight className="h-4 w-4" />
                        ) : (
                            <ToggleLeft className="h-4 w-4" />
                        )}
                    </button>
                    <button
                        onClick={() => handleDeleteClick(row)}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {alert && (
                <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Exam Management</h1>
                    <p className="mt-1 text-sm text-gray-600">Configure exam settings and activate exams</p>
                </div>
            </div>

            <div className="card">
                <p className="text-sm text-gray-600 mb-4">
                    ℹ️ <strong>Note:</strong> Upload questions in the Question Bank first. Then configure exam duration and activate them here.
                </p>
            </div>

            <div className="card">
                <Table
                    columns={columns}
                    data={exams}
                    loading={loading}
                    emptyMessage="No exams found. Upload questions in Question Bank to create exams."
                />
            </div>

            {/* Edit Duration Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Exam Duration"
                size="sm"
            >
                <form onSubmit={handleUpdateSubmit} className="space-y-4">
                    <div>
                        <p className="text-sm text-gray-600 mb-2">
                            <strong>Subject:</strong> {selectedExam?.subject}<br />
                            <strong>Class:</strong> {selectedExam?.class}
                        </p>
                    </div>
                    <Input
                        label="Duration (minutes)"
                        type="number"
                        min="10"
                        max="300"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                        required
                    />
                    {settings?.defaultExamDuration && (
                        <p className="text-xs text-gray-500 mt-1">
                            Default duration: {settings.defaultExamDuration} minutes (can be changed in System Settings)
                        </p>
                    )}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsEditModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" loading={submitting}>
                            Update Duration
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* View Exam Details Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setExamDetails(null);
                }}
                title="Exam Details"
                size="lg"
            >
                {examDetails && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Subject</p>
                                <p className="font-medium">{examDetails.exam.subject}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Class</p>
                                <p className="font-medium">{examDetails.exam.class}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Duration</p>
                                <p className="font-medium">{examDetails.exam.durationMinutes || examDetails.exam.duration_minutes} minutes</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Questions</p>
                                <p className="font-medium">{examDetails.questions.length}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Status</p>
                                <Badge variant={(examDetails.exam.isActive || examDetails.exam.is_active) ? 'success' : 'default'}>
                                    {(examDetails.exam.isActive || examDetails.exam.is_active) ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                        </div>
                        <div className="border-t pt-4">
                            <h4 className="font-medium mb-2">Questions Preview</h4>
                            <div className="max-h-96 overflow-y-auto space-y-3">
                                {examDetails.questions.slice(0, 5).map((q, idx) => (
                                    <div key={q.id} className="bg-gray-50 p-3 rounded">
                                        <p className="text-sm font-medium mb-1">Q{idx + 1}: {q.question_text}</p>
                                        {q.question_type === 'mcq' && (
                                            <div className="text-xs text-gray-600 ml-4">
                                                <p>A: {q.option_a}</p>
                                                <p>B: {q.option_b}</p>
                                                <p>C: {q.option_c}</p>
                                                <p>D: {q.option_d}</p>
                                                <p className="text-green-600 font-medium">Correct: {q.correct_answer}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {examDetails.questions.length > 5 && (
                                    <p className="text-sm text-gray-500 text-center">
                                        ... and {examDetails.questions.length - 5} more questions
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Exam"
                message={`Are you sure you want to delete the exam for ${selectedExam?.subject} - ${selectedExam?.class}? This will also delete all ${selectedExam?.question_count || 0} questions and cannot be undone.`}
                confirmText="Delete"
                type="danger"
                loading={submitting}
            />
        </div>
    );
};

export default ExamManagement;