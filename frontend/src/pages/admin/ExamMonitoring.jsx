import { useState, useEffect } from 'react';
import { Activity, Users, Clock, CheckCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Alert from '../../components/common/Alert';
import { getActiveExamSessions } from '../../services/api';

const ExamMonitoring = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        loadSessions();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadSessions, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadSessions = async () => {
        try {
            setLoading(true);
            const response = await getActiveExamSessions();
            setSessions(response.data?.sessions || []);
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to load sessions' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {alert && (
                <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Live Exam Monitoring</h1>
                    <p className="mt-1 text-sm text-gray-600">Monitor active exam sessions in real-time</p>
                </div>
                <Badge variant="success">
                    <Activity className="h-4 w-4 mr-1 inline" />
                    Live
                </Badge>
            </div>

            {loading && sessions.length === 0 ? (
                <Card>
                    <p className="text-center text-gray-500 py-8">Loading sessions...</p>
                </Card>
            ) : sessions.length === 0 ? (
                <Card>
                    <p className="text-center text-gray-500 py-8">No active exam sessions</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessions.map((session, idx) => {
                        const completionRate = session.registered_students > 0
                            ? Math.round((session.completed_students / session.registered_students) * 100)
                            : 0;

                        return (
                            <Card key={idx}>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{session.subject}</h3>
                                        <p className="text-sm text-gray-500">{session.class}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center text-gray-600">
                                                <Users className="h-4 w-4 mr-1" />
                                                Registered
                                            </span>
                                            <span className="font-medium">{session.registered_students}</span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center text-gray-600">
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Completed
                                            </span>
                                            <span className="font-medium">{session.completed_students}</span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center text-gray-600">
                                                <Clock className="h-4 w-4 mr-1" />
                                                Duration
                                            </span>
                                            <span className="font-medium">{session.duration_minutes} min</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600">Completion</span>
                                            <span className="font-medium">{completionRate}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${completionRate}%` }}
                                            />
                                        </div>
                                    </div>

                                    <Badge
                                        variant={completionRate === 100 ? 'success' : 'info'}
                                        className="w-full justify-center"
                                    >
                                        {completionRate === 100 ? 'All Completed' : 'In Progress'}
                                    </Badge>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ExamMonitoring;