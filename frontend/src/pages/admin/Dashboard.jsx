import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    GraduationCap,
    BookOpen,
    ClipboardList,
    TrendingUp,
    CheckCircle,
    Award,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { dashboardService } from '../../services/services';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalStudents: 0,
        totalSubjects: 0,
        totalExams: 0,
        activeExams: 0,
        completedExams: 0,
    });
    const [upcomingExams, setUpcomingExams] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [performanceData, setPerformanceData] = useState([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Load stats
            const statsResponse = await dashboardService.getStats();
            setStats(statsResponse.data || {
                totalUsers: 0,
                totalStudents: 0,
                totalSubjects: 0,
                totalExams: 0,
                activeExams: 0,
                completedExams: 0
            });

            // Load upcoming exams
            const examsResponse = await dashboardService.getUpcomingExams({ limit: 5 });
            setUpcomingExams(examsResponse.data?.exams || []);

            // Load recent activity
            const activityResponse = await dashboardService.getRecentActivity({ limit: 10 });
            setRecentActivity(activityResponse.data?.activities || []);

            // Load performance data
            const performanceResponse = await dashboardService.getPerformanceData();
            setPerformanceData(performanceResponse.data?.performance || []);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            // Set empty data on error to avoid crashes
            setStats({
                totalUsers: 0,
                totalStudents: 0,
                totalSubjects: 0,
                totalExams: 0,
                activeExams: 0,
                completedExams: 0
            });
            setUpcomingExams([]);
            setRecentActivity([]);
            setPerformanceData([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 py-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-600">Welcome back! Here's what's happening.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                <Card title="Total Students" value={stats.totalStudents} icon={GraduationCap} />
                <Card title="Total Exams" value={stats.totalExams} icon={ClipboardList} />
                <Card title="Active Exams" value={stats.activeExams} icon={TrendingUp} />
                <Card title="Completed" value={stats.completedExams} icon={CheckCircle} />
                <Card title="Subjects" value={stats.totalSubjects} icon={BookOpen} />
                <Card title="Users" value={stats.totalUsers} icon={Users} />
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
                        Manage Students
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/admin/questions')}
                        className="flex flex-col items-center gap-2 p-4"
                    >
                        <BookOpen className="h-6 w-6" />
                        Question Bank
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/admin/exams')}
                        className="flex flex-col items-center gap-2 p-4"
                    >
                        <ClipboardList className="h-6 w-6" />
                        Manage Exams
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/admin/results')}
                        className="flex flex-col items-center gap-2 p-4"
                    >
                        <Award className="h-6 w-6" />
                        View Results
                    </Button>
                </div>
            </Card>

            {/* Charts & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Performance Trend">
                    {loading ? (
                        <div className="flex h-[300px] items-center justify-center">
                            <p className="text-gray-500">Loading...</p>
                        </div>
                    ) : performanceData.length === 0 ? (
                        <div className="flex h-[300px] items-center justify-center">
                            <p className="text-gray-500">No performance data available</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={performanceData}>
                                <Line type="monotone" dataKey="avgScore" stroke="#3b82f6" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                <Card title="Recent Activity">
                    {loading ? (
                        <p className="text-gray-500">Loading...</p>
                    ) : recentActivity.length === 0 ? (
                        <p className="text-gray-500">No recent activity</p>
                    ) : (
                        <div className="space-y-2">
                            {recentActivity.map(activity => (
                                <div key={activity.id} className="text-sm text-gray-700 border-b pb-2">
                                    <p>{activity.action}</p>
                                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card title="Upcoming Exams">
                    {loading ? (
                        <p className="text-gray-500">Loading...</p>
                    ) : upcomingExams.length === 0 ? (
                        <p className="text-gray-500">No upcoming exams</p>
                    ) : (
                        <div className="space-y-2">
                            {upcomingExams.map(exam => (
                                <div key={exam.id} className="text-sm text-gray-700 border-b pb-2">
                                    <p className="font-medium">{exam.exam_name || exam.examName}</p>
                                    <p className="text-xs text-gray-500">
                                        {exam.subject_name || exam.subjectName} • {exam.start_time || exam.startTime}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;