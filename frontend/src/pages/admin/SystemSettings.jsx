import { useState, useEffect } from 'react';
import { Save, Database, Settings, Info } from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Alert from '../../components/common/Alert';
import { getDashboardStats, getSystemSettings, updateSystemSettings } from '../../services/api';

const TERM_OPTIONS = [
    { value: 'First Term', label: 'First Term' },
    { value: 'Second Term', label: 'Second Term' },
    { value: 'Third Term', label: 'Third Term' }
];

const SystemSettings = () => {
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [stats, setStats] = useState(null);
    const [settings, setSettings] = useState({
        systemName: 'Molek CBT System',
        schoolName: 'Molek School',
        academicSession: '2024/2025',
        currentTerm: 'First Term',
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

    const loadSettings = async () => {
        try {
            setLoadingSettings(true);
            const response = await getSystemSettings();
            if (response.data.success && response.data.settings) {
                setSettings(response.data.settings);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            setAlert({ type: 'error', message: 'Failed to load settings' });
        } finally {
            setLoadingSettings(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const response = await updateSystemSettings(settings);

            if (response.data.success) {
                setAlert({ type: 'success', message: 'Settings saved successfully!' });
                // Update local state with response
                if (response.data.settings) {
                    setSettings(response.data.settings);
                }
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            setAlert({ type: 'error', message: 'Failed to save settings' });
        } finally {
            setLoading(false);
        }
    };

    if (loadingSettings) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

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
                            <p className="text-2xl font-bold text-green-600">{stats.totalSubmissions}</p>
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
                        value={settings.academicSession}
                        onChange={(e) => setSettings({ ...settings, academicSession: e.target.value })}
                        placeholder="e.g., 2024/2025"
                    />
                    <p className="text-xs text-gray-500 -mt-2">Format: YYYY/YYYY (e.g., 2024/2025)</p>
                    <Select
                        label="Current Term"
                        value={settings.currentTerm}
                        onChange={(e) => setSettings({ ...settings, currentTerm: e.target.value })}
                        options={TERM_OPTIONS}
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

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} loading={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                </Button>
            </div>

            {/* Current Session Info */}
            <Card>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">📚 Current Session Information</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                        <p><strong>Academic Session:</strong> {settings.academicSession}</p>
                        <p><strong>Current Term:</strong> {settings.currentTerm}</p>
                        <p><strong>School:</strong> {settings.schoolName}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-xs text-blue-700">
                            💡 <strong>Tip:</strong> Before starting a new term, archive current data in Archive Management
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default SystemSettings;