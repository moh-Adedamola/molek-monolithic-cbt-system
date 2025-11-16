import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { getExamById, updateExam } from '../../services/api';

const EditExam = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState(null);
    const [formData, setFormData] = useState({
        duration_minutes: 60
    });

    useEffect(() => {
        loadExam();
    }, [examId]);

    const loadExam = async () => {
        try {
            setLoading(true);
            const response = await getExamById(examId);
            setExam(response.data.exam);
            setFormData({
                duration_minutes: response.data.exam.duration_minutes || 60
            });
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to load exam' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setSubmitting(true);
            await updateExam(examId, formData);
            setAlert({ type: 'success', message: 'Exam updated successfully' });
            setTimeout(() => {
                navigate('/admin/exams');
            }, 1500);
        } catch (error) {
            setAlert({ type: 'error', message: error.message || 'Failed to update exam' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading exam...</p>
                </div>
            </div>
        );
    }

    if (!exam) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 mb-4">Exam not found</p>
                <Button onClick={() => navigate('/admin/exams')}>
                    Back to Exams
                </Button>
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
                    <h1 className="text-2xl font-bold text-gray-900">Edit Exam</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Update exam configuration
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate('/admin/exams')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Exams
                </Button>
            </div>

            {/* Exam Info */}
            <Card>
                <h3 className="text-lg font-semibold mb-4">Exam Information</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Subject</p>
                        <p className="font-medium text-gray-900">{exam.subject}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Class</p>
                        <p className="font-medium text-gray-900">{exam.class}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Total Questions</p>
                        <p className="font-medium text-gray-900">{exam.total_questions || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <Badge variant={exam.is_active ? 'success' : 'default'}>
                            {exam.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                </div>
            </Card>

            {/* Edit Form */}
            <Card>
                <h3 className="text-lg font-semibold mb-4">Exam Settings</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Duration (minutes)"
                        type="number"
                        min="10"
                        max="300"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({
                            ...formData,
                            duration_minutes: parseInt(e.target.value)
                        })}
                        required
                        help="Set how long students have to complete this exam"
                    />

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                            <strong>Note:</strong> To modify questions, go to Question Bank and re-upload the CSV.
                            To change subject or class, create a new exam.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate('/admin/exams')}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" loading={submitting}>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default EditExam;