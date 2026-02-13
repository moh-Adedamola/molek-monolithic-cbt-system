import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentLogin, getSystemSettings } from '../../services/api';
import { UserCircle, Lock, Loader2, GraduationCap } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function StudentLogin() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        admission_number: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState(''); // FIX #1: Info message for no-exam scenarios
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        // Load system settings for display
        const loadSettings = async () => {
            try {
                const res = await getSystemSettings();
                setSettings(res.data.settings);
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        };
        loadSettings();

        // Clear ALL session data
        localStorage.removeItem('admissionNumber');
        localStorage.removeItem('activeExams');
        localStorage.removeItem('studentName');
        localStorage.removeItem('examDuration');
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
        setInfo('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.admission_number.trim() || !formData.password.trim()) {
            setError('Please enter both admission number and password');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setInfo('');

            console.log('🔐 Attempting login:', formData.admission_number);

            const res = await studentLogin({
                admission_number: formData.admission_number.trim().toUpperCase(),
                password: formData.password
            });

            console.log('✅ Login successful:', res.data);

            // Store ALL required data in localStorage
            localStorage.setItem('admissionNumber', res.data.admission_number);

            // Store student name (try multiple possible field names)
            const studentName = res.data.full_name || res.data.name ||
                `${res.data.first_name || ''} ${res.data.last_name || ''}`.trim() ||
                'Student';
            localStorage.setItem('studentName', studentName);

            // FIX #1: Check for no-exams message from backend
            if (res.data.no_exams_message) {
                setInfo(res.data.no_exams_message);
                localStorage.setItem('activeExams', JSON.stringify([]));
                console.log('ℹ️ No active exams:', res.data.no_exams_message);
                return; // Don't navigate, show message on login page
            }

            // Store active exams array
            if (res.data.active_exams && Array.isArray(res.data.active_exams)) {
                localStorage.setItem('activeExams', JSON.stringify(res.data.active_exams));
                console.log('📦 Stored active exams:', res.data.active_exams.length, 'exam(s)');
            } else {
                // If no active exams, show message instead of navigating
                setInfo('There are no exams available at the moment. Please contact your administrator.');
                localStorage.setItem('activeExams', JSON.stringify([]));
                console.log('⚠️ No active exams available');
                return;
            }

            console.log('✅ Successfully stored in localStorage');

            // Navigate to exam selection
            navigate('/exam-select');

        } catch (err) {
            console.error('❌ Login failed:', err);

            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else if (err.response?.status === 401) {
                setError('Invalid admission number or password');
            } else if (err.response?.status === 404) {
                setError('Student not found');
            } else {
                setError('Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-19 h-19 rounded-full mb-4">
                        <img alt={'molek school'} src="/logo.webp" className="h-18 w-18"/>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {settings?.schoolName || 'Molek School'}
                    </h1>
                    <p className="text-gray-600">
                        {settings?.systemName || 'CBT Examination System'}
                    </p>
                    {settings && (
                        <div className="mt-2 text-sm text-gray-500">
                            <p>{settings.academicSession} • {settings.currentTerm}</p>
                        </div>
                    )}
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                        Student Login
                    </h2>

                    {/* FIX #1: Error message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* FIX #1: Info message for no-active-exams */}
                    {info && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <span className="text-amber-500 text-xl">⚠️</span>
                                <div>
                                    <p className="text-sm font-semibold text-amber-800 mb-1">No Exams Available</p>
                                    <p className="text-sm text-amber-700">{info}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Admission Number"
                            name="admission_number"
                            type="text"
                            value={formData.admission_number}
                            onChange={handleChange}
                            placeholder="e.g., MOL/2026/001"
                            required
                            autoFocus
                            className="uppercase"
                        />

                        <Input
                            label="Password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            required
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Logging in...
                                </>
                            ) : (
                                'Login to Exam'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="text-sm text-gray-600 space-y-2">
                            <p className="flex items-start gap-2">
                                <span className="text-blue-600">ℹ️</span>
                                <span>Use your admission number and password to login</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="text-blue-600">⏰</span>
                                <span>Your exam timer starts when you begin</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="text-blue-600">💾</span>
                                <span>Your progress is automatically saved</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>Need help? Contact your administrator</p>
                </div>
            </div>
        </div>
    );
}