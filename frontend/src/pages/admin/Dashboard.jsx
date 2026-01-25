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
        totalSubmissions: 0,
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
            console.log('📊 Dashboard stats:', statsResponse.data);
            setStats(statsResponse.data?.stats || {
                totalStudents: 0,
                totalExams: 0,
                activeExams: 0,
                totalSubmissions: 0,
                totalSubjects: 0
            });

            // Load recent submissions
            const submissionsResponse = await getRecentSubmissions({ limit: 10 });
            console.log('📝 Recent submissions:', submissionsResponse.data);
            setRecentSubmissions(submissionsResponse.data?.submissions || []);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            setStats({
                totalStudents: 0,
                totalExams: 0,
                activeExams: 0,
                totalSubmissions: 0,
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
                <Card title="Submissions" value={stats.totalSubmissions} icon={CheckCircle} />
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
                        onClick={() => navigate('/admin/reports')}
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
                            // Handle both camelCase and snake_case field names
                            const totalQuestions = sub.totalQuestions || sub.total_questions || 0;
                            const score = sub.score || 0;

                            // Calculate raw percentage
                            let percentage = totalQuestions > 0
                                ? Math.round((score / totalQuestions) * 100)
                                : 0;

                            // Detect impossible scores (score > total possible)
                            const isImpossibleScore = score > totalQuestions;

                            // Cap percentage at 100% maximum
                            if (percentage > 100) {
                                console.warn(`⚠️  Impossible score detected for ${sub.student?.name || 'student'}: ${score}/${totalQuestions} = ${percentage}%`);
                                percentage = 100;
                            }

                            // Handle both nested (student.name) and flat structure
                            const studentName = sub.student?.name ||
                                `${sub.first_name || ''} ${sub.last_name || ''}`.trim() ||
                                'Unknown Student';

                            const studentClass = sub.student?.class || sub.class || '';

                            return (
                                <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {studentName}
                                            {isImpossibleScore && (
                                                <span
                                                    className="ml-2 text-xs text-orange-600 cursor-help"
                                                    title={`Warning: Score (${score}) exceeds total possible points (${totalQuestions})`}
                                                >
                                                    ⚠️
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {sub.subject}{studentClass && ` • ${studentClass}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-medium ${isImpossibleScore ? 'text-orange-600' : ''}`}>
                                            {score}/{totalQuestions}
                                        </p>
                                        <Badge
                                            variant={
                                                percentage >= 70 ? 'success' :
                                                    percentage >= 50 ? 'warning' :
                                                        'error'
                                            }
                                            size="sm"
                                        >
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
