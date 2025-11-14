import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';

export default function ExamSelect() {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        try {
            const stored = localStorage.getItem('activeExams');
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
        }
        setLoading(false);
    }, [navigate]);

    if (loading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading exams...</div>;
    }

    if (exams.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
                <h2 className="text-2xl font-bold mb-2">No Active Exams</h2>
                <p className="text-gray-600 mb-4">No exams available. Contact your admin.</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                    Back to Login
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <h2 className="text-2xl font-bold mb-6">Select Exam to Take</h2>
            <div className="space-y-4 max-w-md w-full">
                {exams.map((exam, index) => (
                    <button
                        key={exam.subject || index}  // Fixed: Use exam.subject as key (string)
                        onClick={() => {
                            localStorage.setItem('examDuration', exam.duration_minutes);
                            navigate(`/exam/${exam.subject}`);
                        }}
                        className="block w-full py-3 px-6 bg-white border border-gray-300 rounded-md shadow-sm text-left font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-lg">{exam.subject}</span>
                            <span className="flex items-center gap-1 text-sm text-gray-500">
                                <Clock size={14} />
                                {exam.duration_minutes} min
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}