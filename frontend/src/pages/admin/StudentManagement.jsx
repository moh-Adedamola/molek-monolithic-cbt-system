import { useState } from 'react';
import { Upload, Download, Users, Trash2, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';
import { bulkUploadStudents, getClasses, deleteStudentsByClass, exportStudentsByClass } from '../../services/api';

export default function StudentManagement() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [classes, setClasses] = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [alert, setAlert] = useState(null);

    const loadClasses = async () => {
        try {
            setLoadingClasses(true);
            const res = await getClasses();
            setClasses(res.data.classes || []);
        } catch (error) {
            console.error('Failed to load classes:', error);
            setAlert({ type: 'error', message: 'Failed to load classes' });
        } finally {
            setLoadingClasses(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.name.endsWith('.csv')) {
                setAlert({ type: 'error', message: 'Please select a CSV file' });
                return;
            }
            setSelectedFile(file);
            setUploadResult(null);
            setAlert(null);
        }
    };

    // ✅ FIXED: Proper response handling
    const handleUpload = async () => {
        if (!selectedFile) {
            setAlert({ type: 'error', message: 'Please select a file first' });
            return;
        }

        try {
            setUploading(true);
            setAlert(null);
            setUploadResult(null);

            console.log('📤 Uploading student CSV from Django...');

            const response = await bulkUploadStudents(selectedFile);

            // ✅ Backend returns plain text summary
            const text = typeof response.data === 'string'
                ? response.data
                : JSON.stringify(response.data, null, 2);

            setUploadResult(text);
            setAlert({
                type: 'success',
                message: 'Student import completed! See summary below.'
            });

            // Reload classes to show updated counts
            loadClasses();

            // Clear file selection
            setSelectedFile(null);
            const fileInput = document.getElementById('student-csv-upload');
            if (fileInput) fileInput.value = '';

        } catch (error) {
            console.error('❌ Upload failed:', error);

            // ✅ FIXED: Better error message extraction
            let errorMessage = 'Failed to upload students';

            if (error.response?.data) {
                // If backend returned JSON error
                if (error.response.data.error) {
                    errorMessage = error.response.data.error;

                    // Include validation details if present
                    if (error.response.data.missing_fields) {
                        errorMessage += `\n\nMissing fields: ${error.response.data.missing_fields.join(', ')}`;
                    }
                    if (error.response.data.required_fields) {
                        errorMessage += `\n\nRequired format: ${error.response.data.required_fields.join(', ')}`;
                    }
                    if (error.response.data.sample) {
                        errorMessage += `\n\nExample: ${error.response.data.sample}`;
                    }
                }
                // If backend returned plain text error
                else if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            setAlert({
                type: 'error',
                message: errorMessage
            });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteClass = async (className) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete ALL students in ${className}? This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            await deleteStudentsByClass({ class: className });
            setAlert({
                type: 'success',
                message: `All students in ${className} have been deleted`
            });
            loadClasses();
        } catch (error) {
            console.error('Delete class error:', error);
            setAlert({
                type: 'error',
                message: error.response?.data?.error || 'Failed to delete class'
            });
        }
    };

    const handleExportClass = async (className) => {
        try {
            const response = await exportStudentsByClass(className);

            // Create download link
            const blob = new Blob([response.data], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${className}_students.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setAlert({
                type: 'success',
                message: `Exported ${className} student list`
            });
        } catch (error) {
            console.error('Export error:', error);
            setAlert({
                type: 'error',
                message: error.response?.data?.error || 'Failed to export students'
            });
        }
    };

    const downloadSampleCSV = () => {
        const sample = `admission_number,first_name,middle_name,last_name,class_level,password_plain
MOL/2026/001,John,David,Doe,JSS1,pass123
MOL/2026/002,Jane,,Smith,JSS1,pass456
MOL/2026/003,Michael,James,Brown,SS3,pass789`;

        const blob = new Blob([sample], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'student_import_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
                    <p className="text-gray-600 mt-1">Import students from Django backend</p>
                </div>
                <Button
                    variant="outline"
                    onClick={loadClasses}
                    disabled={loadingClasses}
                >
                    {loadingClasses ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading...
                        </>
                    ) : (
                        <>
                            <Users className="h-4 w-4 mr-2" />
                            Refresh Classes
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

            {/* Upload Section */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Upload className="h-6 w-6 text-blue-600" />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Import Students from Django</h2>
                            <p className="text-sm text-gray-600">Upload CSV exported from Django backend</p>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-blue-900 mb-2">📋 Required CSV Format</h3>
                        <code className="text-sm bg-white px-2 py-1 rounded border block mb-3">
                            admission_number,first_name,middle_name,last_name,class_level,password_plain
                        </code>
                        <p className="text-sm text-blue-800 mb-2">
                            <strong>Important:</strong> Make sure your CSV has exactly these columns in this order.
                        </p>
                        <ul className="text-sm text-blue-800 space-y-1 ml-4">
                            <li>• middle_name can be empty but column must exist</li>
                            <li>• class_level must be: JSS1, JSS2, JSS3, SS1, SS2, or SS3</li>
                            <li>• All fields are required except middle_name</li>
                        </ul>
                    </div>

                    {/* File Upload */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select CSV File
                        </label>
                        <input
                            id="student-csv-upload"
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                            disabled={uploading}
                        />
                        {selectedFile && (
                            <p className="mt-2 text-sm text-green-600">
                                ✓ Selected: {selectedFile.name}
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button
                            onClick={handleUpload}
                            disabled={!selectedFile || uploading}
                            className="flex-1"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Students
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={downloadSampleCSV}
                            disabled={uploading}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download Template
                        </Button>
                    </div>

                    {/* Upload Result */}
                    {uploadResult && (
                        <div className="mt-6">
                            <h3 className="font-semibold text-gray-900 mb-2">Import Summary:</h3>
                            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm overflow-auto max-h-96">
                                {uploadResult}
                            </pre>
                        </div>
                    )}
                </div>
            </Card>

            {/* Classes Section */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Users className="h-6 w-6 text-blue-600" />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Manage Classes</h2>
                            <p className="text-sm text-gray-600">View and manage student classes</p>
                        </div>
                    </div>

                    {loadingClasses ? (
                        <div className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                            <p className="text-gray-600">Loading classes...</p>
                        </div>
                    ) : classes.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                            <p className="text-gray-600">No classes found. Upload students to get started.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {classes.map((cls) => (
                                <div
                                    key={cls.class}
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-semibold text-gray-900">{cls.class}</h3>
                                        <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                                            {cls.count} students
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleExportClass(cls.class)}
                                            className="flex-1"
                                        >
                                            <Download className="h-4 w-4 mr-1" />
                                            Export
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteClass(cls.class)}
                                            className="flex-1 text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {/* Help Section */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="h-6 w-6 text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-900">Help & Tips</h2>
                    </div>
                    <div className="space-y-3 text-sm text-gray-700">
                        <div className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <p>
                                <strong>Step 1:</strong> Export students from your Django Admin Portal using the
                                "Export for CBT" button
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <p>
                                <strong>Step 2:</strong> Make sure the CSV file has the correct format
                                (download template to see an example)
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <p>
                                <strong>Step 3:</strong> Upload the CSV file here - existing students will be
                                updated, new students will be created
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <p>
                                <strong>Step 4:</strong> Review the import summary to verify all students were
                                imported successfully
                            </p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}