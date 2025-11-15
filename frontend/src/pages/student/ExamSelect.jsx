import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, ArrowRight, LogOut, User } from 'lucide-react';

export default function ExamSelect() {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        try {
            const stored = localStorage.getItem('activeExams');
            const name = localStorage.getItem('studentName');
            setStudentName(name || 'Student');

            if (!stored) {
                console.warn('No active exams in localStorage');
                navigate('/');
                return;
            }
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed) || parsed.length === 0) {
                console.warn('Invalid or empty activeExams');
                navigate('/');
                return;
            }
            setExams(parsed);
        } catch (err) {
            console.error('Failed to parse activeExams:', err);
            navigate('/');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.clear();
            navigate('/');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your exams...</p>
                </div>
            </div>
        );
    }

    if (exams.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                    <div className="bg-yellow-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-yellow-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Exams</h2>
                    <p className="text-gray-600 mb-6">
                        There are no exams available at the moment. Please contact your administrator.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header Card */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-full">
                                <User className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Welcome, {studentName}</h1>
                                <p className="text-sm text-gray-600">Select an exam to begin</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </button>
                    </div>
                </div>

                {/* Exams List */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">
                        Available Exams ({exams.length})
                    </h2>
                    {exams.map((exam, index) => (
                        <button
                            key={exam.subject || index}
                            onClick={() => {
                                localStorage.setItem('examDuration', exam.duration_minutes);
                                navigate(`/exam/${exam.subject}`);
                            }}
                            className="group block w-full bg-white border-2 border-gray-200 rounded-lg shadow-md hover:shadow-xl hover:border-blue-400 transition-all duration-200 transform hover:-translate-y-1"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                                            <BookOpen className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                {exam.subject}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Clock className="h-4 w-4 text-gray-500" />
                                                <span className="text-sm text-gray-600">
                                                    {exam.duration_minutes} minutes
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Instructions */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Important Instructions
                    </h3>
                    <ul className="space-y-2 text-sm text-blue-800">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>Ensure you have a stable internet connection</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>Answer all questions before submitting</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>Your exam will auto-submit when time expires</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>You can only submit once per exam</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}