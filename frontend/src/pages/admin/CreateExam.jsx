import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import { getSubjects } from '../../services/api';

const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

const CreateExam = () => {
    const navigate = useNavigate();
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [subjectsByClass, setSubjectsByClass] = useState({});
    const [formData, setFormData] = useState({
        class: '',
        subject: '',
        duration_minutes: 60,
    });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        try {
            const response = await getSubjects();
            setSubjectsByClass(response.data?.subjects || {});
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to load subjects' });
        }
    };

    const availableSubjects = formData.class ? (subjectsByClass[formData.class] || []) : [];

    const validateForm = () => {
        const errors = {};

        if (!formData.class) {
            errors.class = 'Class level is required';
        }

        if (!formData.subject) {
            errors.subject = 'Subject is required';
        }

        if (!formData.duration_minutes || formData.duration_minutes < 10) {
            errors.duration_minutes = 'Duration must be at least 10 minutes';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setAlert({
            type: 'info',
            message: 'Exams are automatically created when you upload questions in Question Bank. Redirecting...'
        });

        setTimeout(() => {
            navigate('/admin/questions');
        }, 2000);
    };

    return (
        <div className="space-y-6">
            {alert && (
                <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Create New Exam</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Set up a new examination
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate('/admin/exams')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Exams
                </Button>
            </div>

            {/* Info Card */}
            <Card>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">📝 How to Create Exams</h3>
                    <ol className="space-y-2 text-sm text-blue-800">
                        <li className="flex items-start gap-2">
                            <span className="font-semibold">1.</span>
                            <span>Go to <strong>Question Bank</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-semibold">2.</span>
                            <span>Upload a CSV file with your questions</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-semibold">3.</span>
                            <span>Select the <strong>Subject</strong> and <strong>Class Level</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-semibold">4.</span>
                            <span>The system automatically creates the exam for you</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-semibold">5.</span>
                            <span>Configure duration and activate in <strong>Exam Management</strong></span>
                        </li>
                    </ol>
                </div>
            </Card>

            {/* Redirect Button */}
            <Card>
                <div className="text-center py-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Ready to Create an Exam?
                    </h3>
                    <Button onClick={() => navigate('/admin/questions')} size="lg">
                        <Plus className="mr-2 h-5 w-5" />
                        Go to Question Bank
                    </Button>
                </div>
            </Card>

            {/* Preview Form (Disabled - Shows Expected Flow) */}
            <Card>
                <h3 className="text-lg font-semibold mb-4">Exam Configuration Preview</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Select
                        label="Class Level"
                        value={formData.class}
                        onChange={(e) => setFormData({ ...formData, class: e.target.value, subject: '' })}
                        options={[
                            { value: '', label: 'Select Class' },
                            ...CLASS_LEVELS.map(c => ({ value: c, label: c }))
                        ]}
                        error={formErrors.class}
                        disabled
                    />

                    <Select
                        label="Subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        options={[
                            { value: '', label: 'Select Subject' },
                            ...availableSubjects.map(s => ({ value: s, label: s }))
                        ]}
                        error={formErrors.subject}
                        disabled={!formData.class}
                    />

                    <Input
                        label="Duration (minutes)"
                        type="number"
                        min="10"
                        max="300"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                        error={formErrors.duration_minutes}
                        disabled
                    />

                    <div className="text-sm text-gray-500 italic">
                        Note: This form is for preview only. Use Question Bank to create exams.
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default CreateExam;