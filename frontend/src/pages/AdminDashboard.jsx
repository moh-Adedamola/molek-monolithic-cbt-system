import { useState, useEffect } from 'react';
import { Download, Plus, Eye, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import {
    createStudent,
    bulkUploadStudents,
    createQuestions,
    uploadQuestions,
    exportClassResultsAsText,
    activateExam,
    getAllQuestions,
    getFilteredResults
} from '../services/api';

const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

const isValidFilter = (filter) => {
    if (!filter.type) return false;
    if (filter.type === 'class' && filter.class) return true;
    if (filter.type === 'subject' && filter.class && filter.subject) return true;
    if (filter.type === 'exam_code' && filter.exam_code) return true;
    return false;
};

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('students');
    const [loading, setLoading] = useState(false);

    // === STUDENTS ===
    const [manualStudentForm, setManualStudentForm] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        class: '',
        student_id: ''
    });

    // === QUESTIONS ===
    const [csvQuestionMeta, setCsvQuestionMeta] = useState({ subject: '', class: '' });
    const [manualQuestionMeta, setManualQuestionMeta] = useState({ subject: '', class: '' });
    const [questions, setQuestions] = useState([{ text: '', a: '', b: '', c: '', d: '', correct: 'A' }]);

    // Questions List State
    const [examGroups, setExamGroups] = useState({});
    const [questionsLoading, setQuestionsLoading] = useState(false);
    const [expandedExams, setExpandedExams] = useState(new Set());

    // === RESULTS FILTER ===
    const [resultsFilter, setResultsFilter] = useState({ type: '', class: '', subject: '', exam_code: '' });
    const [resultsLoading, setResultsLoading] = useState(false);

    // === STUDENT HANDLERS ===
    const handleManualStudent = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await createStudent(manualStudentForm);
            alert(`Student created!\nExam Code: ${res.data.exam_code}\nPassword: ${res.data.password}`);
            setManualStudentForm({ first_name: '', middle_name: '', last_name: '', class: '', student_id: '' });
        } catch (err) {
            alert('Failed: ' + (err.response?.data?.error || 'Unknown error'));
        }
        setLoading(false);
    };

    const handleBulkStudent = async (file) => {
        if (!file) return;
        setLoading(true);
        try {
            const res = await bulkUploadStudents(file);
            downloadBlob(res.data, 'student_credentials.txt');
        } catch {
            alert('Bulk upload failed');
        }
        setLoading(false);
    };

    // === QUESTION HANDLERS ===
    const addQuestionField = () => {
        setQuestions([...questions, { text: '', a: '', b: '', c: '', d: '', correct: 'A' }]);
    };

    const updateQuestion = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const handleManualQuestions = async () => {
        if (!manualQuestionMeta.subject || !manualQuestionMeta.class) {
            alert('Subject and class required');
            return;
        }
        setLoading(true);
        try {
            await createQuestions({ subject: manualQuestionMeta.subject, class: manualQuestionMeta.class, questions });
            alert('Questions saved!');
            setManualQuestionMeta({ subject: '', class: '' });
            setQuestions([{ text: '', a: '', b: '', c: '', d: '', correct: 'A' }]);
            fetchAllQuestions();
        } catch (err) {
            alert('Failed: ' + (err.response?.data?.error || 'Unknown error'));
        }
        setLoading(false);
    };

    const handleQuestionUpload = async (file) => {
        if (!file || !csvQuestionMeta.subject || !csvQuestionMeta.class) {
            alert('Select file and fill subject/class for CSV upload');
            return;
        }
        setLoading(true);
        try {
            await uploadQuestions(file, csvQuestionMeta.subject, csvQuestionMeta.class);
            alert('Questions uploaded!');
            setCsvQuestionMeta({ subject: '', class: '' });
            fetchAllQuestions();
        } catch {
            alert('Upload failed');
        }
        setLoading(false);
    };

    // === QUESTIONS FETCH & TOGGLE ===
    const fetchAllQuestions = async () => {
        setQuestionsLoading(true);
        try {
            const res = await getAllQuestions();
            const rawQuestions = res.data.questions || [];
            const groups = {};
            rawQuestions.forEach(q => {
                const safeSubject = q.subject || 'Unknown';
                const safeClass = q.class || 'Unknown';
                const key = `${safeSubject}-${safeClass}`;
                if (!groups[key]) {
                    groups[key] = {
                        subject: safeSubject,
                        class: safeClass,
                        is_active: q.is_active || false,
                        questions: []
                    };
                }
                groups[key].questions.push({
                    id: q.id,
                    question_text: q.question_text,
                    option_a: q.option_a,
                    option_b: q.option_b,
                    option_c: q.option_c,
                    option_d: q.option_d,
                    correct_answer: q.correct_answer
                });
            });
            setExamGroups(groups);
        } catch (err) {
            console.error('Failed to fetch questions:', err);
            alert('Failed to load questions');
            setExamGroups({});
        }
        setQuestionsLoading(false);
    };

    const handleToggleExam = async (subject, classLevel, currentActive) => {
        if (!subject || !classLevel || subject === 'Unknown' || classLevel === 'Unknown') {
            alert('Invalid exam details (missing subject/class). Please re-upload questions.');
            return;
        }
        if (!confirm(`Set ${subject} for ${classLevel} to ${currentActive ? 'inactive' : 'active'}? This will affect all questions for this exam.`)) return;
        setLoading(true);
        try {
            await activateExam(subject, classLevel, !currentActive);
            alert('Exam status updated!');
            fetchAllQuestions();
        } catch (err) {
            console.error('Toggle Error:', err);
            alert('Failed to update: ' + (err.response?.data?.error || err.message || 'Unknown error'));
        }
        setLoading(false);
    };

    const toggleExamExpansion = (key) => {
        const newExpanded = new Set(expandedExams);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedExams(newExpanded);
    };

    // === RESULTS HANDLERS ===
    const handleExportResults = async () => {
        if (!isValidFilter(resultsFilter)) {
            alert('Please fill all required fields for the selected filter type.');
            return;
        }

        setResultsLoading(true);
        try {
            const res = await getFilteredResults(resultsFilter);
            const { type, class: classLevel, subject, exam_code } = resultsFilter;
            let filename = 'results.txt';
            if (type === 'class') {
                filename = `${classLevel}_all_results.txt`;
            } else if (type === 'subject') {
                filename = `${classLevel}_${subject}_results.txt`;
            } else if (type === 'exam_code') {
                filename = `student_${exam_code}_results.txt`;
            }
            downloadBlob(res.data, filename);
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export results: ' + (err.response?.data?.error || 'Unknown error'));
        }
        setResultsLoading(false);
    };

    // === EFFECTS ===
    useEffect(() => {
        if (activeTab === 'questions') {
            fetchAllQuestions();
        }
    }, [activeTab]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">Manage students, questions, and results.</p>
            </div>

            <div className="border-b">
                <nav className="-mb-px flex space-x-8">
                    {['students', 'questions', 'results'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                                activeTab === tab
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab === 'students' && 'Students'}
                            {tab === 'questions' && 'Question Bank'}
                            {tab === 'results' && 'Results'}
                        </button>
                    ))}
                </nav>
            </div>

            {/* STUDENTS TAB */}
            {activeTab === 'students' && (
                <div className="space-y-8">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Add Single Student</h2>
                        <form onSubmit={handleManualStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                value={manualStudentForm.first_name}
                                onChange={(e) => setManualStudentForm({ ...manualStudentForm, first_name: e.target.value })}
                                placeholder="First Name"
                                className="border rounded p-2"
                                required
                            />
                            <input
                                value={manualStudentForm.middle_name}
                                onChange={(e) => setManualStudentForm({ ...manualStudentForm, middle_name: e.target.value })}
                                placeholder="Middle Name (optional)"
                                className="border rounded p-2"
                            />
                            <input
                                value={manualStudentForm.last_name}
                                onChange={(e) => setManualStudentForm({ ...manualStudentForm, last_name: e.target.value })}
                                placeholder="Last Name"
                                className="border rounded p-2"
                                required
                            />
                            <input
                                value={manualStudentForm.class}
                                onChange={(e) => setManualStudentForm({ ...manualStudentForm, class: e.target.value })}
                                placeholder="Class (e.g., JSS1)"
                                className="border rounded p-2"
                                required
                            />
                            <input
                                value={manualStudentForm.student_id}
                                onChange={(e) => setManualStudentForm({ ...manualStudentForm, student_id: e.target.value })}
                                placeholder="Student ID (optional)"
                                className="border rounded p-2 md:col-span-2"
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="md:col-span-2 w-full bg-blue-600 text-white py-2 rounded font-medium disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : '✅ Create Student'}
                            </button>
                        </form>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Bulk Upload Students (CSV)</h2>
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">CSV Format (must match):</label>
                            <div className="text-xs bg-gray-50 p-2 rounded font-mono">
                                first_name,last_name,class,student_id
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                id="student-csv-input"
                                type="file"
                                accept=".csv"
                                onChange={(e) => handleBulkStudent(e.target.files[0])}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => document.getElementById('student-csv-input').click()}
                                className="px-4 py-2 bg-green-600 text-white rounded font-medium"
                            >
                                📤 Upload CSV
                            </button>
                        </div>
                        <p className="mt-3 text-sm text-gray-600">
                            Example:<br />
                            <span className="font-mono">John,Doe,JSS1,SCH2025001</span>
                        </p>
                    </div>
                </div>
            )}

            {/* QUESTIONS TAB */}
            {activeTab === 'questions' && (
                <div className="space-y-8">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Upload Questions (CSV)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input
                                value={csvQuestionMeta.subject}
                                onChange={(e) => setCsvQuestionMeta({ ...csvQuestionMeta, subject: e.target.value })}
                                placeholder="Subject (e.g., English)"
                                className="border rounded p-2"
                                required
                            />
                            <input
                                value={csvQuestionMeta.class}
                                onChange={(e) => setCsvQuestionMeta({ ...csvQuestionMeta, class: e.target.value })}
                                placeholder="Class (e.g., JSS1)"
                                className="border rounded p-2"
                                required
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                id="question-csv-input"
                                type="file"
                                accept=".csv"
                                onChange={(e) => handleQuestionUpload(e.target.files[0])}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (!csvQuestionMeta.subject || !csvQuestionMeta.class) {
                                        alert('Please enter subject and class');
                                        return;
                                    }
                                    document.getElementById('question-csv-input').click();
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded font-medium"
                            >
                                📤 Upload CSV
                            </button>
                        </div>
                        <p className="mt-3 text-sm text-gray-600">
                            Format:<br />
                            <span className="font-mono">question_text,option_a,option_b,option_c,option_d,correct_answer</span>
                        </p>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Add Questions Manually</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input
                                value={manualQuestionMeta.subject}
                                onChange={(e) => setManualQuestionMeta({ ...manualQuestionMeta, subject: e.target.value })}
                                placeholder="Subject"
                                className="border rounded p-2"
                                required
                            />
                            <input
                                value={manualQuestionMeta.class}
                                onChange={(e) => setManualQuestionMeta({ ...manualQuestionMeta, class: e.target.value })}
                                placeholder="Class"
                                className="border rounded p-2"
                                required
                            />
                        </div>
                        {questions.map((q, idx) => (
                            <div key={idx} className="border rounded p-4 mb-4">
                                <input
                                    value={q.text}
                                    onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                                    placeholder="Question"
                                    className="w-full border rounded p-2 mb-2"
                                    required
                                />
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input
                                        value={q.a}
                                        onChange={(e) => updateQuestion(idx, 'a', e.target.value)}
                                        placeholder="Option A"
                                        className="border rounded p-2"
                                        required
                                    />
                                    <input
                                        value={q.b}
                                        onChange={(e) => updateQuestion(idx, 'b', e.target.value)}
                                        placeholder="Option B"
                                        className="border rounded p-2"
                                        required
                                    />
                                    <input
                                        value={q.c}
                                        onChange={(e) => updateQuestion(idx, 'c', e.target.value)}
                                        placeholder="Option C"
                                        className="border rounded p-2"
                                        required
                                    />
                                    <input
                                        value={q.d}
                                        onChange={(e) => updateQuestion(idx, 'd', e.target.value)}
                                        placeholder="Option D"
                                        className="border rounded p-2"
                                        required
                                    />
                                </div>
                                <select
                                    value={q.correct}
                                    onChange={(e) => updateQuestion(idx, 'correct', e.target.value)}
                                    className="border rounded p-2"
                                >
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                </select>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addQuestionField}
                            className="flex items-center gap-1 text-blue-600 mb-4"
                        >
                            <Plus size={16} /> Add Question
                        </button>
                        <button
                            type="button"
                            onClick={handleManualQuestions}
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                        >
                            💾 Save Questions
                        </button>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Eye size={20} /> Exam Bank (Questions by Subject/Class)
                        </h2>
                        {questionsLoading ? (
                            <p>Loading exams...</p>
                        ) : Object.keys(examGroups).length === 0 ? (
                            <p>No exams/questions uploaded yet. Upload some to see them here.</p>
                        ) : (
                            <div className="space-y-4">
                                {Object.values(examGroups).map((group) => {
                                    const key = `${group.subject}-${group.class}`;
                                    const isExpanded = expandedExams.has(key);
                                    return (
                                        <div key={key} className="border rounded-lg overflow-hidden">
                                            <div
                                                className="bg-gray-50 px-6 py-4 cursor-pointer flex justify-between items-center"
                                                onClick={() => toggleExamExpansion(key)}
                                            >
                                                <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-gray-900">
                            {group.subject} / {group.class}
                          </span>
                                                    <span className="text-xs text-gray-500">
                            {group.questions.length} questions
                          </span>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        group.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                            {group.is_active ? 'Active' : 'Inactive'}
                          </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleExam(group.subject, group.class, group.is_active);
                                                        }}
                                                        disabled={loading}
                                                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50 flex items-center gap-1 text-sm"
                                                    >
                                                        {group.is_active ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                                                        {group.is_active ? 'Deactivate Exam' : 'Activate Exam'}
                                                    </button>
                                                    <button
                                                        onClick={() => toggleExamExpansion(key)}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="divide-y divide-gray-200">
                                                    {group.questions.map((q, idx) => (
                                                        <div key={q.id || idx} className="px-6 py-4">
                                                            <div className="text-sm font-medium mb-1">{`Q${idx + 1}:`} {q.question_text}</div>
                                                            <div className="text-xs text-gray-600 space-y-1">
                                                                <div>A: {q.option_a}</div>
                                                                <div>B: {q.option_b}</div>
                                                                <div>C: {q.option_c}</div>
                                                                <div>D: {q.option_d}</div>
                                                                <div className="font-semibold text-green-600">Correct: {q.correct_answer}</div>
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
                        <p className="mt-4 text-xs text-gray-500">
                            Tip: Toggle activates/deactivates the entire exam (subject/class). Students in that class will see questions only if active.
                        </p>
                    </div>
                </div>
            )}

            {/* RESULTS TAB */}
            {activeTab === 'results' && (
                <div className="space-y-6">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium mb-4">Export Filtered Results</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filter Type</label>
                                <select
                                    value={resultsFilter.type}
                                    onChange={(e) => setResultsFilter({ type: e.target.value, class: '', subject: '', exam_code: '' })}
                                    className="w-full border rounded p-2"
                                >
                                    <option value="">Select filter type</option>
                                    <option value="class">By Class (All Subjects)</option>
                                    <option value="subject">By Class & Subject</option>
                                    <option value="exam_code">By Student Exam Code</option>
                                </select>
                            </div>

                            {resultsFilter.type === 'class' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                                    <input
                                        type="text"
                                        value={resultsFilter.class}
                                        onChange={(e) => setResultsFilter({ ...resultsFilter, class: e.target.value })}
                                        placeholder="e.g., JSS1"
                                        className="w-full border rounded p-2"
                                    />
                                </div>
                            )}

                            {resultsFilter.type === 'subject' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                                        <input
                                            type="text"
                                            value={resultsFilter.class}
                                            onChange={(e) => setResultsFilter({ ...resultsFilter, class: e.target.value })}
                                            placeholder="e.g., JSS1"
                                            className="w-full border rounded p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                        <input
                                            type="text"
                                            value={resultsFilter.subject}
                                            onChange={(e) => setResultsFilter({ ...resultsFilter, subject: e.target.value })}
                                            placeholder="e.g., English"
                                            className="w-full border rounded p-2"
                                        />
                                    </div>
                                </div>
                            )}

                            {resultsFilter.type === 'exam_code' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Student Exam Code</label>
                                    <input
                                        type="text"
                                        value={resultsFilter.exam_code}
                                        onChange={(e) => setResultsFilter({ ...resultsFilter, exam_code: e.target.value })}
                                        placeholder="e.g., EX-JSS1-001A"
                                        className="w-full border rounded p-2"
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleExportResults}
                                disabled={resultsLoading || !isValidFilter(resultsFilter)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                            >
                                <Download size={16} />
                                {resultsLoading ? 'Exporting...' : 'Download Results (.txt)'}
                            </button>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                            Results will be downloaded as a formatted text file for printing.
                        </p>
                    </div>
                </div>
            )}

            {/* Hidden file inputs */}
            <input
                id="student-csv-input"
                type="file"
                accept=".csv"
                onChange={(e) => handleBulkStudent(e.target.files[0])}
                className="hidden"
            />
            <input
                id="question-csv-input"
                type="file"
                accept=".csv"
                onChange={(e) => handleQuestionUpload(e.target.files[0])}
                className="hidden"
            />
        </div>
    );
}