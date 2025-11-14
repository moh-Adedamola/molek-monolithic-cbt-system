import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamQuestions, submitExam } from '../../services/api';
import { Clock, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';

export default function ExamScreen() {
    const { subject } = useParams();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);  // Linear index
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const examCode = localStorage.getItem('examCode');
    const durationMinutes = parseInt(localStorage.getItem('examDuration')) || 60;

    useEffect(() => {
        if (!examCode) return navigate('/');
        setTimeLeft(durationMinutes * 60);

        getExamQuestions(subject, examCode)
            .then(res => {
                const fetchedQuestions = res.data.questions || [];
                if (fetchedQuestions.length === 0) {
                    alert('No questions available.');
                    return navigate('/exam-select');
                }
                setQuestions(fetchedQuestions);
                setLoading(false);
            })
            .catch(err => {
                console.error('Load error:', err);
                alert('Failed to load exam');
                navigate('/exam-select');
            });

        // Timer interval
        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerId);
                    handleSubmit(true);  // Auto-submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [subject, examCode, navigate, durationMinutes]);

    const handleAnswer = (qId, option) => {
        setAnswers(prev => ({ ...prev, [qId]: option }));
    };

    const handleNext = () => setCurrentQuestionIndex(prev => Math.min(prev + 1, questions.length - 1));
    const handlePrev = () => setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));

    const handleSubmit = async (timeout = false) => {
        if (submitting) return;
        if (!timeout && Object.keys(answers).length < questions.length) {
            alert('Answer all questions first.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await submitExam({ exam_code: examCode, answers, subject });
            alert(`Submitted! Score: ${res.data.score}/${res.data.total} (${res.data.percentage}%)`);
            localStorage.removeItem('examCode');
            localStorage.removeItem('activeExams');
            localStorage.removeItem('examDuration');
            navigate('/');
        } catch (err) {
            console.error('Submit error:', err);
            alert('Submission failed: ' + (err.response?.data?.error || 'Unknown error'));
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center mt-10">Loading exam...</div>;

    if (questions.length === 0) {
        return <div className="text-center mt-10">
            No questions. <button onClick={() => navigate('/exam-select')} className="text-blue-600 underline">Back</button>
        </div>;
    }

    const currentQ = questions[currentQuestionIndex];

    return (
        <div className="max-w-3xl mx-auto p-4">
            {/* Header with Timer & Progress */}
            <div className="flex justify-between items-center mb-6 bg-yellow-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">Exam: {subject}</h1>
                    <span className="text-sm text-gray-600">Q {currentQuestionIndex + 1} / {questions.length}</span>
                </div>
                <div className="flex items-center gap-2 text-lg font-bold text-red-600">
                    <Clock size={20} />
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
            </div>

            {/* Current Question */}
            <div className="border rounded-lg p-6 mb-6 bg-white shadow-sm">
                <p className="font-medium mb-4 text-lg">{currentQ.question_text}</p>
                <div className="space-y-3">
                    {['A', 'B', 'C', 'D'].map(opt => {
                        const optText = currentQ[`option_${opt.toLowerCase()}`];
                        if (!optText) return null;
                        return (
                            <label key={opt} className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name={`q${currentQ.id}`}
                                    value={opt}
                                    checked={answers[currentQ.id] === opt}
                                    onChange={() => handleAnswer(currentQ.id, opt)}
                                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-md font-medium">{opt}. {optText}</span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mb-8">
                <button
                    onClick={handlePrev}
                    disabled={currentQuestionIndex === 0}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg disabled:opacity-50 flex items-center gap-1 hover:bg-gray-400"
                >
                    <ArrowLeft size={16} />
                    Previous
                </button>
                <button
                    onClick={handleNext}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1 hover:bg-blue-700"
                >
                    Next
                    <ArrowRight size={16} />
                </button>
            </div>

            {/* Submit on Last Question */}
            {currentQuestionIndex === questions.length - 1 && (
                <button
                    onClick={() => handleSubmit()}
                    disabled={submitting || Object.keys(answers).length < questions.length}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                    {submitting ? (
                        <>
                            <AlertCircle size={20} className="animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            Submit Exam ({Object.keys(answers).length}/{questions.length} answered)
                        </>
                    )}
                </button>
            )}
        </div>
    );
}