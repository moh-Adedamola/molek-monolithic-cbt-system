import { useState, useEffect } from 'react';
import { Upload, FileText } from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import { uploadQuestions } from '../../services/api';

const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

const QuestionBank = () => {
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [alert, setAlert] = useState(null);
    const [csvMeta, setCsvMeta] = useState({ subject: '', class: '' });
    const [uploadFile, setUploadFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    const handleCsvUpload = async () => {
        if (!uploadFile || !csvMeta.subject || !csvMeta.class) {
            showAlert('error', 'Please select file and fill in subject and class');
            return;
        }

        setSubmitting(true);
        try {
            await uploadQuestions(uploadFile, csvMeta.subject, csvMeta.class);
            showAlert('success', 'Questions uploaded successfully!');
            setIsCsvModalOpen(false);
            setCsvMeta({ subject: '', class: '' });
            setUploadFile(null);
        } catch (error) {
            showAlert('error', error.response?.data?.error || 'Upload failed');
        } finally {
            setSubmitting(false);
        }
    };

    const downloadTemplate = () => {
        const template = `question_text,option_a,option_b,option_c,option_d,correct_answer
"What is 2 + 2?",3,4,5,6,B
"What is the capital of France?",London,Paris,Berlin,Rome,B
"Which planet is closest to the Sun?",Venus,Earth,Mars,Mercury,D`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'question_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6 py-6 px-4 sm:px-6 lg:px-8">
            {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
                    <p className="mt-1 text-sm text-gray-600">Upload questions via CSV file</p>
                </div>
            </div>

            {/* Upload Section */}
            <Card>
                <h3 className="text-lg font-semibold mb-4">Upload Questions via CSV</h3>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-2">📋 CSV Format</h4>
                    <code className="text-sm bg-white px-2 py-1 rounded border block mb-2">
                        question_text,option_a,option_b,option_c,option_d,correct_answer
                    </code>
                    <p className="text-sm text-blue-800 mb-2">
                        <strong>Important:</strong> Make sure your CSV file has the correct format with all required columns.
                    </p>
                    <ul className="text-sm text-blue-800 space-y-1 ml-4">
                        <li>• Each row = one question</li>
                        <li>• Correct answer must be A, B, C, or D</li>
                        <li>• Use quotes for questions with commas</li>
                        <li>• Make sure file ends with a blank line</li>
                    </ul>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                        variant="primary"
                        onClick={() => setIsCsvModalOpen(true)}
                        className="flex-1 sm:flex-none"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload CSV
                    </Button>
                    <Button
                        variant="outline"
                        onClick={downloadTemplate}
                        className="flex-1 sm:flex-none"
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Download Template
                    </Button>
                </div>
            </Card>

            {/* Info Card */}
            <Card>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 Tips for Success</h4>
                    <ul className="text-sm text-gray-700 space-y-2">
                        <li>✅ <strong>Prepare your CSV:</strong> Use Excel or Google Sheets, then save as CSV</li>
                        <li>✅ <strong>Test small first:</strong> Upload 5-10 questions to verify format</li>
                        <li>✅ <strong>Check after upload:</strong> Go to Exam Management to verify questions were uploaded</li>
                        <li>✅ <strong>Avoid special characters:</strong> Quotes in questions should be escaped properly</li>
                        <li>✅ <strong>One subject at a time:</strong> Upload questions for each subject separately</li>
                    </ul>
                </div>
            </Card>

            {/* Upload Modal */}
            <Modal
                isOpen={isCsvModalOpen}
                onClose={() => {
                    setIsCsvModalOpen(false);
                    setCsvMeta({ subject: '', class: '' });
                    setUploadFile(null);
                }}
                title="Upload Questions CSV"
                size="md"
            >
                <div className="space-y-4">
                    <Input
                        label="Subject Name"
                        placeholder="e.g., Mathematics, English, Biology"
                        value={csvMeta.subject}
                        onChange={(e) => setCsvMeta({ ...csvMeta, subject: e.target.value })}
                        required
                    />
                    <Select
                        label="Class"
                        value={csvMeta.class}
                        onChange={(e) => setCsvMeta({ ...csvMeta, class: e.target.value })}
                        options={[
                            { value: '', label: 'Select Class' },
                            ...CLASS_LEVELS.map((c) => ({ value: c, label: c }))
                        ]}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            CSV File <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setUploadFile(e.target.files[0])}
                            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                        />
                        {uploadFile && (
                            <p className="mt-1 text-sm text-green-600">
                                ✓ Selected: {uploadFile.name}
                            </p>
                        )}
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                            <strong>Note:</strong> Make sure your CSV file is properly formatted and ends with a blank line to avoid parsing errors.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsCsvModalOpen(false);
                                setCsvMeta({ subject: '', class: '' });
                                setUploadFile(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCsvUpload}
                            loading={submitting}
                            disabled={!uploadFile || !csvMeta.subject || !csvMeta.class}
                        >
                            Upload Questions
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default QuestionBank;