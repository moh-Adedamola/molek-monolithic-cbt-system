import { useState, useEffect } from 'react';
import { Plus, Upload, Users, Trash2, Download, FileText } from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { createStudent, bulkUploadStudents, getClasses, deleteStudentsByClass, exportStudentsByClass } from '../../services/api';
import { downloadBlob } from '../../utils/adminUtils';

const CLASS_LEVELS = [
    'JSS1', 'JSS2', 'JSS3',
    'SS1', 'SS2', 'SS3'
];

const StudentManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [generatedCredentials, setGeneratedCredentials] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [alert, setAlert] = useState(null);
    const [classes, setClasses] = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [formData, setFormData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        class: '',
        student_id: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [downloadingClass, setDownloadingClass] = useState(null);

    // ✅ FIXED: Properly parse count as number
    const totalStudents = classes.reduce((sum, c) => {
        const count = typeof c === 'object' ? (Number(c.count) || 0) : 0;
        return sum + count;
    }, 0);

    const totalClasses = classes.length;

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    useEffect(() => {
        loadClasses();
    }, []);

    const loadClasses = async () => {
        try {
            setLoadingClasses(true);
            const response = await getClasses();
            let classList = response.data.classes || [];
            // Normalize: if strings, convert to {class: str, count: 0}
            if (classList.length > 0 && typeof classList[0] === 'string') {
                classList = classList.map(cls => ({ class: cls, count: 0 }));
            }
            setClasses(classList);
        } catch (error) {
            console.error('Load classes error:', error);
            showAlert('error', 'Failed to load classes');
            setClasses([]);
        } finally {
            setLoadingClasses(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await createStudent(formData);
            setGeneratedCredentials(response.data);
            setIsCredentialsModalOpen(true);
            setFormData({ first_name: '', middle_name: '', last_name: '', class: '', student_id: '' });
            setIsModalOpen(false);
            showAlert('success', 'Student created!');
            loadClasses();
        } catch (error) {
            showAlert('error', error.response?.data?.error || 'Create failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleBulkUpload = async () => {
        if (!uploadFile) return showAlert('error', 'Select a file');
        setUploading(true);
        try {
            const response = await bulkUploadStudents(uploadFile);
            downloadBlob(response.data, 'student_credentials.txt');
            showAlert('success', 'Upload complete—credentials downloaded!');
            setIsBulkUploadModalOpen(false);
            setUploadFile(null);
            loadClasses();
        } catch (error) {
            showAlert('error', error.response?.data?.error || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type !== 'text/csv') {
            showAlert('error', 'CSV only');
            e.target.value = '';
            return;
        }
        setUploadFile(file);
    };

    const triggerFileInput = () => document.getElementById('bulk-upload-file')?.click();

    const handleDeleteClass = (cls) => {
        setSelectedClass(cls);
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteClass = async () => {
        setDeleting(true);
        try {
            await deleteStudentsByClass({ class: selectedClass.class });
            showAlert('success', `${selectedClass.class} deleted`);
            setIsDeleteDialogOpen(false);
            setSelectedClass(null);
            loadClasses();
        } catch (error) {
            showAlert('error', 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    const handleDownloadClass = async (cls) => {
        setDownloadingClass(cls.class);
        try {
            const response = await exportStudentsByClass({ class: cls.class });
            downloadBlob(response.data, `${cls.class}_students.csv`);
            showAlert('success', `${cls.class} students exported`);
        } catch (error) {
            showAlert('error', 'Download failed');
        } finally {
            setDownloadingClass(null);
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 py-6 px-4 sm:px-6 lg:px-8">
            {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
                    <p className="mt-1 text-sm text-gray-600">Manage classes, credentials & students</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                        variant="secondary"
                        onClick={() => setIsBulkUploadModalOpen(true)}
                        className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800"
                    >
                        <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => setIsModalOpen(true)}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Student
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Card title="Total Classes" value={totalClasses} icon={Users} />
                <Card title="Total Students" value={totalStudents} icon={Users} />
                <Card title="JSS Classes" value={classes.filter(c => c.class?.startsWith('JSS')).length} />
                <Card title="SS Classes" value={classes.filter(c => c.class?.startsWith('SS')).length} />
            </div>

            {/* Class List Table */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Class List</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Class
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Students
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {loadingClasses ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                                        Loading classes...
                                    </div>
                                </td>
                            </tr>
                        ) : classes.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center">
                                        <Users className="h-12 w-12 text-gray-400 mb-3" />
                                        <p className="font-medium">No classes found</p>
                                        <p className="text-xs mt-1">Add students to populate classes</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            classes.map((clsObj, index) => {
                                const cls = typeof clsObj === 'object' ? clsObj.class : clsObj;
                                const count = typeof clsObj === 'object' ? (Number(clsObj.count) || 0) : 0;
                                const isDownloading = downloadingClass === cls;

                                return (
                                    <tr key={cls || index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-semibold text-gray-900">{cls}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600">
                                                    {count} student{count !== 1 ? 's' : ''}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleDownloadClass({ class: cls })}
                                                    disabled={isDownloading}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Download CSV"
                                                >
                                                    {isDownloading ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700" />
                                                    ) : (
                                                        <Download className="h-4 w-4" />
                                                    )}
                                                    <span className="hidden sm:inline">CSV</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClass({ class: cls })}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                                                    title="Delete Class"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="hidden sm:inline">Delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Student Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Student">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="First Name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                    />
                    <Input
                        label="Middle Name (optional)"
                        value={formData.middle_name}
                        onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                    />
                    <Input
                        label="Last Name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
                    />
                    <Select
                        label="Class"
                        value={formData.class}
                        onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                        options={[
                            { value: '', label: 'Select class' },
                            ...CLASS_LEVELS.map(l => ({ value: l, label: l }))
                        ]}
                        required
                    />
                    <Input
                        label="Student ID (optional)"
                        value={formData.student_id}
                        onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={submitting}>
                            Create Student
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Bulk Upload Modal */}
            <Modal
                isOpen={isBulkUploadModalOpen}
                onClose={() => {
                    setIsBulkUploadModalOpen(false);
                    setUploadFile(null);
                }}
                title="Bulk Upload Students"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        CSV format: first_name, last_name, class, student_id
                    </p>
                    <input
                        id="bulk-upload-file"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={triggerFileInput}
                        className="w-full"
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        {uploadFile ? uploadFile.name : 'Choose CSV File'}
                    </Button>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsBulkUploadModalOpen(false);
                                setUploadFile(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkUpload}
                            loading={uploading}
                            disabled={!uploadFile}
                        >
                            Upload & Download
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Credentials Modal */}
            <Modal
                isOpen={isCredentialsModalOpen}
                onClose={() => setIsCredentialsModalOpen(false)}
                title="Student Credentials"
            >
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-1">Student Name:</p>
                            <p className="font-semibold text-lg text-gray-900">
                                {generatedCredentials?.studentName}
                            </p>
                        </div>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-1">Class:</p>
                            <p className="font-semibold text-gray-900">
                                {generatedCredentials?.class}
                            </p>
                        </div>
                        <div className="border-t border-blue-300 pt-4 mt-4">
                            <p className="mb-3">
                                <strong className="text-gray-700">Exam Code:</strong>
                                <span className="font-mono text-blue-700 ml-2 text-lg break-all block mt-1">
                                    {generatedCredentials?.examCode}
                                </span>
                            </p>
                            <p>
                                <strong className="text-gray-700">Password:</strong>
                                <span className="font-mono text-blue-700 ml-2 text-lg">
                                    {generatedCredentials?.password}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <p className="text-sm text-yellow-800 font-medium">
                            ⚠️ Important: Save these credentials now. They won't be shown again.
                        </p>
                    </div>
                    <Button onClick={() => setIsCredentialsModalOpen(false)} className="w-full">
                        Close
                    </Button>
                </div>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    setSelectedClass(null);
                }}
                onConfirm={confirmDeleteClass}
                title="Delete Class"
                message={`Are you sure you want to delete ALL students in ${selectedClass?.class}? This action cannot be undone.`}
                confirmText="Delete Class"
                type="danger"
                loading={deleting}
            />
        </div>
    );
};

export default StudentManagement;