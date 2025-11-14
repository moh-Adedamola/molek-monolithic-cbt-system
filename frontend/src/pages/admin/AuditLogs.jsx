import { useState, useEffect } from 'react';
import { Download,  Search,  Filter,  Clock,  User,  FileText,  Shield,  AlertCircle, CheckCircle, XCircle,  Eye, Calendar,
} from 'lucide-react';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Alert from '../../components/common/Alert';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Card from '../../components/common/Card';

const ACTION_TYPES = [
  'user_login',
  'user_logout',
  'user_created',
  'user_updated',
  'user_deleted',
  'student_created',
  'student_updated',
  'student_deleted',
  'exam_created',
  'exam_updated',
  'exam_deleted',
  'exam_published',
  'exam_started',
  'exam_submitted',
  'result_published',
  'settings_changed',
  'password_changed',
];

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    action_type: '',
    user_role: '',
    status: '',
    date_from: '',
    date_to: '',
    search: '',
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    success: 0,
    failed: 0,
  });

  useEffect(() => {
    loadAuditLogs();
  }, [filters]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);

      // In production, this would be a real API call
      // const response = await dashboardService.getActivityLogs(filters);

      // Mock data
      const mockLogs = [
        {
          id: 1,
          user_email: 'admin@school.com',
          user_role: 'admin',
          action_type: 'user_login',
          action_description: 'User logged in successfully',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'success',
          created_at: new Date().toISOString(),
          metadata: { browser: 'Chrome', os: 'Windows' },
        },
        {
          id: 2,
          user_email: 'teacher@school.com',
          user_role: 'teacher',
          action_type: 'exam_created',
          action_description: 'Created exam: Mathematics CA Test 1',
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'success',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          metadata: { exam_name: 'Mathematics CA Test 1', class: 'SS1' },
        },
        {
          id: 3,
          user_email: 'student@school.com',
          user_role: 'student',
          action_type: 'user_login',
          action_description: 'Failed login attempt: incorrect password',
          ip_address: '192.168.1.102',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'failed',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          metadata: { reason: 'incorrect_password', attempts: 3 },
        },
        {
          id: 4,
          user_email: 'admin@school.com',
          user_role: 'admin',
          action_type: 'student_created',
          action_description: 'Created student: John Doe (JSS1)',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'success',
          created_at: new Date(Date.now() - 10800000).toISOString(),
          metadata: { student_name: 'John Doe', class: 'JSS1' },
        },
        {
          id: 5,
          user_email: 'admin@school.com',
          user_role: 'admin',
          action_type: 'settings_changed',
          action_description: 'Updated system settings: Security',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'success',
          created_at: new Date(Date.now() - 14400000).toISOString(),
          metadata: { section: 'security', changes: ['session_timeout', 'max_login_attempts'] },
        },
        {
          id: 6,
          user_email: 'teacher@school.com',
          user_role: 'teacher',
          action_type: 'exam_published',
          action_description: 'Published exam: English CA Test 1',
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'success',
          created_at: new Date(Date.now() - 18000000).toISOString(),
          metadata: { exam_name: 'English CA Test 1', class: 'SS2' },
        },
        {
          id: 7,
          user_email: 'student@school.com',
          user_role: 'student',
          action_type: 'exam_started',
          action_description: 'Started exam: Biology Midterm',
          ip_address: '192.168.1.103',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'success',
          created_at: new Date(Date.now() - 21600000).toISOString(),
          metadata: { exam_name: 'Biology Midterm', session_id: 'abc123' },
        },
        {
          id: 8,
          user_email: 'admin@school.com',
          user_role: 'admin',
          action_type: 'user_deleted',
          action_description: 'Deleted user: old.teacher@school.com',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'success',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          metadata: { deleted_email: 'old.teacher@school.com', role: 'teacher' },
        },
        {
          id: 9,
          user_email: 'teacher@school.com',
          user_role: 'teacher',
          action_type: 'result_published',
          action_description: 'Published results for Chemistry CA Test',
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'success',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          metadata: { exam_name: 'Chemistry CA Test', students_count: 45 },
        },
        {
          id: 10,
          user_email: 'unknown@school.com',
          user_role: null,
          action_type: 'user_login',
          action_description: 'Failed login attempt: user not found',
          ip_address: '192.168.1.200',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'failed',
          created_at: new Date(Date.now() - 259200000).toISOString(),
          metadata: { reason: 'user_not_found' },
        },
      ];

      setLogs(mockLogs);

      // Calculate stats
      const today = mockLogs.filter((log) => {
        const logDate = new Date(log.created_at);
        const todayDate = new Date();
        return logDate.toDateString() === todayDate.toDateString();
      }).length;

      const success = mockLogs.filter((log) => log.status === 'success').length;
      const failed = mockLogs.filter((log) => log.status === 'failed').length;

      setStats({
        total: mockLogs.length,
        today,
        success,
        failed,
      });

      // Uncomment when backend is ready:
      // const response = await dashboardService.getActivityLogs(filters);
      // setLogs(response.data?.logs || response.data || []);
    } catch (error) {
      showAlert('error', error.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setIsDetailsModalOpen(true);
  };

  const handleExportLogs = (format) => {
    showAlert('info', `Exporting logs as ${format.toUpperCase()}...`);
    // Implementation for export
  };

  const getActionIcon = (actionType) => {
    if (actionType.includes('login') || actionType.includes('logout')) {
      return User;
    }
    if (actionType.includes('exam')) {
      return FileText;
    }
    if (actionType.includes('settings') || actionType.includes('password')) {
      return Shield;
    }
    return FileText;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'teacher':
        return 'info';
      case 'student':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatActionType = (actionType) => {
    return actionType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const columns = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (value, row) => {
        const date = new Date(row.created_at);
        return (
          <div className="text-sm">
            <p className="text-gray-900">{date.toLocaleDateString()}</p>
            <p className="text-gray-500">{date.toLocaleTimeString()}</p>
          </div>
        );
      },
    },
    {
      key: 'user',
      label: 'User',
      render: (value, row) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{row.user_email || 'Unknown'}</p>
          {row.user_role && (
            <Badge variant={getRoleColor(row.user_role)} size="sm">
              {row.user_role}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (value, row) => {
        const Icon = getActionIcon(row.action_type);
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-900">{formatActionType(row.action_type)}</span>
          </div>
        );
      },
    },
    {
      key: 'description',
      label: 'Description',
      render: (value, row) => (
        <p className="max-w-md truncate text-sm text-gray-600">{row.action_description}</p>
      ),
    },
    {
      key: 'ipAddress',
      label: 'IP Address',
      render: (value, row) => (
        <span className="font-mono text-sm text-gray-600">{row.ip_address}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value, row) => (
        <Badge variant={getStatusColor(row.status)}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          onClick={() => handleViewDetails(row)}
          className="rounded p-1 text-blue-600 hover:bg-blue-50"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track all system activities for security and compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handleExportLogs('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => handleExportLogs('pdf')}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card
          title="Total Logs"
          value={stats.total}
          icon={FileText}
          className="border-l-4 border-l-blue-500"
        />
        <Card
          title="Today"
          value={stats.today}
          icon={Clock}
          className="border-l-4 border-l-purple-500"
        />
        <Card
          title="Successful"
          value={stats.success}
          icon={CheckCircle}
          className="border-l-4 border-l-green-500"
        />
        <Card
          title="Failed"
          value={stats.failed}
          icon={XCircle}
          className="border-l-4 border-l-red-500"
        />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700">Filters</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <Select
            label="Action Type"
            value={filters.action_type}
            onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
            options={[
              { value: '', label: 'All Actions' },
              ...ACTION_TYPES.map((type) => ({
                value: type,
                label: formatActionType(type),
              })),
            ]}
          />

          <Select
            label="User Role"
            value={filters.user_role}
            onChange={(e) => setFilters({ ...filters, user_role: e.target.value })}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'admin', label: 'Admin' },
              { value: 'teacher', label: 'Teacher' },
              { value: 'student', label: 'Student' },
            ]}
          />

          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            options={[
              { value: '', label: 'All Status' },
              { value: 'success', label: 'Success' },
              { value: 'failed', label: 'Failed' },
              { value: 'warning', label: 'Warning' },
            ]}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date From</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date To</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() =>
                setFilters({
                  action_type: '',
                  user_role: '',
                  status: '',
                  date_from: '',
                  date_to: '',
                  search: '',
                })
              }
              className="w-full"
            >
              Clear All
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <Input
            placeholder="Search by email, IP address, or description..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <Table
          columns={columns}
          data={logs}
          loading={loading}
          emptyMessage="No audit logs found"
        />
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Audit Log Details"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Action</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatActionType(selectedLog.action_type)}
                  </p>
                </div>
                <Badge variant={getStatusColor(selectedLog.status)} size="lg">
                  {selectedLog.status.charAt(0).toUpperCase() + selectedLog.status.slice(1)}
                </Badge>
              </div>
            </div>

            {/* User Information */}
            <div>
              <h4 className="mb-3 font-semibold text-gray-900">User Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="mt-1 text-gray-900">{selectedLog.user_email || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Role</p>
                  <div className="mt-1">
                    {selectedLog.user_role ? (
                      <Badge variant={getRoleColor(selectedLog.user_role)}>
                        {selectedLog.user_role}
                      </Badge>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Details */}
            <div>
              <h4 className="mb-3 font-semibold text-gray-900">Action Details</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-600">Description</p>
                  <p className="mt-1 text-gray-900">{selectedLog.action_description}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Timestamp</p>
                  <p className="mt-1 text-gray-900">
                    {new Date(selectedLog.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div>
              <h4 className="mb-3 font-semibold text-gray-900">Technical Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">IP Address</p>
                  <p className="mt-1 font-mono text-sm text-gray-900">{selectedLog.ip_address}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">User Agent</p>
                  <p className="mt-1 truncate text-sm text-gray-900">{selectedLog.user_agent}</p>
                </div>
              </div>
            </div>

            {/* Metadata */}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div>
                <h4 className="mb-3 font-semibold text-gray-900">Additional Information</h4>
                <div className="rounded-lg bg-gray-50 p-4">
                  <pre className="text-sm text-gray-900">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsDetailsModalOpen(false)}>
                Close
              </Button>
              <Button onClick={() => handleExportLogs('pdf')}>
                <Download className="mr-2 h-4 w-4" />
                Export This Log
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogs;