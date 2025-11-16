import { useState, useEffect } from 'react';
import { Save, Database, Settings, Info } from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import { getDashboardStats } from '../../services/api';

const SystemSettings = () => {
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [settings, setSettings] = useState({
        systemName: 'Molek CBT System',
        schoolName: 'Molek School',
        sessionYear: '2024/2025',
        defaultExamDuration: 60,
        autoSubmit: true,
        shuffleQuestions: false,
        showResults: true,
    });

    useEffect(() => {
        loadStats();
        loadSettings();
    }, []);

    const loadStats = async () => {
        try {
            const response = await getDashboardStats();
            setStats(response.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const loadSettings = () => {
        // Load from localStorage for now
        const saved = localStorage.getItem('systemSettings');
        if (saved) {
            setSettings(JSON.parse(saved));
        }
    };

    const handleSave = () => {
        try {
            setLoading(true);
            // Save to localStorage for now
            localStorage.setItem('systemSettings', JSON.stringify(settings));
            setAlert({ type: 'success', message: 'Settings saved successfully' });
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to save settings' });
        } finally {
            setLoading(false);
        }
    };

    const handleBackup = () => {
        setAlert({
            type: 'info',
            message: 'Database backup feature will be available in the next update. Currently, your database is stored in backend/src/db/cbt.db'
        });
    };

    return (
        <div className="space-y-6">
            {alert && (
                <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                    <p className="mt-1 text-sm text-gray-600">Configure system preferences and options</p>
                </div>
            </div>

            {/* System Information */}
            {stats && (
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <Info className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold">System Information</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-gray-600">Total Students</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Total Exams</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalExams}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Active Exams</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.activeExams}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Submissions</p>
                            <p className="text-2xl font-bold text-green-600">{stats.completedExams}</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* General Settings */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <Settings className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">General Settings</h3>
                </div>
                <div className="space-y-4">
                    <Input
                        label="System Name"
                        value={settings.systemName}
                        onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                        placeholder="e.g., Molek CBT System"
                    />
                    <Input
                        label="School Name"
                        value={settings.schoolName}
                        onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                        placeholder="e.g., Molek School"
                    />
                    <Input
                        label="Academic Session"
                        value={settings.sessionYear}
                        onChange={(e) => setSettings({ ...settings, sessionYear: e.target.value })}
                        placeholder="e.g., 2024/2025"
                    />
                    <Input
                        label="Default Exam Duration (minutes)"
                        type="number"
                        min="10"
                        max="300"
                        value={settings.defaultExamDuration}
                        onChange={(e) => setSettings({ ...settings, defaultExamDuration: parseInt(e.target.value) })}
                    />
                </div>
            </Card>

            {/* Exam Settings */}
            <Card>
                <h3 className="text-lg font-semibold mb-4">Exam Behavior</h3>
                <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <div>
                            <p className="font-medium text-gray-900">Auto-submit on timeout</p>
                            <p className="text-sm text-gray-600">Automatically submit exam when time expires</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.autoSubmit}
                            onChange={(e) => setSettings({ ...settings, autoSubmit: e.target.checked })}
                            className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                    </label>

                    <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <div>
                            <p className="font-medium text-gray-900">Shuffle questions</p>
                            <p className="text-sm text-gray-600">Randomize question order for each student</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.shuffleQuestions}
                            onChange={(e) => setSettings({ ...settings, shuffleQuestions: e.target.checked })}
                            className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                    </label>

                    <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <div>
                            <p className="font-medium text-gray-900">Show results immediately</p>
                            <p className="text-sm text-gray-600">Display scores to students after submission</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.showResults}
                            onChange={(e) => setSettings({ ...settings, showResults: e.target.checked })}
                            className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                    </label>
                </div>
            </Card>

            {/* Database Management */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <Database className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">Database Management</h3>
                </div>
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                            <strong>Database Location:</strong> backend/src/db/cbt.db
                        </p>
                        <p className="text-sm text-blue-800 mt-2">
                            💡 <strong>Manual Backup:</strong> Copy the cbt.db file to a safe location regularly
                        </p>
                    </div>
                    <Button onClick={handleBackup} variant="outline">
                        <Database className="mr-2 h-4 w-4" />
                        View Database Info
                    </Button>
                </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} loading={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                </Button>
            </div>

            {/* Offline System Info */}
            <Card>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">🌐 Offline CBT System</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                        <li>• Master System: Running on this computer (Server)</li>
                        <li>• Student Systems: Connect via local network</li>
                        <li>• Capacity: 100+ concurrent student systems</li>
                        <li>• No internet required after setup</li>
                    </ul>
                </div>
            </Card>
        </div>
    );
};

export default SystemSettings;
