import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Clock, BookOpen, ToggleLeft, ToggleRight } from 'lucide-react';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { getExamById, activateExam } from '../../services/api';

const ViewExam = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [expandedQuestions, setExpandedQuestions] = useState(new Set());

    useEffect(() => {
        loadExam();
    }, [examId]);

    const loadExam = async () => {
        try {
            setLoading(true);
            const response = await getExamById(examId);
            setExam(response.data.exam);
            setQuestions(response.data.questions || []);
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to load exam details' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async () => {
        if (!exam) return;

        try {
            await activateExam(exam.subject, exam.class, !exam.is_active);
            setAlert({
                type: 'success',
                message: `Exam ${exam.is_active ? 'deactivated' : 'activated'} successfully`
            });
            loadExam();
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to toggle exam status' });
        }
    };

    const toggleQuestion = (qId) => {
        setExpandedQuestions(prev => {
            const next = new Set(prev);
            if (next.has(qId)) {
                next.delete(qId);
            } else {
                next.add(qId);
            }
            return next;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading exam details...</p>
                </div>
            </div>
        );
    }

    if (!exam) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 mb-4">Exam not found</p>
                <Button onClick={() => navigate('/admin/exams')}>
                    Back to Exams
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {alert && (
                <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Exam Details</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        View and manage exam configuration
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/admin/exams')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate(`/admin/exams/edit/${examId}`)}
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                </div>
            </div>

            {/* Exam Info Card */}
            <Card>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{exam.subject}</h2>
                    <Button
                        onClick={handleToggleActive}
                        variant={exam.is_active ? 'danger' : 'success'}
                    >
                        {exam.is_active ? (
                            <>
                                <ToggleRight className="mr-2 h-4 w-4" />
                                Deactivate
                            </>
                        ) : (
                            <>
                                <ToggleLeft className="mr-2 h-4 w-4" />
                                Activate
                            </>
                        )}
                    </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Class Level</p>
                        <p className="text-lg font-semibold text-gray-900">{exam.class}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Duration</p>
                        <div className="flex items-center gap-1">
                            <Clock className="h-5 w-5 text-gray-500" />
                            <p className="text-lg font-semibold text-gray-900">
                                {exam.duration_minutes} min
                            </p>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Total Questions</p>
                        <div className="flex items-center gap-1">
                            <BookOpen className="h-5 w-5 text-gray-500" />
                            <p className="text-lg font-semibold text-gray-900">
                                {exam.total_questions || questions.length}
                            </p>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Status</p>
                        <Badge variant={exam.is_active ? 'success' : 'default'} size="lg">
                            {exam.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                </div>

                {exam.created_at && (
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-gray-600">
                            Created: {new Date(exam.created_at).toLocaleString()}
                        </p>
                    </div>
                )}
            </Card>

            {/* Questions Preview */}
            <Card>
                <h3 className="text-lg font-semibold mb-4">
                    Questions ({questions.length})
                </h3>

                {questions.length === 0 ? (
                    <div className="text-center py-8">
                        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No questions found for this exam</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {questions.map((q, idx) => (
                            <div
                                key={q.id}
                                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <button
                                    onClick={() => toggleQuestion(q.id)}
                                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900">
                                            Question {idx + 1}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {expandedQuestions.has(q.id) ? '▼' : '▶'}
                                        </span>
                                    </div>
                                </button>

                                {expandedQuestions.has(q.id) && (
                                    <div className="px-4 py-3 bg-white">
                                        <p className="font-medium text-gray-900 mb-3">
                                            {q.question_text}
                                        </p>
                                        <div className="space-y-2 pl-4">
                                            <div className="flex items-start gap-2">
                                                <span className="font-semibold text-gray-700">A.</span>
                                                <span className="text-gray-700">{q.option_a}</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <span className="font-semibold text-gray-700">B.</span>
                                                <span className="text-gray-700">{q.option_b}</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <span className="font-semibold text-gray-700">C.</span>
                                                <span className="text-gray-700">{q.option_c}</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <span className="font-semibold text-gray-700">D.</span>
                                                <span className="text-gray-700">{q.option_d}</span>
                                            </div>
                                            <div className="mt-3 pt-3 border-t">
                                                <Badge variant="success">
                                                    Correct Answer: {q.correct_answer}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ViewExam;
