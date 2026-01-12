import { useState, useEffect } from 'react';
import { Upload, FileText, Filter, Image as ImageIcon, Edit2, Eye, Search } from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { uploadQuestions, getAllQuestions, updateQuestion } from '../../services/api';

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

    // ✅ AUTO-FILTER when filters change
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

        // Filter by class
        if (filters.class) {
            filtered = filtered.filter(q => q.class === filters.class);
        }

        // Filter by subject
        if (filters.subject) {
            filtered = filtered.filter(q => q.subject === filters.subject);
        }

        // Filter by search text
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

    // ✅ ADD/UPDATE IMAGE for existing question
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
            formData.append('question_type', selectedQuestion.question_type);
            formData.append('points', selectedQuestion.points);

            if (selectedQuestion.question_type === 'mcq') {
                formData.append('option_a', selectedQuestion.option_a);
                formData.append('option_b', selectedQuestion.option_b);
                formData.append('option_c', selectedQuestion.option_c);
                formData.append('option_d', selectedQuestion.option_d);
                formData.append('correct_answer', selectedQuestion.correct_answer);
            }

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

    const downloadTemplate = () => {
        const template = `question_text,question_type,option_a,option_b,option_c,option_d,correct_answer,points
"What is 2 + 2?",mcq,3,4,5,6,B,2
"What is the capital of France?",mcq,London,Paris,Berlin,Rome,B,2
"Explain photosynthesis",theory,,,,,,10
"Describe three causes of WWI",essay,,,,,,15`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'question_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 py-6 px-4 sm:px-6 lg:px-8">
            {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Upload questions via CSV, then add images to existing questions
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

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <div className="p-4">
                        <p className="text-sm text-gray-600">Total Questions</p>
                        <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
                    </div>
                </Card>
                <Card>
                    <div className="p-4">
                        <p className="text-sm text-gray-600">With Images</p>
                        <p className="text-2xl font-bold text-green-600">
                            {questions.filter(q => q.image_url).length}
                        </p>
                    </div>
                </Card>
                <Card>
                    <div className="p-4">
                        <p className="text-sm text-gray-600">Without Images</p>
                        <p className="text-2xl font-bold text-orange-600">
                            {questions.filter(q => !q.image_url).length}
                        </p>
                    </div>
                </Card>
                <Card>
                    <div className="p-4">
                        <p className="text-sm text-gray-600">Filtered Results</p>
                        <p className="text-2xl font-bold text-blue-600">{filteredQuestions.length}</p>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Filter className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Filter Questions</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            label="Class"
                            value={filters.class}
                            onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                            options={[
                                { value: '', label: 'All Classes' },
                                ...CLASS_LEVELS.filter(c => c).map(c => ({ value: c, label: c }))
                            ]}
                        />
                        <Select
                            label="Subject"
                            value={filters.subject}
                            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                            options={[
                                { value: '', label: 'All Subjects' },
                                ...uniqueSubjects.map(s => ({ value: s, label: s }))
                            ]}
                        />
                        <div className="relative">
                            <Input
                                label="Search"
                                placeholder="Search question text..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                            <Search className="absolute right-3 top-9 h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Questions List */}
            <Card>
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Questions ({filteredQuestions.length})
                    </h2>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        </div>
                    ) : filteredQuestions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            {questions.length === 0 ? (
                                <>No questions found. Upload questions via CSV to get started.</>
                            ) : (
                                <>No questions match your filters. Try adjusting the filters above.</>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto">
                            {filteredQuestions.map((question, index) => (
                                <div
                                    key={question.id}
                                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="info">{question.class}</Badge>
                                                <Badge variant="default">{question.subject}</Badge>
                                                <Badge variant={question.question_type === 'mcq' ? 'success' : 'warning'}>
                                                    {question.question_type?.toUpperCase()}
                                                </Badge>
                                                <span className="text-sm text-gray-600">
                                                    {question.points} {question.points === 1 ? 'point' : 'points'}
                                                </span>
                                                {question.image_url && (
                                                    <Badge variant="success">
                                                        <ImageIcon className="h-3 w-3 mr-1" />
                                                        Has Image
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-gray-900 font-medium mb-2">
                                                {index + 1}. {question.question_text}
                                            </p>
                                            {question.question_type === 'mcq' && (
                                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 ml-4">
                                                    <div className={question.correct_answer === 'A' ? 'text-green-600 font-semibold' : ''}>
                                                        A. {question.option_a}
                                                    </div>
                                                    <div className={question.correct_answer === 'B' ? 'text-green-600 font-semibold' : ''}>
                                                        B. {question.option_b}
                                                    </div>
                                                    <div className={question.correct_answer === 'C' ? 'text-green-600 font-semibold' : ''}>
                                                        C. {question.option_c}
                                                    </div>
                                                    <div className={question.correct_answer === 'D' ? 'text-green-600 font-semibold' : ''}>
                                                        D. {question.option_d}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <button
                                                onClick={() => {
                                                    setSelectedQuestion(question);
                                                    setIsViewModalOpen(true);
                                                }}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="View question"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedQuestion(question);
                                                    setImageFile(null);
                                                    setIsEditImageModalOpen(true);
                                                }}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title={question.image_url ? 'Replace image' : 'Add image'}
                                            >
                                                <ImageIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {/* Instructions */}
            <Card>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 How to Manage Questions</h4>
                    <div className="space-y-2 text-sm text-blue-800">
                        <p><strong>Step 1:</strong> Upload questions via CSV (bulk import)</p>
                        <p><strong>Step 2:</strong> Use filters to find questions by class/subject</p>
                        <p><strong>Step 3:</strong> Click the image icon <ImageIcon className="inline h-3 w-3" /> to add/replace images</p>
                        <p><strong>Step 4:</strong> Click the eye icon <Eye className="inline h-3 w-3" /> to preview questions</p>
                    </div>
                </div>
            </Card>

            {/* CSV Upload Modal */}
            <Modal
                isOpen={isCsvModalOpen}
                onClose={() => {
                    setIsCsvModalOpen(false);
                    setCsvMeta({ subject: '', class: '' });
                    setUploadFile(null);
                }}
                title="Upload Questions CSV"
                size="md"
            >
                <div className="space-y-4">
                    <Input
                        label="Subject Name"
                        placeholder="e.g., Mathematics, English, Biology"
                        value={csvMeta.subject}
                        onChange={(e) => setCsvMeta({ ...csvMeta, subject: e.target.value })}
                        required
                    />
                    <Select
                        label="Class"
                        value={csvMeta.class}
                        onChange={(e) => setCsvMeta({ ...csvMeta, class: e.target.value })}
                        options={[
                            { value: '', label: 'Select Class' },
                            ...CLASS_LEVELS.filter(c => c).map((c) => ({ value: c, label: c }))
                        ]}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            <p className="text-sm"><strong>Type:</strong> {selectedQuestion.question_type?.toUpperCase()}</p>
                            <p className="text-sm"><strong>Points:</strong> {selectedQuestion.points}</p>
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

                        {selectedQuestion.question_type === 'mcq' && (
                            <div>
                                <p className="font-semibold mb-2">Options:</p>
                                <div className="space-y-1">
                                    <p className={selectedQuestion.correct_answer === 'A' ? 'text-green-600 font-semibold' : ''}>
                                        A. {selectedQuestion.option_a}
                                    </p>
                                    <p className={selectedQuestion.correct_answer === 'B' ? 'text-green-600 font-semibold' : ''}>
                                        B. {selectedQuestion.option_b}
                                    </p>
                                    <p className={selectedQuestion.correct_answer === 'C' ? 'text-green-600 font-semibold' : ''}>
                                        C. {selectedQuestion.option_c}
                                    </p>
                                    <p className={selectedQuestion.correct_answer === 'D' ? 'text-green-600 font-semibold' : ''}>
                                        D. {selectedQuestion.option_d}
                                    </p>
                                </div>
                                <p className="mt-2 text-green-600 font-semibold">
                                    Correct Answer: {selectedQuestion.correct_answer}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default QuestionBank;