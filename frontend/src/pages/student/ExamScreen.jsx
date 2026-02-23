import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamQuestions, saveExamProgress, submitExam } from '../../services/api';

export default function ExamScreen() {
    const { subject } = useParams();
    const navigate = useNavigate();

    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [exam, setExam] = useState(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const admissionNumber = localStorage.getItem('admissionNumber');
    const autoSaveInterval = useRef(null);

    // Validate session on mount
    useEffect(() => {
        if (!admissionNumber) {
            alert('Please login first');
            navigate('/');
            return;
        }

        if (!subject) {
            alert('Invalid exam');
            navigate('/exam-select');
            return;
        }
    }, [admissionNumber, subject, navigate]);

    // Load exam
    useEffect(() => {
        if (!admissionNumber || !subject) return;
        loadExam();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subject]);

    const loadExam = async () => {
        try {
            setIsLoading(true);

            console.log('📥 Loading exam:', subject, 'for', admissionNumber);

            const res = await getExamQuestions(subject, admissionNumber);

            // Check if already submitted
            if (res.data.already_submitted) {
                setError({
                    title: 'Exam Already Taken',
                    message: 'You have already submitted this exam.',
                    isBlocking: true
                });
                setIsLoading(false);
                return;
            }

            // Get duration properly
            const duration = res.data.exam.duration_seconds ||
                (res.data.exam.duration_minutes * 60) ||
                3600;

            // Set questions and exam info
            setQuestions(res.data.questions);
            setExam(res.data.exam);

            // Load saved progress
            if (res.data.saved_progress) {
                const savedAnswers = res.data.saved_progress.answers || {};
                const savedTime = res.data.saved_progress.time_remaining;

                setAnswers(savedAnswers);
                setTimeRemaining(savedTime || duration);

                console.log('📂 Restored progress:', Object.keys(savedAnswers).length, 'answers');
                console.log('⏱️ Time remaining:', savedTime, 'seconds');
            } else {
                setTimeRemaining(duration);
                setAnswers({});
            }

            console.log('⏱️  Exam loaded:');
            console.log('   Subject:', res.data.exam.subject);
            console.log('   Time remaining:', duration, 'seconds');
            console.log('   Questions:', res.data.questions.length, 'MCQ');

            setIsLoading(false);

            // Try to enter fullscreen
            try {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
            } catch {
                console.log('⚠️  Fullscreen requires user interaction');
            }

        } catch (error) {
            console.error('❌ Load exam error:', error);

            if (error.response?.status === 400 && error.response?.data?.already_submitted) {
                setError({
                    title: 'Exam Already Taken',
                    message: 'You have already submitted this exam.',
                    isBlocking: true
                });
            } else {
                setError({
                    title: 'Error',
                    message: 'Failed to load exam. Please try again.',
                    isBlocking: true
                });
            }

            setIsLoading(false);
        }
    };

    // Timer countdown
    useEffect(() => {
        if (timeRemaining <= 0 || !exam) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleAutoSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeRemaining, exam]);

    // Auto-save progress every 5 seconds
    useEffect(() => {
        if (questions.length === 0) return;

        autoSaveInterval.current = setInterval(() => {
            saveProgress();
        }, 5000);

        return () => {
            if (autoSaveInterval.current) {
                clearInterval(autoSaveInterval.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [answers, timeRemaining, questions]);

    const saveProgress = async () => {
        try {
            await saveExamProgress(admissionNumber, subject, answers, timeRemaining);
            console.log('💾 Progress saved');
        } catch (error) {
            console.error('❌ Failed to save progress:', error);
        }
    };

    const handleAnswerChange = (questionId, answer) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    };

    const nextQuestion = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        }
    };

    const previousQuestion = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(prev => prev - 1);
        }
    };

    const goToQuestion = (index) => {
        setCurrentQuestion(index);
    };

    const getQuestionStatus = (index) => {
        const questionId = questions[index]?.id;
        return answers[questionId] ? 'answered' : 'unanswered';
    };

    const handleAutoSubmit = async () => {
        console.log('⏰ Time expired - auto submitting');
        // Try submitting up to 3 times with delays
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await submitExamHandler(true);
                return; // success, stop retrying
            } catch (err) {
                console.error(`❌ Auto-submit attempt ${attempt} failed:`, err.message);
                if (attempt < 3) {
                    // Wait 1s before retry
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
        // All retries failed - show message to student
        setError({
            title: 'Auto-Submit Failed',
            message: 'Time expired but we could not submit your exam. Your answers have been saved. Please contact your teacher - your saved answers will be scored from the server.',
            isBlocking: true
        });
    };

    const handleSubmit = async () => {
        const unanswered = questions.length - Object.keys(answers).length;

        if (unanswered > 0) {
            const confirm = window.confirm(
                `You have ${unanswered} unanswered question(s). Are you sure you want to submit?`
            );
            if (!confirm) return;
        } else {
            const confirm = window.confirm('Are you sure you want to submit your exam?');
            if (!confirm) return;
        }

        await submitExamHandler(false);
    };

    const submitExamHandler = async (autoSubmitted = false) => {
        try {
            setIsSubmitting(true);

            // Clear auto-save interval
            if (autoSaveInterval.current) {
                clearInterval(autoSaveInterval.current);
            }

            const startTime = exam?.duration_minutes ? exam.duration_minutes * 60 : 3600;
            const timeTaken = startTime - timeRemaining;

            const res = await submitExam(admissionNumber, subject, answers, autoSubmitted, timeTaken);

            console.log('✅ Exam submitted successfully');

            // Exit fullscreen
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }

            // Show success message (no score)
            setSubmitSuccess(true);

        } catch (error) {
            console.error('❌ Submit error:', error);
            setError({
                title: 'Submit Failed',
                message: error.response?.data?.error || 'Failed to submit exam. Please try again.',
                isBlocking: false
            });
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimeColor = () => {
        if (timeRemaining <= 60) return 'text-red-600';
        if (timeRemaining <= 300) return 'text-orange-500';
        return 'text-green-600';
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    // Success screen after submission
    if (submitSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Exam Submitted!</h1>
                    <p className="text-gray-600 mb-6">
                        Your {subject} exam has been submitted successfully. 
                        Your results will be available from your teacher.
                    </p>
                    <button
                        onClick={handleLogout}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading exam questions...</p>
                </div>
            </div>
        );
    }

    // Blocking error state
    if (error?.isBlocking) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{error.title}</h2>
                    <p className="text-gray-600 mb-6">{error.message}</p>
                    <button
                        onClick={() => navigate('/exam-select')}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                    >
                        Back to Exam Selection
                    </button>
                </div>
            </div>
        );
    }

    // No questions state
    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">No Questions Available</h2>
                    <p className="text-gray-600 mb-6">This exam has no questions yet. Please contact your administrator.</p>
                    <button
                        onClick={() => navigate('/exam-select')}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                    >
                        Back to Exam Selection
                    </button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentQuestion];
    const answeredCount = Object.keys(answers).length;

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white shadow-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{subject}</h1>
                            <p className="text-sm text-gray-600">
                                Question {currentQuestion + 1} of {questions.length}
                            </p>
                        </div>
                        <div className="flex items-center space-x-6">
                            <div className="text-center">
                                <p className="text-xs text-gray-500">Time Remaining</p>
                                <p className={`text-2xl font-bold ${getTimeColor()}`}>
                                    {formatTime(timeRemaining)}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500">Answered</p>
                                <p className="text-lg font-semibold text-green-600">
                                    {answeredCount}/{questions.length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Question Area */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            {/* Question Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
                                        {currentQuestion + 1}
                                    </div>
                                    <span className="text-sm px-3 py-1 bg-gray-100 rounded-full">
                                        Multiple Choice
                                    </span>
                                </div>
                            </div>

                            {/* Question Text */}
                            <div className="mb-6">
                                <p className="text-lg text-gray-800 leading-relaxed"
                                   dangerouslySetInnerHTML={{ __html: currentQ.question_text }}
                                />
                                {currentQ.image_url && (
                                    <img
                                        src={currentQ.image_url}
                                        alt="Question diagram"
                                        className="mt-3 rounded-lg border border-gray-200"
                                        style={{ maxHeight: '220px', maxWidth: '100%', width: 'auto', objectFit: 'contain' }}
                                        onError={(e) => { e.target.style.display = 'none'; console.error('Failed to load image:', currentQ.image_url); }}
                                    />
                                )}
                            </div>

                            {/* MCQ Options */}
                            <div className="space-y-2">
                                {['A', 'B', 'C', 'D'].map(option => {
                                    const optionKey = `option_${option.toLowerCase()}`;
                                    const optionText = currentQ[optionKey];

                                    if (!optionText) return null;

                                    const isSelected = answers[currentQ.id] === option;

                                    return (
                                        <label
                                            key={option}
                                            className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                                isSelected
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name={`question-${currentQ.id}`}
                                                value={option}
                                                checked={isSelected}
                                                onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                                                className="mt-1 mr-3"
                                            />
                                            <div className="flex-1">
                                                <span className="font-semibold text-gray-700">{option}.</span>
                                                <span className="ml-2 text-gray-800" dangerouslySetInnerHTML={{ __html: optionText }} />
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex items-center justify-between mt-6 pt-6 border-t">
                                <button
                                    onClick={previousQuestion}
                                    disabled={currentQuestion === 0}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ← Previous
                                </button>

                                <button
                                    onClick={nextQuestion}
                                    disabled={currentQuestion === questions.length - 1}
                                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Question Navigator */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-4 sticky top-24">
                            <h3 className="font-bold text-gray-800 mb-4">Question Navigator</h3>

                            <div className="grid grid-cols-5 gap-2 mb-4">
                                {questions.map((q, index) => {
                                    const status = getQuestionStatus(index);
                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => goToQuestion(index)}
                                            className={`w-10 h-10 rounded-lg font-medium transition-all ${
                                                index === currentQuestion
                                                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                                                    : status === 'answered'
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            {index + 1}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="space-y-2 text-sm mb-4">
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-green-100 rounded mr-2"></div>
                                    <span>Answered ({answeredCount})</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-gray-100 rounded mr-2"></div>
                                    <span>Unanswered ({questions.length - answeredCount})</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Non-blocking error toast */}
            {error && !error.isBlocking && (
                <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg max-w-md">
                    <p className="font-bold">{error.title}</p>
                    <p className="text-sm">{error.message}</p>
                    <button
                        onClick={() => setError(null)}
                        className="mt-2 text-xs underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    );
}