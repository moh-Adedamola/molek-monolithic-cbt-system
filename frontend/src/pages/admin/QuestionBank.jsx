import { useState, useEffect } from 'react';
import { Plus, Upload, Eye, ToggleLeft, ToggleRight, FileText } from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { uploadQuestions, getAllQuestions, activateExam } from '../../services/api';

const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

const QuestionBank = () => {
    const [activeTab, setActiveTab] = useState('upload');
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [alert, setAlert] = useState(null);
    const [allExamGroups, setAllExamGroups] = useState({});
    const [filteredExamGroups, setFilteredExamGroups] = useState({});
    const [loading, setLoading] = useState(false);
    const [questionsLoading, setQuestionsLoading] = useState(true);
    const [expandedExams, setExpandedExams] = useState(new Set());
    const [selectedClass, setSelectedClass] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [csvMeta, setCsvMeta] = useState({ subject: '', class: '' });
    const [uploadFile, setUploadFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    useEffect(() => {
        fetchAllQuestions();
    }, []);

    const fetchAllQuestions = async () => {
        try {
            setQuestionsLoading(true);
            const res = await getAllQuestions();
            const rawQuestions = res.data.questions || [];
            const groups = {};
            const uniqueSubjects = new Set();

            rawQuestions.forEach((q) => {
                const safeSubject = q.subject || 'Unknown';
                const safeClass = q.class || 'Unknown';
                uniqueSubjects.add(safeSubject);
                const key = `${safeSubject}-${safeClass}`;
                if (!groups[key]) {
                    groups[key] = {
                        subject: safeSubject,
                        class: safeClass,
                        is_active: q.is_active || false,
                        duration_minutes: q.duration_minutes || 60,
                        questions: [],
                    };
                }
                groups[key].questions.push({
                    id: q.id,
                    question_text: q.question_text,
                    option_a: q.option_a,
                    option_b: q.option_b,
                    option_c: q.option_c,
                    option_d: q.option_d,
                    correct_answer: q.correct_answer,
                });
            });

            setSubjects(Array.from(uniqueSubjects).sort());
            setAllExamGroups(groups);
            setFilteredExamGroups(groups);
        } catch {
            showAlert('error', 'Failed to load questions');
        } finally {
            setQuestionsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedClass) {
            const filtered = Object.fromEntries(
                Object.entries(allExamGroups).filter(([, group]) => group.class === selectedClass)
            );
            setFilteredExamGroups(filtered);
        } else {
            setFilteredExamGroups(allExamGroups);
        }
    }, [selectedClass, allExamGroups]);

    const handleCsvUpload = async () => {
        if (!uploadFile || !csvMeta.subject || !csvMeta.class) {
            showAlert('error', 'Select file and fill subject/class');
            return;
        }

        setSubmitting(true);
        try {
            await uploadQuestions(uploadFile, csvMeta.subject, csvMeta.class);
            showAlert('success', 'Questions uploaded!');
            setCsvMeta({ subject: '', class: '' });
            setUploadFile(null);
            setIsCsvModalOpen(false);
            fetchAllQuestions();
        } catch (err) {
            showAlert('error', err.response?.data?.error || 'Upload failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            showAlert('error', 'Please upload a valid CSV file');
            e.target.value = '';
            return;
        }
        setUploadFile(file);
    };

    const triggerFileInput = (inputId) => document.getElementById(inputId)?.click();

    const handleToggleExam = async (subject, classLevel, currentActive) => {
        if (!subject || !classLevel || subject === 'Unknown' || classLevel === 'Unknown') {
            showAlert('error', 'Invalid exam details. Please re-upload with valid subject and class.');
            return;
        }

        if (!confirm(`${currentActive ? 'Deactivate' : 'Activate'} ${subject} for ${classLevel}?`)) {
            return;
        }

        setLoading(true);
        try {
            await activateExam(subject, classLevel, !currentActive);
            showAlert('success', `Exam ${currentActive ? 'deactivated' : 'activated'}`);
            fetchAllQuestions();
        } catch (err) {
            showAlert('error', err.response?.data?.error || 'Toggle failed');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (key) => {
        setExpandedExams((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 py-6 px-4 sm:px-6 lg:px-8">
            {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
                    <p className="mt-1 text-sm text-gray-600">Upload questions and manage exams</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'upload'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Upload Questions
                    </button>
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'manage'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Manage Exams
                    </button>
                </div>
            </div>

            {/* Upload Tab */}
            {activeTab === 'upload' && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4">Upload Questions via CSV</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Format: <code className="bg-gray-100 px-1 rounded">question_text,option_a,option_b,option_c,option_d,correct_answer</code>
                    </p>
                    <Button
                        variant="primary"
                        onClick={() => setIsCsvModalOpen(true)}
                        className="w-full sm:w-auto"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload CSV
                    </Button>
                </Card>
            )}

            {/* Manage Tab */}
            {activeTab === 'manage' && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Manage Exams</h3>
                        <Select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            options={[
                                { value: '', label: 'All Classes' },
                                ...CLASS_LEVELS.map((c) => ({ value: c, label: c }))
                            ]}
                            className="w-40"
                        />
                    </div>

                    {questionsLoading ? (
                        <div className="text-center py-8">Loading exams...</div>
                    ) : Object.keys(filteredExamGroups).length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No exams found. Upload questions to create exams.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(filteredExamGroups).map(([key, group]) => {
                                const isExpanded = expandedExams.has(key);
                                return (
                                    <div key={key} className="border rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-6 py-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-semibold text-lg">{group.subject}</h4>
                                                        <Badge variant="info">{group.class}</Badge>
                                                        <Badge variant={group.is_active ? 'success' : 'default'}>
                                                            {group.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                        <span className="text-sm text-gray-600">
                                                            {group.questions.length} questions • {group.duration_minutes} min
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleToggleExam(group.subject, group.class, group.is_active)}
                                                        disabled={loading}
                                                        className={`p-2 rounded transition-colors ${
                                                            group.is_active
                                                                ? 'text-orange-600 hover:bg-orange-50'
                                                                : 'text-green-600 hover:bg-green-50'
                                                        }`}
                                                        title={group.is_active ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {group.is_active ? (
                                                            <ToggleRight className="h-5 w-5" />
                                                        ) : (
                                                            <ToggleLeft className="h-5 w-5" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => toggleExpand(key)}
                                                        className="p-2 text-gray-600 hover:bg-gray-200 rounded"
                                                    >
                                                        <Eye className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                                                {group.questions.map((q, idx) => (
                                                    <div key={q.id || idx} className="px-6 py-4">
                                                        <div className="text-sm font-medium mb-1">
                                                            Q{idx + 1}: {q.question_text}
                                                        </div>
                                                        <div className="text-xs text-gray-600 space-y-1 ml-4">
                                                            <div>A: {q.option_a}</div>
                                                            <div>B: {q.option_b}</div>
                                                            <div>C: {q.option_c}</div>
                                                            <div>D: {q.option_d}</div>
                                                            <div className="font-semibold text-green-600">
                                                                Correct: {q.correct_answer}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <p className="mt-4 text-xs text-gray-500 text-center">
                        Toggle activates/deactivates the entire exam. Students see questions only when active.
                    </p>
                </Card>
            )}

            {/* CSV Upload Modal */}
            <Modal
                isOpen={isCsvModalOpen}
                onClose={() => {
                    setIsCsvModalOpen(false);
                    setUploadFile(null);
                }}
                title="CSV Upload"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Format: <code className="bg-gray-100 px-1 rounded">question_text,option_a,option_b,option_c,option_d,correct_answer</code>
                    </p>
                    <Input
                        label="Subject"
                        value={csvMeta.subject}
                        onChange={(e) => setCsvMeta({ ...csvMeta, subject: e.target.value })}
                        placeholder="e.g., Mathematics"
                        required
                    />
                    <Select
                        label="Class"
                        value={csvMeta.class}
                        onChange={(e) => setCsvMeta({ ...csvMeta, class: e.target.value })}
                        options={[{ value: '', label: 'Select' }, ...CLASS_LEVELS.map((c) => ({ value: c, label: c }))]}
                        required
                    />
                    <div className="relative">
                        <input id="csv-upload-file" type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => triggerFileInput('csv-upload-file')}
                            className="w-full"
                        >
                            <FileText className="mr-2 h-4 w-4" />
                            {uploadFile ? `Selected: ${uploadFile.name}` : 'Choose CSV File'}
                        </Button>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIsCsvModalOpen(false);
                                setUploadFile(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCsvUpload}
                            loading={submitting}
                            disabled={!uploadFile || !csvMeta.subject || !csvMeta.class}
                        >
                            Upload Questions
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default QuestionBank;