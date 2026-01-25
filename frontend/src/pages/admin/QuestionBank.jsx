import { useState, useEffect } from 'react';
import { Upload, FileText, Filter, Image as ImageIcon, Edit2, Eye, Search, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { uploadQuestions, getAllQuestions, updateQuestion, deleteQuestion } from '../../services/api';

const CLASS_LEVELS = ['', 'JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

const QuestionBank = () => {
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [isEditImageModalOpen, setIsEditImageModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [alert, setAlert] = useState(null);
    const [csvMeta, setCsvMeta] = useState({ subject: '', class: '' });
    const [uploadFile, setUploadFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [filteredQuestions, setFilteredQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [imageFile, setImageFile] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        class: '',
        subject: '',
        search: ''
    });

    // Get unique subjects
    const uniqueSubjects = [...new Set(questions.map(q => q.subject))].sort();

    useEffect(() => {
        loadQuestions();
    }, []);

    useEffect(() => {
        filterQuestions();
    }, [filters, questions]);

    const loadQuestions = async () => {
        try {
            setLoading(true);
            const response = await getAllQuestions();
            setQuestions(response.data?.questions || []);
        } catch (error) {
            showAlert('error', 'Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    const filterQuestions = () => {
        let filtered = [...questions];

        if (filters.class) {
            filtered = filtered.filter(q => q.class === filters.class);
        }

        if (filters.subject) {
            filtered = filtered.filter(q => q.subject === filters.subject);
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(q =>
                q.question_text.toLowerCase().includes(searchLower) ||
                q.subject.toLowerCase().includes(searchLower)
            );
        }

        setFilteredQuestions(filtered);
    };

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    const handleCsvUpload = async () => {
        if (!uploadFile || !csvMeta.subject || !csvMeta.class) {
            showAlert('error', 'Please select file and fill in subject and class');
            return;
        }

        setSubmitting(true);
        try {
            await uploadQuestions(uploadFile, csvMeta.subject, csvMeta.class);
            showAlert('success', 'Questions uploaded successfully!');
            setIsCsvModalOpen(false);
            setCsvMeta({ subject: '', class: '' });
            setUploadFile(null);
            loadQuestions();
        } catch (error) {
            showAlert('error', error.response?.data?.error || 'Upload failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddImage = async () => {
        if (!selectedQuestion || !imageFile) {
            showAlert('error', 'Please select an image');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('question_text', selectedQuestion.question_text);
            formData.append('option_a', selectedQuestion.option_a);
            formData.append('option_b', selectedQuestion.option_b);
            formData.append('option_c', selectedQuestion.option_c);
            formData.append('option_d', selectedQuestion.option_d);
            formData.append('correct_answer', selectedQuestion.correct_answer);

            await updateQuestion(selectedQuestion.id, formData);

            showAlert('success', 'Image added successfully!');
            setIsEditImageModalOpen(false);
            setSelectedQuestion(null);
            setImageFile(null);
            loadQuestions();
        } catch (error) {
            showAlert('error', 'Failed to add image');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteQuestion = async (id) => {
        if (!confirm('Are you sure you want to delete this question?')) {
            return;
        }

        try {
            await deleteQuestion(id);
            showAlert('success', 'Question deleted successfully');
            loadQuestions();
        } catch (error) {
            showAlert('error', 'Failed to delete question');
        }
    };

    // Download CSV template - MCQ only, no points
    const downloadTemplate = () => {
        const template = `question_text,option_a,option_b,option_c,option_d,correct_answer
"What is 2 + 2?",3,4,5,6,B
"What is the capital of Nigeria?",Abuja,Lagos,Kano,Port Harcourt,A
"Which planet is closest to the sun?",Venus,Mercury,Earth,Mars,B
"What is H2O?",Salt,Sugar,Water,Oil,C`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'question_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Group questions by subject for display
    const groupedBySubject = filteredQuestions.reduce((acc, q) => {
        const key = `${q.subject} (${q.class})`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(q);
        return acc;
    }, {});

    return (
        <div className="mx-auto max-w-7xl space-y-6 py-6 px-4 sm:px-6 lg:px-8">
            {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Upload MCQ questions via CSV (1 point per question)
                    </p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => setIsCsvModalOpen(true)}
                >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload CSV
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex flex-wrap items-center gap-4">
                    <Filter className="h-5 w-5 text-gray-500" />
                    <Select
                        value={filters.class}
                        onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                        options={CLASS_LEVELS.map(c => ({ value: c, label: c || 'All Classes' }))}
                        className="w-40"
                    />
                    <Select
                        value={filters.subject}
                        onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                        options={[{ value: '', label: 'All Subjects' }, ...uniqueSubjects.map(s => ({ value: s, label: s }))]}
                        className="w-48"
                    />
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <Badge variant="info">{filteredQuestions.length} questions</Badge>
                </div>
            </Card>

            {/* Questions List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading questions...</p>
                </div>
            ) : Object.keys(groupedBySubject).length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Found</h3>
                        <p className="text-gray-600 mb-4">Upload questions using CSV to get started.</p>
                        <Button onClick={() => setIsCsvModalOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload CSV
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedBySubject).map(([groupKey, groupQuestions]) => (
                        <Card key={groupKey}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">{groupKey}</h3>
                                <Badge variant="primary">{groupQuestions.length} questions</Badge>
                            </div>
                            <div className="space-y-3">
                                {groupQuestions.map((q, index) => (
                                    <div
                                        key={q.id}
                                        className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
                                                {q.image_url && (
                                                    <Badge variant="info" className="text-xs">
                                                        <ImageIcon className="h-3 w-3 mr-1" />
                                                        Has Image
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-900 line-clamp-2">{q.question_text}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Answer: <span className="font-medium text-green-600">{q.correct_answer}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => {
                                                    setSelectedQuestion(q);
                                                    setIsViewModalOpen(true);
                                                }}
                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                title="View"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedQuestion(q);
                                                    setIsEditImageModalOpen(true);
                                                }}
                                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                                                title="Add/Edit Image"
                                            >
                                                <ImageIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuestion(q.id)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Upload CSV Modal */}
            <Modal
                isOpen={isCsvModalOpen}
                onClose={() => {
                    setIsCsvModalOpen(false);
                    setCsvMeta({ subject: '', class: '' });
                    setUploadFile(null);
                }}
                title="Upload MCQ Questions"
                size="md"
            >
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">CSV Format (MCQ Only)</h4>
                        <code className="text-xs text-blue-800 block bg-blue-100 p-2 rounded">
                            question_text,option_a,option_b,option_c,option_d,correct_answer
                        </code>
                        <p className="text-xs text-blue-700 mt-2">
                            • All questions are worth 1 point each<br />
                            • correct_answer must be A, B, C, or D
                        </p>
                    </div>

                    <Input
                        label="Subject Name"
                        placeholder="e.g., Mathematics"
                        value={csvMeta.subject}
                        onChange={(e) => setCsvMeta({ ...csvMeta, subject: e.target.value })}
                        required
                    />

                    <Select
                        label="Class"
                        value={csvMeta.class}
                        onChange={(e) => setCsvMeta({ ...csvMeta, class: e.target.value })}
                        options={CLASS_LEVELS.filter(c => c).map(c => ({ value: c, label: c }))}
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            CSV File <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setUploadFile(e.target.files[0])}
                            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
                        />
                        {uploadFile && (
                            <p className="mt-1 text-sm text-green-600">✓ Selected: {uploadFile.name}</p>
                        )}
                    </div>

                    <Button variant="outline" onClick={downloadTemplate} className="w-full">
                        <FileText className="mr-2 h-4 w-4" />
                        Download CSV Template
                    </Button>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsCsvModalOpen(false);
                                setCsvMeta({ subject: '', class: '' });
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

            {/* Add/Edit Image Modal */}
            <Modal
                isOpen={isEditImageModalOpen}
                onClose={() => {
                    setIsEditImageModalOpen(false);
                    setSelectedQuestion(null);
                    setImageFile(null);
                }}
                title={selectedQuestion?.image_url ? 'Replace Question Image' : 'Add Question Image'}
                size="md"
            >
                {selectedQuestion && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">
                                <strong>Subject:</strong> {selectedQuestion.subject} | <strong>Class:</strong> {selectedQuestion.class}
                            </p>
                            <p className="text-sm text-gray-900 font-medium">
                                {selectedQuestion.question_text}
                            </p>
                        </div>

                        {selectedQuestion.image_url && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Current Image:</p>
                                <img
                                    src={selectedQuestion.image_url_full || `/uploads/questions/${selectedQuestion.image_url}`}
                                    alt="Current"
                                    className="max-h-48 rounded border"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <ImageIcon className="inline h-4 w-4 mr-1" />
                                {selectedQuestion.image_url ? 'New Image' : 'Select Image'}
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImageFile(e.target.files[0])}
                                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
                            />
                            {imageFile && (
                                <p className="mt-1 text-sm text-green-600">✓ Selected: {imageFile.name}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setIsEditImageModalOpen(false);
                                    setSelectedQuestion(null);
                                    setImageFile(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddImage}
                                loading={submitting}
                                disabled={!imageFile}
                            >
                                <ImageIcon className="mr-2 h-4 w-4" />
                                {selectedQuestion.image_url ? 'Replace Image' : 'Add Image'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* View Question Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setSelectedQuestion(null);
                }}
                title="View Question"
                size="md"
            >
                {selectedQuestion && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm"><strong>Subject:</strong> {selectedQuestion.subject}</p>
                            <p className="text-sm"><strong>Class:</strong> {selectedQuestion.class}</p>
                        </div>

                        <div>
                            <p className="font-semibold mb-2">Question:</p>
                            <p className="text-gray-700">{selectedQuestion.question_text}</p>
                        </div>

                        {selectedQuestion.image_url && (
                            <div>
                                <p className="font-semibold mb-2">Image:</p>
                                <img
                                    src={selectedQuestion.image_url_full || `/uploads/questions/${selectedQuestion.image_url}`}
                                    alt="Question"
                                    className="max-w-full rounded border"
                                />
                            </div>
                        )}

                        <div>
                            <p className="font-semibold mb-2">Options:</p>
                            <div className="space-y-1">
                                <p className={selectedQuestion.correct_answer === 'A' ? 'text-green-600 font-semibold' : ''}>
                                    A. {selectedQuestion.option_a} {selectedQuestion.correct_answer === 'A' && '✓'}
                                </p>
                                <p className={selectedQuestion.correct_answer === 'B' ? 'text-green-600 font-semibold' : ''}>
                                    B. {selectedQuestion.option_b} {selectedQuestion.correct_answer === 'B' && '✓'}
                                </p>
                                <p className={selectedQuestion.correct_answer === 'C' ? 'text-green-600 font-semibold' : ''}>
                                    C. {selectedQuestion.option_c} {selectedQuestion.correct_answer === 'C' && '✓'}
                                </p>
                                <p className={selectedQuestion.correct_answer === 'D' ? 'text-green-600 font-semibold' : ''}>
                                    D. {selectedQuestion.option_d} {selectedQuestion.correct_answer === 'D' && '✓'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default QuestionBank;
