import { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Alert from '../../components/common/Alert';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { examService, dashboardService } from '../../services/services';

const ExamMonitoring = () => {
  const [activeExams, setActiveExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
  });

  // Load data on mount and set up auto-refresh
  useEffect(() => {
    loadActiveExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      loadExamSessions();
    }
  }, [selectedExam]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (autoRefresh && selectedExam) {
      const interval = setInterval(() => {
        refreshData();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedExam]);

  const loadActiveExams = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getActiveExams();
      const exams = response.data?.exams || response.data || [];
      setActiveExams(exams);

      // Auto-select first exam if available
      if (exams.length > 0 && !selectedExam) {
        setSelectedExam(exams[0].id);
      }
    } catch (error) {
      showAlert('error', error.message || 'Failed to load active exams');
    } finally {
      setLoading(false);
    }
  };

  const loadExamSessions = async () => {
    try {
      const [sessionsRes, alertsRes] = await Promise.all([
        examService.getSessions(selectedExam),
        dashboardService.getAlerts({ exam_id: selectedExam, status: 'unresolved' }),
      ]);

      const sessions = sessionsRes.data?.sessions || sessionsRes.data || [];
      setActiveSessions(sessions);

      const alertsList = alertsRes.data?.alerts || alertsRes.data || [];
      setAlerts(alertsList);

      // Calculate stats
      const completed = sessions.filter((s) => s.status === 'completed').length;
      const inProgress = sessions.filter((s) => s.status === 'in_progress').length;
      const notStarted = sessions.filter((s) => s.status === 'not_started').length;

      setStats({
        totalStudents: sessions.length,
        completed,
        inProgress,
        notStarted,
      });
    } catch (error) {
      console.error('Failed to load exam sessions:', error);
    }
  };

  const refreshData = async () => {
    if (!selectedExam) return;

    try {
      setRefreshing(true);
      await loadExamSessions();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await dashboardService.resolveAlert(alertId);
      showAlert('success', 'Alert resolved successfully');
      loadExamSessions();
    } catch (error) {
      showAlert('error', 'Failed to resolve alert');
    }
  };

  const getTimeElapsed = (startTime) => {
    if (!startTime) return '-';
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000 / 60); // minutes
    return `${diff} min`;
  };

  const getTimeRemaining = (endTime) => {
    if (!endTime) return '-';
    const end = new Date(endTime);
    const now = new Date();
    const diff = Math.floor((end - now) / 1000 / 60); // minutes
    
    if (diff < 0) return 'Expired';
    if (diff < 10) return `${diff} min (Critical)`;
    return `${diff} min`;
  };

  const getProgressPercentage = (session) => {
    const answered = session.answered_questions || session.answeredQuestions || 0;
    const total = session.total_questions || session.totalQuestions || 1;
    return Math.round((answered / total) * 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_progress':
        return 'info';
      case 'completed':
        return 'success';
      case 'not_started':
        return 'default';
      default:
        return 'default';
    }
  };

  // Filter sessions
  const filteredSessions = activeSessions.filter((session) => {
    const matchesSearch =
      !searchTerm ||
      (session.student_name || session.studentName || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (session.admission_number || session.admissionNumber || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || session.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (activeExams.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Monitor className="h-16 w-16 text-gray-400" />
        <p className="mt-4 text-lg font-medium text-gray-600">No Active Exams</p>
        <p className="mt-2 text-sm text-gray-500">
          There are no exams currently in progress
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Exam Monitoring</h1>
          <p className="mt-1 text-sm text-gray-600">
            Real-time monitoring of active exam sessions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh (10s)</span>
          </label>
          <Button
            variant="secondary"
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Exam Selector */}
      <div className="card">
        <Select
          label="Select Exam to Monitor"
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          options={activeExams.map((exam) => ({
            value: exam.id,
            label: `${exam.exam_name || exam.examName} - ${exam.class_level || exam.classLevel}`,
          }))}
        />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          className="border-l-4 border-l-blue-500"
        />
        <Card
          title="In Progress"
          value={stats.inProgress}
          icon={Clock}
          className="border-l-4 border-l-yellow-500"
        />
        <Card
          title="Completed"
          value={stats.completed}
          icon={CheckCircle}
          className="border-l-4 border-l-green-500"
        />
        <Card
          title="Not Started"
          value={stats.notStarted}
          icon={AlertTriangle}
          className="border-l-4 border-l-gray-500"
        />
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="card border-l-4 border-l-red-500">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Active Alerts ({alerts.length})
            </h3>
          </div>
          <div className="space-y-2">
            {alerts.map((alertItem) => (
              <div
                key={alertItem.id}
                className="flex items-start justify-between rounded-lg bg-red-50 p-3"
              >
                <div className="flex-1">
                  <p className="font-medium text-red-900">
                    {alertItem.alert_type || alertItem.alertType}
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    {alertItem.message || alertItem.description}
                  </p>
                  <p className="mt-1 text-xs text-red-600">
                    Student: {alertItem.student_name || alertItem.studentName} •{' '}
                    {new Date(alertItem.created_at || alertItem.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleResolveAlert(alertItem.id)}
                >
                  Resolve
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Search Student"
            placeholder="Search by name or admission number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select
            label="Status Filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'not_started', label: 'Not Started' },
            ]}
          />
        </div>
      </div>

      {/* Sessions Table */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Student Sessions ({filteredSessions.length})
        </h3>

        {filteredSessions.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No sessions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Time Elapsed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Time Remaining
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Last Activity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredSessions.map((session) => {
                  const progress = getProgressPercentage(session);
                  const timeRemaining = getTimeRemaining(
                    session.end_time || session.endTime
                  );
                  const isCritical = timeRemaining.includes('Critical');

                  return (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {session.student_name || session.studentName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {session.admission_number || session.admissionNumber}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusColor(session.status)}>
                          {session.status === 'in_progress'
                            ? 'In Progress'
                            : session.status === 'completed'
                            ? 'Completed'
                            : 'Not Started'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-gray-200">
                            <div
                              className="h-2 rounded-full bg-blue-600"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{progress}%</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {session.answered_questions || session.answeredQuestions || 0} /{' '}
                          {session.total_questions || session.totalQuestions} questions
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getTimeElapsed(session.start_time || session.startTime)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm ${
                            isCritical ? 'font-semibold text-red-600' : 'text-gray-600'
                          }`}
                        >
                          {timeRemaining}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {session.last_activity
                          ? new Date(session.last_activity).toLocaleTimeString()
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="rounded p-1 text-blue-600 hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamMonitoring;