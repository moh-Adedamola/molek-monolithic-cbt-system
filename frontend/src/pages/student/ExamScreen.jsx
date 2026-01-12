// frontend/src/pages/student/ExamScreen.jsx
// ✅ COMPLETE PRODUCTION-READY CODE WITH FULLSCREEN MODE

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamQuestions, submitExam, saveExamProgress, getSystemSettings } from '../../services/api';
import { Clock, ArrowLeft, ArrowRight, AlertCircle, CheckCircle, Circle, Loader2, Save, Image as ImageIcon } from 'lucide-react';

export default function ExamScreen() {
    const { subject } = useParams();
    const navigate = useNavigate();

    // Core state
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
    const [settings, setSettings] = useState(null);

    const timerRef = useRef(null);
    const autoSaveRef = useRef(null);
    const admissionNumber = localStorage.getItem('admissionNumber');

    // ============================================
    // ✅ FULLSCREEN MODE - Load Settings
    // ============================================
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await getSystemSettings();
                setSettings(res.data.settings);
                console.log('⚙️ Settings loaded:', res.data.settings);
            } catch (error) {
                console.error('Failed to load settings:', error);
                setSettings({
                    autoSubmit: true,
                    showResults: true,
                    shuffleQuestions: false
                });
            }
        };
        loadSettings();
    }, []);

    // ============================================
    // Load Exam and Setup
    // ============================================
    useEffect(() => {
        if (!admissionNumber) {
            navigate('/');
            return;
        }

        loadExam();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveRef.current) clearInterval(autoSaveRef.current);
        };
    }, [subject, admissionNumber, navigate]);

    // ============================================
    // ✅ FULLSCREEN MODE - Enter when exam loads
    // ============================================
    useEffect(() => {
        const enterFullscreenMode = async () => {
            if (window.electronAPI && window.electronAPI.startExamMode) {
                try {
                    console.log('🔒 Entering fullscreen kiosk mode...');
                    await window.electronAPI.startExamMode();
                } catch (error) {
                    console.error('Failed to enter fullscreen mode:', error);
                }
            } else {
                // Fallback for browser (not Electron)
                console.log('⚠️  Running in browser - fullscreen mode not available');
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.warn('Fullscreen request failed:', err);
                    });
                }
            }
        };

        if (questions.length > 0 && !loading) {
            enterFullscreenMode();
        }
    }, [questions, loading]);

    // ============================================
    // Auto-Save Setup
    // ============================================
    useEffect(() => {
        if (questions.length > 0 && Object.keys(answers).length > 0) {
            if (autoSaveRef.current) clearInterval(autoSaveRef.current);

            autoSaveRef.current = setInterval(() => {
                saveProgress();
            }, 10000); // Auto-save every 10 seconds

            return () => {
                if (autoSaveRef.current) clearInterval(autoSaveRef.current);
            };
        }
    }, [answers, questions]);

    const loadExam = async () => {
        try {
            setLoading(true);
            setError('');

            const res = await getExamQuestions(subject, admissionNumber);
            const fetchedQuestions = res.data.questions || [];

            if (fetchedQuestions.length === 0) {
                setError('No questions available for this exam.');
                setTimeout(() => navigate('/exam-select'), 2000);
                return;
            }

            setQuestions(fetchedQuestions);

            const backendTimeRemaining = res.data.time_remaining;
            const savedAnswers = res.data.saved_answers || {};

            console.log('⏱️  Exam loaded:');
            console.log('   Subject:', subject);
            console.log('   Time remaining:', backendTimeRemaining, 'seconds');
            console.log('   Questions:', fetchedQuestions.length);
            console.log('   Saved answers:', Object.keys(savedAnswers).length);

            // Log question types
            const mcqCount = fetchedQuestions.filter(q => q.question_type === 'mcq').length;
            const theoryCount = fetchedQuestions.length - mcqCount;
            console.log(`   📊 MCQ: ${mcqCount}, Theory: ${theoryCount}`);

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

    const saveProgress = async () => {
        if (Object.keys(answers).length === 0 || submitting) return;

        try {
            setSaving(true);
            await saveExamProgress({
                admission_number: admissionNumber,
                subject,
                answers
            });
            setLastSaved(new Date());
            console.log(`💾 Auto-saved ${Object.keys(answers).length} answers`);
        } catch (err) {
            console.error('❌ Auto-save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const startTimer = (initialSeconds) => {
        if (timerRef.current) clearInterval(timerRef.current);

        let seconds = initialSeconds;

        timerRef.current = setInterval(() => {
            seconds--;
            setTimeLeft(seconds);

            if (seconds <= 0) {
                clearInterval(timerRef.current);
                if (settings?.autoSubmit !== false) {
                    alert('⏰ Time is up! Your exam will be submitted automatically.');
                    handleSubmit(true);
                }
            }
        }, 1000);
    };

    const handleAnswer = (questionId, answer) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handleSubmit = async (isAutoSubmit = false) => {
        const answeredCount = Object.keys(answers).length;

        if (!isAutoSubmit && answeredCount < questions.length) {
            setShowSubmitDialog(true);
            return;
        }

        try {
            setSubmitting(true);

            const res = await submitExam({
                admission_number: admissionNumber,
                subject,
                answers,
                is_auto_submit: isAutoSubmit
            });

            console.log('✅ Exam submitted:', res.data);

            // ============================================
            // ✅ EXIT FULLSCREEN MODE after submission
            // ============================================
            if (window.electronAPI && window.electronAPI.exitExamMode) {
                try {
                    await window.electronAPI.exitExamMode();
                    console.log('✅ Exited fullscreen mode');
                } catch (error) {
                    console.error('Failed to exit fullscreen:', error);
                }
            } else {
                // Exit browser fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(err => {
                        console.warn('Exit fullscreen failed:', err);
                    });
                }
            }

            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveRef.current) clearInterval(autoSaveRef.current);

            if (settings?.showResults !== false) {
                navigate('/exam-result', {
                    state: {
                        score: res.data.score,
                        totalQuestions: res.data.total_questions,
                        totalPoints: res.data.total_possible_points,
                        subject,
                        autoSubmitted: isAutoSubmit
                    }
                });
            } else {
                navigate('/exam-select', {
                    state: {
                        message: 'Exam submitted successfully!'
                    }
                });
            }
        } catch (err) {
            console.error('❌ Submit error:', err);
            setError(err.response?.data?.error || 'Failed to submit exam');
            setSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimeSinceSaved = () => {
        if (!lastSaved) return '';
        const seconds = Math.floor((new Date() - lastSaved) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m ago`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading exam...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
                    <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const answeredCount = Object.keys(answers).length;
    const progress = (answeredCount / questions.length) * 100;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-md sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{subject}</h1>
                            <p className="text-sm text-gray-600">
                                Question {currentQuestionIndex + 1} of {questions.length} •
                                Answered: {answeredCount}/{questions.length}
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            {lastSaved && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <span>Saved {getTimeSinceSaved()}</span>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                                timeLeft <= 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                                <Clock className="h-5 w-5" />
                                <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Question */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="mb-6">
                        <div className="flex items-start gap-3 mb-4">
                            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                {currentQuestionIndex + 1}
                            </span>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                        currentQuestion.question_type === 'mcq'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-purple-100 text-purple-700'
                                    }`}>
                                        {currentQuestion.question_type === 'mcq' ? 'Multiple Choice' : 'Theory'}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                        {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
                                    </span>
                                </div>
                                <p className="text-lg text-gray-900">
                                    {currentQuestion.question_text}
                                </p>
                            </div>
                        </div>

                        {/* Image if exists */}
                        {currentQuestion.image_url && (
                            <div className="mt-4 mb-6">
                                <img
                                    src={`http://localhost:5000${currentQuestion.image_url}`}
                                    alt="Question"
                                    className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        console.error('Failed to load image:', currentQuestion.image_url);
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* ============================================ */}
                    {/* ✅ ANSWER INTERFACE - Auto-detect MCQ/Theory */}
                    {/* ============================================ */}
                    {currentQuestion.question_type === 'mcq' ? (
                        /* MCQ: Radio Buttons */
                        <div className="space-y-3">
                            {['A', 'B', 'C', 'D'].map(option => (
                                <button
                                    key={option}
                                    onClick={() => handleAnswer(currentQuestion.id, option)}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                        answers[currentQuestion.id] === option
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                            answers[currentQuestion.id] === option
                                                ? 'border-blue-600 bg-blue-600'
                                                : 'border-gray-300'
                                        }`}>
                                            {answers[currentQuestion.id] === option && (
                                                <CheckCircle className="h-4 w-4 text-white" />
                                            )}
                                        </span>
                                        <span className="font-semibold text-gray-700">{option}.</span>
                                        <span className="text-gray-900">
                                            {currentQuestion[`option_${option.toLowerCase()}`]}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* Theory: Textarea */
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Answer:
                            </label>
                            <textarea
                                value={answers[currentQuestion.id] || ''}
                                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                                placeholder="Type your answer here..."
                                rows={8}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all"
                            />
                            <p className="mt-2 text-sm text-gray-500">
                                {answers[currentQuestion.id]?.length || 0} characters
                            </p>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t">
                        <button
                            onClick={handlePrev}
                            disabled={currentQuestionIndex === 0}
                            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Previous
                        </button>

                        <div className="flex gap-3">
                            {currentQuestionIndex === questions.length - 1 ? (
                                <button
                                    onClick={() => handleSubmit(false)}
                                    disabled={submitting}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Exam'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Next
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Question Navigator */}
                <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Question Navigator</h3>
                    <div className="grid grid-cols-10 gap-2">
                        {questions.map((q, idx) => (
                            <button
                                key={q.id}
                                onClick={() => setCurrentQuestionIndex(idx)}
                                className={`w-10 h-10 rounded-lg font-semibold ${
                                    idx === currentQuestionIndex
                                        ? 'bg-blue-600 text-white'
                                        : answers[q.id]
                                            ? 'bg-green-100 text-green-700 border-2 border-green-300'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Submit Dialog */}
            {showSubmitDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="h-6 w-6 text-yellow-600" />
                            <h3 className="text-lg font-bold">Unanswered Questions</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            You have {questions.length - answeredCount} unanswered question(s).
                            Are you sure you want to submit?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSubmitDialog(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={() => {
                                    setShowSubmitDialog(false);
                                    handleSubmit(false);
                                }}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Submit Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}