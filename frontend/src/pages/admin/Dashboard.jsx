import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    GraduationCap,
    BookOpen,
    ClipboardList,
    TrendingUp,
    CheckCircle,
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { getDashboardStats, getRecentSubmissions } from '../../services/api';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalExams: 0,
        activeExams: 0,
        completedExams: 0,
        totalSubjects: 0,
    });
    const [recentSubmissions, setRecentSubmissions] = useState([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Load stats
            const statsResponse = await getDashboardStats();
            setStats(statsResponse.data || {
                totalStudents: 0,
                totalExams: 0,
                activeExams: 0,
                completedExams: 0,
                totalSubjects: 0
            });

            // Load recent submissions
            const submissionsResponse = await getRecentSubmissions({ limit: 10 });
            setRecentSubmissions(submissionsResponse.data?.submissions || []);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            setStats({
                totalStudents: 0,
                totalExams: 0,
                activeExams: 0,
                completedExams: 0,
                totalSubjects: 0
            });
            setRecentSubmissions([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 py-6 px-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-600">Welcome back! Here's your overview.</p>
                </div>
                <Button onClick={() => loadDashboardData()} variant="outline">
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <Card title="Total Students" value={stats.totalStudents} icon={GraduationCap} />
                <Card title="Total Exams" value={stats.totalExams} icon={ClipboardList} />
                <Card title="Active Exams" value={stats.activeExams} icon={TrendingUp} />
                <Card title="Completed" value={stats.completedExams} icon={CheckCircle} />
                <Card title="Subjects" value={stats.totalSubjects} icon={BookOpen} />
            </div>

            {/* Quick Actions */}
            <Card>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/admin/students')}
                        className="flex flex-col items-center gap-2 p-4"
                    >
                        <GraduationCap className="h-6 w-6" />
                        <span className="text-sm">Manage Students</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/admin/questions')}
                        className="flex flex-col items-center gap-2 p-4"
                    >
                        <BookOpen className="h-6 w-6" />
                        <span className="text-sm">Question Bank</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/admin/exams')}
                        className="flex flex-col items-center gap-2 p-4"
                    >
                        <ClipboardList className="h-6 w-6" />
                        <span className="text-sm">Manage Exams</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/admin/results')}
                        className="flex flex-col items-center gap-2 p-4"
                    >
                        <CheckCircle className="h-6 w-6" />
                        <span className="text-sm">View Results</span>
                    </Button>
                </div>
            </Card>

            {/* Recent Activity */}
            <Card>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Submissions</h3>
                {loading ? (
                    <p className="text-gray-500">Loading...</p>
                ) : recentSubmissions.length === 0 ? (
                    <p className="text-gray-500">No recent submissions</p>
                ) : (
                    <div className="space-y-3">
                        {recentSubmissions.map((sub, idx) => {
                            const percentage = Math.round((sub.score / sub.total_questions) * 100);
                            return (
                                <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {sub.first_name} {sub.last_name}
                                        </p>
                                        <p className="text-sm text-gray-500">{sub.subject}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{sub.score}/{sub.total_questions}</p>
                                        <Badge variant={percentage >= 70 ? 'success' : percentage >= 50 ? 'warning' : 'error'} size="sm">
                                            {percentage}%
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AdminDashboard;