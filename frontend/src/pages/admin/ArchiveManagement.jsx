import { useState, useEffect } from 'react';
import { Archive, RotateCcw, FolderOpen, AlertCircle, CheckCircle, Clock, Shield, Trash2, Download } from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import { archiveTerm, resetDatabase, listArchives, getArchivesPath } from '../../services/api';

const ArchiveManagement = () => {
    const [termName, setTermName] = useState('');
    const [archives, setArchives] = useState([]);
    const [archivesPath, setArchivesPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [showArchiveDialog, setShowArchiveDialog] = useState(false);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [resetConfirmText, setResetConfirmText] = useState('');

    useEffect(() => {
        loadArchives();
        loadArchivesPath();
    }, []);

    const loadArchives = async () => {
        try {
            const response = await listArchives();
            setArchives(response.data.archives || []);
        } catch (error) {
            console.error('Failed to load archives:', error);
        }
    };

    const loadArchivesPath = async () => {
        try {
            const response = await getArchivesPath();
            setArchivesPath(response.data.path);
        } catch (error) {
            console.error('Failed to get archives path:', error);
        }
    };

    const handleArchive = async () => {
        if (!termName.trim()) {
            setAlert({ type: 'error', message: 'Please enter a term name' });
            return;
        }

        try {
            setLoading(true);
            const response = await archiveTerm(termName);
            setAlert({
                type: 'success',
                message: response.data.message || 'Term archived successfully! Database has been cleared for new term.'
            });
            setTermName('');
            setShowArchiveDialog(false);
            loadArchives();
        } catch (error) {
            setAlert({
                type: 'error',
                message: error.response?.data?.error || 'Archive failed'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (resetConfirmText !== 'DELETE') {
            setAlert({ type: 'error', message: 'Please type DELETE to confirm' });
            return;
        }

        try {
            setLoading(true);
            const response = await resetDatabase();
            setAlert({
                type: 'success',
                message: response.data.message || 'Database reset successfully!'
            });
            setShowResetDialog(false);
            setResetConfirmText('');
        } catch (error) {
            setAlert({
                type: 'error',
                message: error.response?.data?.error || 'Reset failed'
            });
        } finally {
            setLoading(false);
        }
    };

    const openArchivesFolder = () => {
        if (window.electronAPI) {
            window.electronAPI.getArchivesPath().then(path => {
                navigator.clipboard.writeText(path);
                setAlert({
                    type: 'info',
                    message: `Archives path copied to clipboard: ${path}`
                });
            });
        } else {
            navigator.clipboard.writeText(archivesPath);
            setAlert({
                type: 'info',
                message: `Archives location copied: ${archivesPath}`
            });
        }
    };

    return (
        <div className="space-y-6">
            {alert && (
                <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            )}

            <div>
                <h1 className="text-2xl font-bold text-gray-900">Term Management</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Archive data and prepare for new academic term
                </p>
            </div>

            {/* Quick Guide */}
            <Card>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-2">📋 Which option should I choose?</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-3">
                                <div className="bg-white rounded-lg p-3 border border-blue-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield className="h-4 w-4 text-green-600" />
                                        <span className="font-semibold text-green-700">Archive & New Term</span>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                        ✅ Saves all data to backup<br />
                                        ✅ Then clears database<br />
                                        ✅ <strong>Recommended</strong> for end of term
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-red-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                        <span className="font-semibold text-red-700">Reset Only</span>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                        ❌ NO backup created<br />
                                        ❌ Permanent deletion<br />
                                        ⚠️ Only for testing/emergencies
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Archives Location */}
            {archivesPath && (
                <Card>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FolderOpen className="h-5 w-5 text-gray-600" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">Archives Location</p>
                                <p className="text-xs text-gray-600 font-mono mt-1 break-all">{archivesPath}</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={openArchivesFolder}>
                            Copy Path
                        </Button>
                    </div>
                </Card>
            )}

            {/* ========== SAFE ZONE: Archive & Start New Term ========== */}
            <div className="border-2 border-green-200 rounded-xl overflow-hidden">
                <div className="bg-green-50 px-4 py-3 border-b border-green-200">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-600" />
                        <h2 className="text-lg font-semibold text-green-800">Safe Zone: Archive & Start New Term</h2>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                        This option backs up your data before clearing the database
                    </p>
                </div>

                <div className="p-4 bg-white">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Archive Form */}
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Archive className="h-4 w-4 text-green-600" />
                                Archive Current Term
                            </h3>
                            
                            <div className="bg-green-50 rounded-lg p-3 mb-4">
                                <p className="text-sm text-green-800 mb-2">
                                    <strong>What gets saved:</strong>
                                </p>
                                <ul className="text-xs text-green-700 space-y-1">
                                    <li>✓ Complete database backup (.db)</li>
                                    <li>✓ Student records (CSV)</li>
                                    <li>✓ Exam results & scores (CSV)</li>
                                    <li>✓ All questions (CSV)</li>
                                    <li>✓ Summary report (TXT)</li>
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <Input
                                    label="Term Name"
                                    placeholder="e.g., 2024/2025 First Term"
                                    value={termName}
                                    onChange={(e) => setTermName(e.target.value)}
                                />
                                <Button
                                    onClick={() => setShowArchiveDialog(true)}
                                    disabled={!termName.trim()}
                                    loading={loading}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Archive & Clear for New Term
                                </Button>
                            </div>
                        </div>

                        {/* Recent Archives */}
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-blue-600" />
                                Recent Archives ({archives.length})
                            </h3>

                            {archives.length === 0 ? (
                                <div className="text-center py-6 bg-gray-50 rounded-lg">
                                    <Archive className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm text-gray-500">No archives yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {archives.slice(0, 5).map((archive) => (
                                        <div
                                            key={archive.name}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FolderOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm text-gray-900 truncate">{archive.name}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(archive.created).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant={archive.hasSummary ? 'success' : 'default'} className="flex-shrink-0">
                                                {archive.hasSummary ? '✓' : '...'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== DANGER ZONE: Reset Only ========== */}
            <div className="border-2 border-red-200 rounded-xl overflow-hidden">
                <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                    <div className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-red-600" />
                        <h2 className="text-lg font-semibold text-red-800">Danger Zone: Reset Without Backup</h2>
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                        This permanently deletes all data with NO backup
                    </p>
                </div>

                <div className="p-4 bg-white">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-red-800">
                                <p className="font-semibold mb-2">⚠️ WARNING: This action is IRREVERSIBLE</p>
                                <p className="mb-2">This will permanently delete:</p>
                                <ul className="ml-4 list-disc space-y-1">
                                    <li>All student records and credentials</li>
                                    <li>All exam questions</li>
                                    <li>All submission records and results</li>
                                    <li>All settings and configurations</li>
                                </ul>
                                <p className="mt-3 font-semibold">
                                    💡 Use "Archive & Clear" above instead unless you have a specific reason not to.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            onClick={() => setShowResetDialog(true)}
                            variant="danger"
                            loading={loading}
                        >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset Database (No Backup)
                        </Button>
                    </div>
                </div>
            </div>

            {/* ========== Confirmation Dialogs ========== */}
            
            {/* Archive Confirmation */}
            <ConfirmDialog
                isOpen={showArchiveDialog}
                onClose={() => setShowArchiveDialog(false)}
                onConfirm={handleArchive}
                title="Archive & Start New Term"
                message={
                    <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm text-green-800">
                                <strong>✓ Safe Operation</strong> - Your data will be backed up
                            </p>
                        </div>
                        
                        <p>Archive all data for <strong>"{termName}"</strong>?</p>
                        
                        <div className="text-sm text-gray-600">
                            <p className="font-medium mb-1">This will:</p>
                            <ol className="ml-4 list-decimal space-y-1">
                                <li>Create a backup folder with all your data</li>
                                <li>Export students, results, and questions to CSV</li>
                                <li>Clear the database for the new term</li>
                            </ol>
                        </div>
                    </div>
                }
                confirmText="Archive & Clear"
                cancelText="Cancel"
                loading={loading}
            />

            {/* Reset Confirmation (Extra Safety) */}
            <ConfirmDialog
                isOpen={showResetDialog}
                onClose={() => {
                    setShowResetDialog(false);
                    setResetConfirmText('');
                }}
                onConfirm={handleReset}
                title="⚠️ Final Warning: Permanent Deletion"
                message={
                    <div className="space-y-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-800 font-semibold">
                                ❌ NO BACKUP will be created. This cannot be undone!
                            </p>
                        </div>

                        <p className="text-gray-700">
                            Are you absolutely sure? Consider using <strong>"Archive & Clear"</strong> instead.
                        </p>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800 mb-2">
                                To confirm, type <strong>DELETE</strong> below:
                            </p>
                            <input
                                type="text"
                                value={resetConfirmText}
                                onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                                placeholder="Type DELETE to confirm"
                                className="w-full px-3 py-2 border border-yellow-300 rounded text-center font-mono"
                            />
                        </div>
                    </div>
                }
                confirmText="Permanently Delete All Data"
                cancelText="Cancel"
                type="danger"
                loading={loading}
                confirmDisabled={resetConfirmText !== 'DELETE'}
            />
        </div>
    );
};

export default ArchiveManagement;