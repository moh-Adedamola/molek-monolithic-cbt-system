import { useState, useEffect } from 'react';
import { Archive, RotateCcw, FolderOpen, AlertCircle, CheckCircle, Clock } from 'lucide-react';
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
                message: response.data.message || 'Term archived successfully!'
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
        try {
            setLoading(true);
            const response = await resetDatabase();
            setAlert({
                type: 'success',
                message: response.data.message || 'Database reset successfully!'
            });
            setShowResetDialog(false);
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
            // If running in Electron, use shell to open folder
            window.electronAPI.getArchivesPath().then(path => {
                // Copy path to clipboard as fallback
                navigator.clipboard.writeText(path);
                setAlert({
                    type: 'info',
                    message: `Archives path copied to clipboard: ${path}`
                });
            });
        } else {
            setAlert({
                type: 'info',
                message: `Archives location: ${archivesPath}`
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

            {/* Important Instructions */}
            <Card>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-2">📋 End-of-Term Procedures</p>
                            <p className="mb-3">Follow these steps in order to properly close a term and start a new one:</p>
                            <ol className="space-y-2 ml-4 list-decimal">
                                <li><strong>Archive Current Term:</strong> Save all data (students, exams, results) to archives folder</li>
                                <li><strong>Verify Archive:</strong> Check that archive was created successfully</li>
                                <li><strong>Reset Database:</strong> Clear all data to prepare for new term</li>
                                <li><strong>Upload New Data:</strong> Upload fresh student list with NEW exam codes</li>
                                <li><strong>Upload Questions:</strong> Upload questions for new term exams</li>
                            </ol>
                            <div className="mt-3 pt-3 border-t border-blue-300">
                                <p className="font-semibold text-red-600">⚠️ WARNING: Always archive BEFORE resetting!</p>
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
                                <p className="text-xs text-gray-600 font-mono mt-1">{archivesPath}</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={openArchivesFolder}>
                            Open Folder
                        </Button>
                    </div>
                </Card>
            )}

            {/* Step 1: Archive Current Term */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                        1
                    </div>
                    <Archive className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">Archive Current Term</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                    Save all current data (students, exams, questions, results) to archives folder before starting new term
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">What will be archived:</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Complete database backup (.db file)</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>All student records with exam codes</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Exam results by class (CSV format)</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>All questions by subject (CSV format)</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Summary report with statistics</span>
                        </li>
                    </ul>
                </div>

                <div className="flex gap-4 items-end">
                    <div className="flex-1 max-w-md">
                        <Input
                            label="Term Name"
                            placeholder="e.g., Term 1 2024, First Term 2024-2025"
                            value={termName}
                            onChange={(e) => setTermName(e.target.value)}
                            help="Enter a descriptive name for this term"
                        />
                    </div>
                    <Button
                        onClick={() => setShowArchiveDialog(true)}
                        disabled={!termName.trim()}
                        loading={loading}
                    >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive Term
                    </Button>
                </div>
            </Card>

            {/* Step 2: Verify Archive */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-bold">
                        2
                    </div>
                    <FolderOpen className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold">Verify Archive</h3>
                </div>

                {archives.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Archive className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No archives yet. Archive your first term to get started.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600 mb-3">
                            Recent archives (Total: {archives.length})
                        </p>
                        {archives.slice(0, 5).map((archive) => (
                            <div
                                key={archive.name}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <FolderOpen className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="font-medium text-gray-900">{archive.name}</p>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-xs text-gray-600 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(archive.created).toLocaleString()}
                                            </span>
                                            <span className="text-xs text-gray-600">
                                                {archive.fileCount} files
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <Badge variant={archive.hasSummary ? 'success' : 'default'}>
                                    {archive.hasSummary ? 'Complete' : 'In Progress'}
                                </Badge>
                            </div>
                        ))}
                        {archives.length > 5 && (
                            <p className="text-sm text-gray-500 text-center pt-2">
                                + {archives.length - 5} more archives
                            </p>
                        )}
                    </div>
                )}
            </Card>

            {/* Step 3: Reset Database */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold">
                        3
                    </div>
                    <RotateCcw className="h-5 w-5 text-red-600" />
                    <h3 className="text-lg font-semibold">Reset for New Term</h3>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-800">
                            <p className="font-semibold mb-1">⚠️ DANGER ZONE</p>
                            <p className="mb-2">This action will permanently delete:</p>
                            <ul className="ml-4 list-disc space-y-1">
                                <li>All student records and exam codes</li>
                                <li>All exam questions and configurations</li>
                                <li>All submission records and results</li>
                            </ul>
                            <p className="mt-2 font-semibold">Make sure you have archived the current term before proceeding!</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">After reset, you need to:</h4>
                    <ol className="space-y-1 text-sm text-gray-700 ml-4 list-decimal">
                        <li>Upload new student list (system will generate NEW exam codes)</li>
                        <li>Upload questions for new term exams</li>
                        <li>Configure and activate exams</li>
                        <li>Distribute new exam codes to students</li>
                    </ol>
                </div>

                <Button
                    onClick={() => setShowResetDialog(true)}
                    variant="danger"
                    loading={loading}
                >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Database for New Term
                </Button>
            </Card>

            {/* Confirmation Dialogs */}
            <ConfirmDialog
                isOpen={showArchiveDialog}
                onClose={() => setShowArchiveDialog(false)}
                onConfirm={handleArchive}
                title="Archive Current Term"
                message={
                    <div className="space-y-2">
                        <p>Archive all data for <strong>{termName}</strong>?</p>
                        <p className="text-sm text-gray-600">
                            This will create a backup in the archives folder with:
                        </p>
                        <ul className="text-sm text-gray-600 ml-4 list-disc">
                            <li>Complete database backup</li>
                            <li>Student records (CSV)</li>
                            <li>Exam results (CSV)</li>
                            <li>All questions (CSV)</li>
                            <li>Summary report (TXT)</li>
                        </ul>
                    </div>
                }
                confirmText="Archive Term"
                cancelText="Cancel"
                loading={loading}
            />

            <ConfirmDialog
                isOpen={showResetDialog}
                onClose={() => setShowResetDialog(false)}
                onConfirm={handleReset}
                title="⚠️ Reset Database - Final Warning"
                message={
                    <div className="space-y-3">
                        <p className="text-red-600 font-semibold">
                            This will PERMANENTLY DELETE all current data!
                        </p>
                        <p>Are you absolutely sure you want to proceed?</p>
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <p className="text-sm font-semibold text-yellow-800">Before proceeding, verify:</p>
                            <ul className="text-sm text-yellow-800 ml-4 list-disc mt-2">
                                <li>✓ Current term has been archived</li>
                                <li>✓ Archive files are complete and accessible</li>
                                <li>✓ You have informed relevant staff</li>
                            </ul>
                        </div>
                    </div>
                }
                confirmText="Yes, Reset Database"
                cancelText="Cancel"
                type="danger"
                loading={loading}
            />
        </div>
    );
};

export default ArchiveManagement;