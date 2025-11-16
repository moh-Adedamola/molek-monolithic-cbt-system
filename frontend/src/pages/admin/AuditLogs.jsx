import { useState, useEffect } from 'react';
import { Download, Filter, Search, RefreshCw } from 'lucide-react';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Alert from '../../components/common/Alert';
import Badge from '../../components/common/Badge';
import { getAuditLogs, getAuditStats } from '../../services/api';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        action: '',
        userType: '',
        status: '',
        fromDate: '',
        toDate: '',
        limit: 100
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [logsRes, statsRes] = await Promise.all([
                getAuditLogs(filters),
                getAuditStats()
            ]);

            setLogs(logsRes.data.logs || []);
            setStats(statsRes.data);
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to load audit logs' });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const csv = [
            ['Timestamp', 'Action', 'User Type', 'User', 'Details', 'IP Address', 'Status'].join(','),
            ...logs.map(log => [
                new Date(log.created_at).toISOString(),
                log.action,
                log.user_type,
                log.user_identifier,
                log.details.replace(/,/g, ';'),
                log.ip_address,
                log.status
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const getActionBadge = (action) => {
        if (action.includes('SUBMITTED') || action.includes('CREATED')) return 'success';
        if (action.includes('ACTIVATED')) return 'info';
        if (action.includes('DELETED')) return 'error';
        if (action.includes('FAILED')) return 'error';
        return 'default';
    };

    const getStatusBadge = (status) => {
        const variants = {
            'success': 'success',
            'failure': 'error',
            'warning': 'warning'
        };
        return variants[status] || 'default';
    };

    const columns = [
        {
            key: 'created_at',
            label: 'Timestamp',
            render: (value) => {
                const date = new Date(value);
                return (
                    <div className="text-sm">
                        <p className="font-medium text-gray-900">{date.toLocaleDateString()}</p>
                        <p className="text-gray-500">{date.toLocaleTimeString()}</p>
                    </div>
                );
            },
        },
        {
            key: 'action',
            label: 'Action',
            render: (value) => (
                <Badge variant={getActionBadge(value)} size="sm">
                    {value.replace(/_/g, ' ')}
                </Badge>
            ),
        },
        {
            key: 'user_type',
            label: 'User Type',
            render: (value) => (
                <Badge variant={value === 'admin' ? 'info' : 'default'} size="sm">
                    {value}
                </Badge>
            ),
        },
        {
            key: 'user_identifier',
            label: 'User',
            render: (value) => (
                <span className="font-medium text-gray-900">{value}</span>
            ),
        },
        {
            key: 'details',
            label: 'Details',
            render: (value) => (
                <span className="text-sm text-gray-600">{value}</span>
            ),
        },
        {
            key: 'ip_address',
            label: 'IP Address',
            render: (value) => (
                <span className="text-xs font-mono text-gray-500">{value}</span>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => (
                <Badge variant={getStatusBadge(value)} size="sm">
                    {value}
                </Badge>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {alert && (
                <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                    <p className="mt-1 text-sm text-gray-600">System activity tracking and monitoring</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={loadData} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                    <Button onClick={handleExport} variant="outline" disabled={logs.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Statistics */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    <Card title="Total Logs" value={stats.total} />
                    <Card title="Today" value={stats.today} subtitle="Activities today" />
                    <Card title="Successful" value={stats.successful} subtitle="Completed" />
                    <Card title="Failed" value={stats.failed} subtitle="Errors" />
                    <Card title="This Week" value={stats.thisWeek} subtitle="Last 7 days" />
                </div>
            )}

            {/* Filters */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search user or details..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <Select
                        value={filters.userType}
                        onChange={(e) => setFilters({ ...filters, userType: e.target.value })}
                        options={[
                            { value: '', label: 'All User Types' },
                            { value: 'admin', label: 'Admin' },
                            { value: 'student', label: 'Student' },
                        ]}
                    />
                    <Select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        options={[
                            { value: '', label: 'All Status' },
                            { value: 'success', label: 'Success' },
                            { value: 'failure', label: 'Failure' },
                            { value: 'warning', label: 'Warning' },
                        ]}
                    />
                    <Button onClick={loadData} className="w-full">
                        Apply Filters
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        type="date"
                        label="From Date"
                        value={filters.fromDate}
                        onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                    />
                    <Input
                        type="date"
                        label="To Date"
                        value={filters.toDate}
                        onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                    />
                </div>
            </Card>

            {/* Logs Table */}
            <div className="card">
                <Table
                    columns={columns}
                    data={logs}
                    loading={loading}
                    emptyMessage="No audit logs found"
                />
            </div>
        </div>
    );
};

export default AuditLogs;