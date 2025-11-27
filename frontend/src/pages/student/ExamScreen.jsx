import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamQuestions, submitExam, saveExamProgress } from '../../services/api';
import { Clock, ArrowLeft, ArrowRight, AlertCircle, CheckCircle, Circle, Loader2, Save } from 'lucide-react';

export default function ExamScreen() {
    const { subject } = useParams();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);
    const [error, setError] = useState('');
    const [lastSaved, setLastSaved] = useState(null);
    const [saving, setSaving] = useState(false);
    const timerRef = useRef(null);
    const autoSaveRef = useRef(null);
    const examCode = localStorage.getItem('examCode');

    useEffect(() => {
        if (!examCode) {
            navigate('/');
            return;
        }

        loadExam();

        // ✅ Cleanup on unmount
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (autoSaveRef.current) {
                clearInterval(autoSaveRef.current);
            }
        };
    }, [subject, examCode, navigate]);

    // ✅ NEW: Auto-save answers every 10 seconds
    useEffect(() => {
        if (questions.length > 0 && Object.keys(answers).length > 0) {
            // Clear existing auto-save timer
            if (autoSaveRef.current) {
                clearInterval(autoSaveRef.current);
            }

            // Set up auto-save every 10 seconds
            autoSaveRef.current = setInterval(() => {
                saveProgress();
            }, 10000); // 10 seconds

            return () => {
                if (autoSaveRef.current) {
                    clearInterval(autoSaveRef.current);
                }
            };
        }
    }, [answers, questions]);

    const loadExam = async () => {
        try {
            setLoading(true);
            setError('');

            const res = await getExamQuestions(subject, examCode);
            const fetchedQuestions = res.data.questions || [];

            if (fetchedQuestions.length === 0) {
                setError('No questions available for this exam.');
                setTimeout(() => navigate('/exam-select'), 2000);
                return;
            }

            setQuestions(fetchedQuestions);

            const backendTimeRemaining = res.data.time_remaining;
            const examStartedAt = res.data.exam_started_at;
            const savedAnswers = res.data.saved_answers || {}; // ✅ NEW: Load saved answers

            console.log('⏱️  Exam loaded:');
            console.log('   Subject:', subject);
            console.log('   Started at:', examStartedAt);
            console.log('   Time remaining:', backendTimeRemaining, 'seconds');
            console.log('   Questions:', fetchedQuestions.length);
            console.log('   Saved answers:', Object.keys(savedAnswers).length);

            // ✅ NEW: Restore saved answers
            if (savedAnswers && Object.keys(savedAnswers).length > 0) {
                setAnswers(savedAnswers);
                setLastSaved(new Date());
                console.log(`📝 Restored ${Object.keys(savedAnswers).length} saved answers`);
            }

            if (backendTimeRemaining <= 0) {
                alert('⏰ Your exam time has expired!');
                handleSubmit(true);
                return;
            }

            setTimeLeft(backendTimeRemaining);
            startTimer(backendTimeRemaining);
            setLoading(false);
        } catch (err) {
            console.error('❌ Load exam error:', err);

            if (err.response?.data?.timeExpired) {
                setError('Your exam time has expired.');
                setTimeout(() => navigate('/exam-select'), 2000);
            } else if (err.response?.data?.error) {
                setError(err.response.data.error);
                setTimeout(() => navigate('/exam-select'), 3000);
            } else {
                setError('Failed to load exam. Please try again.');
                setTimeout(() => navigate('/exam-select'), 2000);
            }
        }
    };

    // ✅ NEW: Save progress to backend
    const saveProgress = async () => {
        if (Object.keys(answers).length === 0 || submitting) {
            return;
        }

        try {
            setSaving(true);
            await saveExamProgress({
                exam_code: examCode,
                subject,
                answers
            });
            setLastSaved(new Date());
            console.log(`💾 Auto-saved ${Object.keys(answers).length} answers`);
        } catch (err) {
            console.error('❌ Auto-save failed:', err);
            // Don't show error to user - silent failure for auto-save
        } finally {
            setSaving(false);
        }
    };

    const startTimer = (initialSeconds) => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        let seconds = initialSeconds;

        timerRef.current = setInterval(() => {
            seconds--;
            setTimeLeft(seconds);

            if (seconds === 300) {
                alert('⚠️ Warning: 5 minutes remaining!');
            }

            if (seconds === 60) {
                alert('⚠️ Warning: 1 minute remaining!');
            }

            if (seconds <= 0) {
                clearInterval(timerRef.current);
                alert('⏰ Time is up! Your exam will be auto-submitted.');
                handleSubmit(true);
            }
        }, 1000);
    };

    const handleAnswer = (qId, option) => {
        setAnswers(prev => ({ ...prev, [qId]: option }));
        // Note: Auto-save will happen in the next 10-second interval
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async (isAutoSubmit = false) => {
        if (submitting) return;

        const unanswered = questions.length - Object.keys(answers).length;

        if (!isAutoSubmit && unanswered > 0) {
            setShowSubmitDialog(true);
            return;
        }

        setSubmitting(true);

        // Clear timers
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        if (autoSaveRef.current) {
            clearInterval(autoSaveRef.current);
        }

        try {
            const res = await submitExam({ exam_code: examCode, answers, subject });

            localStorage.removeItem('examCode');
            localStorage.removeItem('activeExams');
            localStorage.removeItem('examDuration');
            localStorage.removeItem('studentName');

            alert(
                `✅ Exam Submitted Successfully!\n\n` +
                `Score: ${res.data.score}/${res.data.total}\n` +
                `Percentage: ${res.data.percentage}%`
            );

            navigate('/');
        } catch (err) {
            console.error('❌ Submit error:', err);

            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (autoSaveRef.current) {
                clearInterval(autoSaveRef.current);
            }

            if (err.response?.data?.timeExpired) {
                alert('⏰ Exam time has expired. Your answers could not be submitted.');
                localStorage.clear();
                navigate('/');
            } else {
                const errorMsg = err.response?.data?.error || 'Submission failed. Please try again.';
                alert('❌ Submission Failed:\n\n' + errorMsg);
                setSubmitting(false);

                if (timeLeft > 0) {
                    startTimer(timeLeft);
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">Loading your exam...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/exam-select')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Exams
                    </button>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No Questions Available</h2>
                    <p className="text-gray-600 mb-6">This exam has no questions.</p>
                    <button
                        onClick={() => navigate('/exam-select')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Exams
                    </button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const answeredCount = Object.keys(answers).length;
    const isLowTime = timeLeft !== null && timeLeft < 300;

    const formatTime = () => {
        if (timeLeft === null) return '--:--';
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // ✅ NEW: Format last saved time
    const formatLastSaved = () => {
        if (!lastSaved) return 'Not saved yet';
        const now = new Date();
        const diff = Math.floor((now - lastSaved) / 1000);
        if (diff < 60) return `Saved ${diff}s ago`;
        return `Saved ${Math.floor(diff / 60)}m ago`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header with Timer & Progress */}
                <div className="bg-white rounded-lg shadow-lg p-4 mb-6 sticky top-4 z-10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-gray-900 mb-1">{subject} Exam</h1>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{answeredCount}/{questions.length} answered</span>
                            </div>
                            {/* ✅ NEW: Auto-save indicator */}
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                {saving ? (
                                    <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-3 w-3 text-green-600" />
                                        <span className="text-green-600">{formatLastSaved()}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className={`flex items-center gap-2 text-lg font-bold px-4 py-2 rounded-lg ${
                            isLowTime ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-100 text-blue-700'
                        }`}>
                            <Clock className="h-5 w-5" />
                            {formatTime()}
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Question Card */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="mb-4">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
                            Question {currentQuestionIndex + 1}
                        </span>
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-6 leading-relaxed">
                        {currentQ.question_text}
                    </p>
                    <div className="space-y-3">
                        {['A', 'B', 'C', 'D'].map(opt => {
                            const optText = currentQ[`option_${opt.toLowerCase()}`];
                            if (!optText) return null;
                            const isSelected = answers[currentQ.id] === opt;
                            return (
                                <label
                                    key={opt}
                                    className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                        isSelected
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name={`q${currentQ.id}`}
                                        value={opt}
                                        checked={isSelected}
                                        onChange={() => handleAnswer(currentQ.id, opt)}
                                        className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                    />
                                    <span className="ml-3 text-gray-900 flex-1">
                                        <span className="font-semibold">{opt}.</span> {optText}
                                    </span>
                                    {isSelected && (
                                        <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                    )}
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={handlePrev}
                        disabled={currentQuestionIndex === 0}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Previous
                    </button>

                    {currentQuestionIndex === questions.length - 1 ? (
                        <button
                            onClick={() => setShowSubmitDialog(true)}
                            disabled={submitting}
                            className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium shadow-lg"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-5 w-5" />
                                    Submit Exam
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Next
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* Question Navigator */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Question Navigator</h3>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                        {questions.map((q, idx) => {
                            const isAnswered = answers[q.id] !== undefined;
                            const isCurrent = idx === currentQuestionIndex;
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={`relative h-10 w-10 rounded-lg font-medium transition-all duration-200 ${
                                        isCurrent
                                            ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                                            : isAnswered
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {idx + 1}
                                    {isAnswered && !isCurrent && (
                                        <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-600" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 bg-blue-600 rounded"></div>
                            <span className="text-gray-600">Current</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 bg-green-100 rounded"></div>
                            <span className="text-gray-600">Answered</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 bg-gray-100 rounded"></div>
                            <span className="text-gray-600">Unanswered</span>
                        </div>
                    </div>
                </div>

                {/* Low Time Warning */}
                {isLowTime && timeLeft > 0 && (
                    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-orange-100 border-2 border-orange-400 rounded-lg px-6 py-3 shadow-xl z-50 animate-bounce">
                        <div className="flex items-center gap-2 text-orange-800 font-medium">
                            <AlertCircle className="h-5 w-5" />
                            <span>
                                {timeLeft < 60
                                    ? 'Less than 1 minute remaining!'
                                    : `${Math.floor(timeLeft / 60)} minutes remaining!`
                                }
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Submit Confirmation Dialog */}
            {showSubmitDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-scale-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-yellow-100 p-2 rounded-full">
                                <AlertCircle className="h-6 w-6 text-yellow-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Submit Exam?</h3>
                        </div>
                        <div className="mb-6 space-y-2 text-gray-700">
                            <p>You have answered <strong>{answeredCount} out of {questions.length}</strong> questions.</p>
                            {answeredCount < questions.length && (
                                <p className="text-red-600 font-medium">
                                    Warning: {questions.length - answeredCount} question(s) unanswered!
                                </p>
                            )}
                            <p className="text-sm text-gray-600 mt-4">
                                Once submitted, you cannot change your answers.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSubmitDialog(false)}
                                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                                Review Again
                            </button>
                            <button
                                onClick={() => {
                                    setShowSubmitDialog(false);
                                    handleSubmit(false);
                                }}
                                disabled={submitting}
                                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : 'Submit Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}