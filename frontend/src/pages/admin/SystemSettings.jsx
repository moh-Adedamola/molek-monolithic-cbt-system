import { useState, useEffect } from 'react';
import { Save, Settings, School, Calendar, Clock, Shield, Eye, Shuffle, Loader2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import { getSystemSettings, updateSystemSettings } from '../../services/api';

export default function SystemSettings() {
    const [settings, setSettings] = useState({
        systemName: '',
        schoolName: '',
        academicSession: '',
        currentTerm: '',
        defaultExamDuration: 60,
        autoSubmit: true,
        shuffleQuestions: false,
        showResults: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const res = await getSystemSettings();
            setSettings(res.data.settings);
        } catch (error) {
            console.error('Failed to load settings:', error);
            setAlert({ type: 'error', message: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setAlert(null);

            await updateSystemSettings(settings);

            setAlert({
                type: 'success',
                message: 'Settings saved successfully!'
            });
        } catch (error) {
            console.error('Failed to save settings:', error);
            setAlert({
                type: 'error',
                message: error.response?.data?.error || 'Failed to save settings'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
                    <p className="text-gray-600 mt-1">Configure your CBT system</p>
                </div>
                <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>

            {alert && (
                <Alert
                    type={alert.type}
                    message={alert.message}
                    onClose={() => setAlert(null)}
                />
            )}

            {/* School Information */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <School className="h-6 w-6 text-blue-600" />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">School Information</h2>
                            <p className="text-sm text-gray-600">Basic school details</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="System Name"
                            name="systemName"
                            value={settings.systemName}
                            onChange={handleChange}
                            placeholder="e.g., Molek CBT System"
                        />
                        <Input
                            label="School Name"
                            name="schoolName"
                            value={settings.schoolName}
                            onChange={handleChange}
                            placeholder="e.g., Molek School"
                        />
                    </div>
                </div>
            </Card>

            {/* Academic Information */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Calendar className="h-6 w-6 text-blue-600" />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Academic Information</h2>
                            <p className="text-sm text-gray-600">Current session and term</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Academic Session"
                            name="academicSession"
                            value={settings.academicSession}
                            onChange={handleChange}
                            placeholder="e.g., 2024/2025"
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Current Term
                            </label>
                            <select
                                name="currentTerm"
                                value={settings.currentTerm}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="First Term">First Term</option>
                                <option value="Second Term">Second Term</option>
                                <option value="Third Term">Third Term</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Exam Settings */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Clock className="h-6 w-6 text-blue-600" />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Exam Settings</h2>
                            <p className="text-sm text-gray-600">Default exam behavior</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Input
                            label="Default Exam Duration (minutes)"
                            name="defaultExamDuration"
                            type="number"
                            min="1"
                            value={settings.defaultExamDuration}
                            onChange={handleChange}
                            placeholder="60"
                        />

                        {/* Toggle Settings */}
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Auto-Submit on Timeout</h3>
                                        <p className="text-sm text-gray-600">
                                            Automatically submit exam when time expires
                                        </p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="autoSubmit"
                                        checked={settings.autoSubmit}
                                        onChange={handleChange}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Shuffle className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Shuffle Questions</h3>
                                        <p className="text-sm text-gray-600">
                                            Randomize question order for each student
                                        </p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="shuffleQuestions"
                                        checked={settings.shuffleQuestions}
                                        onChange={handleChange}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Show Results After Submission</h3>
                                        <p className="text-sm text-gray-600">
                                            Display score immediately after exam submission
                                        </p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="showResults"
                                        checked={settings.showResults}
                                        onChange={handleChange}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Important Notes */}
            <Card>
                <div className="p-6 bg-yellow-50">
                    <div className="flex items-start gap-3">
                        <Settings className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-yellow-900 mb-2">Important Notes:</h3>
                            <ul className="space-y-1 text-sm text-yellow-800">
                                <li>• Changes to exam settings apply to new exam sessions</li>
                                <li>• Students currently taking exams will not be affected</li>
                                <li>• Academic session and term are displayed to students on login</li>
                                <li>• Auto-save runs every 10 seconds during exams (hardcoded)</li>
                                <li>• Fullscreen mode is enforced by the Electron app during exams</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}