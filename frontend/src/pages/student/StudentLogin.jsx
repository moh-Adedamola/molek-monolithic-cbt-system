import { useState, useEffect } from 'react';
import { studentLogin, getSystemSettings } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, User, AlertCircle, Loader2 } from 'lucide-react';

export default function StudentLogin() {
    const [examCode, setExamCode] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState(null);
    const navigate = useNavigate();

    // ✅ Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await getSystemSettings();
                setSettings(res.data.settings);
                console.log('⚙️ Settings loaded:', res.data.settings);
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        };
        loadSettings();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await studentLogin({ exam_code: examCode, password });

            const activeExams = res.data.active_exams || [];

            localStorage.setItem('examCode', examCode);
            localStorage.setItem('studentName', res.data.full_name || 'Student');
            localStorage.setItem('studentClass', res.data.class || '');

            if (Array.isArray(activeExams) && activeExams.length > 0) {
                localStorage.setItem('activeExams', JSON.stringify(activeExams));
            } else {
                localStorage.removeItem('activeExams');
            }

            navigate('/exam-select');
        } catch (err) {
            const errorMessage = err.response?.data?.error ||
                err.message ||
                'Login failed. Please check your credentials and try again.';
            setError(errorMessage);

            localStorage.removeItem('examCode');
            localStorage.removeItem('studentName');
            localStorage.removeItem('activeExams');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="bg-blue-600 p-4 rounded-full shadow-lg">
                        <GraduationCap className="h-12 w-12 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    {settings?.schoolName || 'CBT Exam System'}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    {settings?.systemName || 'Enter your credentials to access your exam'}
                </p>
                {settings?.academicSession && (
                    <p className="mt-1 text-center text-xs text-gray-500">
                        {settings.academicSession} • {settings.currentTerm}
                    </p>
                )}
            </div>

            {/* Login Form */}
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border border-gray-100">
                    {/* Error Alert */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-md animate-shake">
                            <div className="flex items-start">
                                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Exam Code Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Exam Code
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={examCode}
                                    onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                                    placeholder="e.g., MOLEK-JSS1-XXXX"
                                    required
                                    autoFocus
                                    disabled={loading}
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Enter your unique exam code (Format: MOLEK-CLASS-XXXX)
                            </p>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                                    placeholder="Enter your password"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                6-character password provided by your administrator
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                    Logging in...
                                </>
                            ) : (
                                <>
                                    <GraduationCap className="h-5 w-5 mr-2" />
                                    Access Exam
                                </>
                            )}
                        </button>
                    </form>

                    {/* Help Text */}
                    <div className="mt-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            <p className="text-xs text-gray-600 font-medium">
                                Your exam session is secure and monitored
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                        Having trouble? Contact your exam administrator
                    </p>
                </div>
            </div>

            {/* Inline styles to ensure colors work */}
            <style jsx>{`
                .animate-shake {
                    animation: shake 0.5s;
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }

                .bg-blue-600 {
                    background-color: #2563eb !important;
                }

                .bg-blue-700 {
                    background-color: #1d4ed8 !important;
                }

                .text-blue-600 {
                    color: #2563eb !important;
                }

                .text-red-700 {
                    color: #b91c1c !important;
                }

                .bg-red-50 {
                    background-color: #fef2f2 !important;
                }

                .border-red-500 {
                    border-color: #ef4444 !important;
                }

                .text-red-500 {
                    color: #ef4444 !important;
                }

                .text-gray-900 {
                    color: #111827 !important;
                }

                .text-gray-700 {
                    color: #374151 !important;
                }

                .text-gray-600 {
                    color: #4b5563 !important;
                }

                .text-gray-500 {
                    color: #6b7280 !important;
                }

                .text-gray-400 {
                    color: #9ca3af !important;
                }

                .bg-white {
                    background-color: #ffffff !important;
                }

                .border-gray-300 {
                    border-color: #d1d5db !important;
                }

                .border-gray-100 {
                    border-color: #f3f4f6 !important;
                }
            `}</style>
        </div>
    );
}