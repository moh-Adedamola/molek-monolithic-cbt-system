// ===================================================================
// ExamScreen.jsx - COMPLETE WITH SETTINGS INTEGRATION
// Copy this ENTIRE file to: frontend/src/pages/student/ExamScreen.jsx
// ===================================================================

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// ✅ CHANGE 1: Added getSystemSettings import
import { getExamQuestions, submitExam, saveExamProgress, getSystemSettings } from '../../services/api';
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
    // ✅ CHANGE 2: Added settings state
    const [settings, setSettings] = useState(null);
    const timerRef = useRef(null);
    const autoSaveRef = useRef(null);
    const examCode = localStorage.getItem('examCode');

    // ✅ CHANGE 3: Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await getSystemSettings();
                setSettings(res.data.settings);
                console.log('⚙️ Settings loaded:', res.data.settings);
            } catch (error) {
                console.error('Failed to load settings:', error);
                // Use defaults if settings fail to load
                setSettings({
                    autoSubmit: true,
                    showResults: true,
                    shuffleQuestions: false
                });
            }
        };
        loadSettings();
    }, []);

    useEffect(() => {
        if (!examCode) {
            navigate('/');
            return;
        }

        loadExam();

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (autoSaveRef.current) {
                clearInterval(autoSaveRef.current);
            }
        };
    }, [subject, examCode, navigate]);

    useEffect(() => {
        if (questions.length > 0 && Object.keys(answers).length > 0) {
            if (autoSaveRef.current) {
                clearInterval(autoSaveRef.current);
            }

            autoSaveRef.current = setInterval(() => {
                saveProgress();
            }, 10000);

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
            const savedAnswers = res.data.saved_answers || {};

            console.log('⏱️  Exam loaded:');
            console.log('   Subject:', subject);
            console.log('   Started at:', examStartedAt);
            console.log('   Time remaining:', backendTimeRemaining, 'seconds');
            console.log('   Questions:', fetchedQuestions.length);
            console.log('   Saved answers:', Object.keys(savedAnswers).length);

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
        } finally {
            setSaving(false);
        }
    };

    // ✅ CHANGE 4: Updated startTimer to check autoSubmit setting
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

                // ✅ CHANGED: Check setting before auto-submit
                if (settings?.autoSubmit !== false) {
                    alert('⏰ Time is up! Your exam will be auto-submitted.');
                    handleSubmit(true);
                } else {
                    alert('⏰ Time is up! Please submit your exam.');
                }
            }
        }, 1000);
    };

    const handleAnswer = (qId, option) => {
        setAnswers(prev => ({ ...prev, [qId]: option }));
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

    // ✅ CHANGE 5: Updated handleSubmit to check showResults setting
    const handleSubmit = async (isAutoSubmit = false) => {
        if (submitting) return;

        const unanswered = questions.length - Object.keys(answers).length;

        if (!isAutoSubmit && unanswered > 0) {
            setShowSubmitDialog(true);
            return;
        }

        setSubmitting(true);

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

            // ✅ CHANGED: Show results based on setting
            let message = '✅ Exam Submitted Successfully!';

            if (settings?.showResults !== false && res.data.score !== undefined) {
                const percentage = res.data.percentage;
                const grade = percentage >= 70 ? 'A' :
                    percentage >= 60 ? 'B' :
                        percentage >= 50 ? 'C' :
                            percentage >= 40 ? 'D' : 'F';

                message += `\n\nScore: ${res.data.score}/${res.data.total}`;
                message += `\nPercentage: ${percentage}%`;
                message += `\nGrade: ${grade}`;
                console.log('✅ Results shown to student (setting enabled)');
            } else {
                message += '\n\nYour results will be available from your teacher.';
                console.log('✅ Results hidden from student (setting disabled)');
            }

            alert(message);

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

    // ✅ CHANGE 6: Wait for settings to load
    if (loading || !settings) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading exam{!settings ? ' and settings' : ''}...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/exam-select')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Return to Exam Selection
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const answeredCount = Object.keys(answers).length;

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimeSinceSaved = () => {
        if (!lastSaved) return '';
        const seconds = Math.floor((new Date() - lastSaved) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        return `${Math.floor(seconds / 60)}m ago`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{subject}</h1>
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
                        <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                {currentQuestionIndex + 1}
                            </span>
                            <p className="text-lg text-gray-900 flex-1">
                                {currentQuestion.question_text}
                            </p>
                        </div>
                    </div>

                    {/* Options */}
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