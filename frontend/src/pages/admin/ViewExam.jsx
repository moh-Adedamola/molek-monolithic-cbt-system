import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Copy,
  Trash2,
  PlayCircle,
  Calendar,
  Clock,
  Users,
  FileQuestion,
  CheckCircle,
  XCircle,
  Download,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Alert from '../../components/common/Alert';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Loader from '../../components/common/Loader';
import { examService } from '../../services/services';

const ViewExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadExamDetails();
  }, [examId]);

  const loadExamDetails = async () => {
    try {
      setLoading(true);
      const [examRes, questionsRes] = await Promise.all([
        examService.getById(examId),
        examService.getExamQuestions(examId),
      ]);

      setExam(examRes.data?.exam || examRes.data);
      setQuestions(questionsRes.data?.questions || questionsRes.data || []);
    } catch (error) {
      showAlert('error', error.message || 'Failed to load exam details');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = () => {
    navigate(`/admin/exams/edit/${examId}`);
  };

  const handleClone = async () => {
    try {
      const response = await examService.clone(examId, {
        exam_name: `${exam.exam_name || exam.examName} (Copy)`,
      });
      showAlert('success', 'Exam cloned successfully');
      setTimeout(() => {
        navigate('/admin/exams');
      }, 1500);
    } catch (error) {
      showAlert('error', error.message || 'Failed to clone exam');
    }
  };

  const handlePublish = async () => {
    try {
      setSubmitting(true);
      await examService.publish(examId);
      showAlert('success', 'Exam published successfully');
      setIsPublishDialogOpen(false);
      loadExamDetails();
    } catch (error) {
      showAlert('error', error.message || 'Failed to publish exam');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      await examService.delete(examId);
      showAlert('success', 'Exam deleted successfully');
      setTimeout(() => {
        navigate('/admin/exams');
      }, 1500);
    } catch (error) {
      showAlert('error', error.message || 'Failed to delete exam');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'default',
      scheduled: 'info',
      active: 'success',
      completed: 'default',
    };
    return variants[status] || 'default';
  };

  if (loading) {
    return <Loader fullScreen text="Loading exam details..." />;
  }

  if (!exam) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <XCircle className="h-16 w-16 text-red-500" />
        <p className="mt-4 text-lg text-gray-600">Exam not found</p>
        <Button onClick={() => navigate('/admin/exams')} className="mt-4">
          Back to Exams
        </Button>
      </div>
    );
  }

  const status = exam.status || 'draft';
  const canEdit = status === 'draft' || status === 'scheduled';
  const canDelete = status === 'draft';

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/admin/exams')}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {exam.exam_name || exam.examName}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <Badge variant={getStatusBadge(status)}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
              <span className="text-sm text-gray-600">
                {exam.subject_name || exam.subjectName} • {exam.class_level || exam.classLevel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <Button variant="secondary" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          <Button variant="secondary" onClick={handleClone}>
            <Copy className="mr-2 h-4 w-4" />
            Clone
          </Button>
          {status === 'draft' && (
            <Button onClick={() => setIsPublishDialogOpen(true)}>
              <PlayCircle className="mr-2 h-4 w-4" />
              Publish
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Exam Information */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Exam Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Subject</p>
                <p className="mt-1 text-gray-900">{exam.subject_name || exam.subjectName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Class Level</p>
                <p className="mt-1 text-gray-900">{exam.class_level || exam.classLevel}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Duration</p>
                <div className="mt-1 flex items-center gap-1 text-gray-900">
                  <Clock className="h-4 w-4" />
                  {exam.duration_minutes || exam.durationMinutes} minutes
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Questions</p>
                <div className="mt-1 flex items-center gap-1 text-gray-900">
                  <FileQuestion className="h-4 w-4" />
                  {exam.total_questions || exam.totalQuestions}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Passing Score</p>
                <p className="mt-1 text-gray-900">{exam.passing_score || exam.passingScore}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Marks</p>
                <p className="mt-1 text-gray-900">
                  {exam.total_marks || exam.totalMarks || (exam.total_questions || exam.totalQuestions)}
                </p>
              </div>
            </div>

            {exam.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-600">Description</p>
                <p className="mt-1 text-gray-900">{exam.description}</p>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="card">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Schedule</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Start Time</p>
                  <p className="text-gray-900">{formatDateTime(exam.start_time || exam.startTime)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">End Time</p>
                  <p className="text-gray-900">{formatDateTime(exam.end_time || exam.endTime)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="card">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Settings</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">Shuffle Questions</span>
                {exam.shuffle_questions || exam.shuffleQuestions ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">Shuffle Options</span>
                {exam.shuffle_options || exam.shuffleOptions ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">Show Results Immediately</span>
                {exam.show_results_immediately || exam.showResultsImmediately ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">Allow Review</span>
                {exam.allow_review || exam.allowReview ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Questions ({questions.length})
              </h3>
              {questions.length > 0 && (
                <Button variant="secondary" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              )}
            </div>

            {questions.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                <FileQuestion className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">No questions added yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-gray-900">
                          {question.question_text || question.questionText}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Badge variant="info" size="sm">
                            {question.difficulty_level || question.difficulty}
                          </Badge>
                          {question.topic && (
                            <Badge variant="default" size="sm">
                              {question.topic}
                            </Badge>
                          )}
                          <Badge variant="success" size="sm">
                            Answer: {question.correct_answer || question.correctAnswer}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Statistics */}
          <div className="card">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Statistics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Attempts</span>
                <span className="text-lg font-semibold text-gray-900">
                  {exam.total_attempts || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="text-lg font-semibold text-gray-900">
                  {exam.completed_attempts || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Score</span>
                <span className="text-lg font-semibold text-gray-900">
                  {exam.average_score ? `${exam.average_score}%` : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pass Rate</span>
                <span className="text-lg font-semibold text-gray-900">
                  {exam.pass_rate ? `${exam.pass_rate}%` : '-'}
                </span>
              </div>
            </div>

            {status !== 'draft' && (
              <Button
                variant="secondary"
                className="mt-4 w-full"
                onClick={() => navigate(`/admin/results?exam=${examId}`)}
              >
                View Results
              </Button>
            )}
          </div>

          {/* Created By */}
          <div className="card">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Created By</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="mt-1 text-gray-900">
                  {exam.created_by_name || exam.createdByName || 'Admin'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date Created</p>
                <p className="mt-1 text-gray-900">
                  {formatDateTime(exam.created_at || exam.createdAt)}
                </p>
              </div>
              {exam.updated_at && (
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="mt-1 text-gray-900">
                    {formatDateTime(exam.updated_at || exam.updatedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Publish Confirmation */}
      <ConfirmDialog
        isOpen={isPublishDialogOpen}
        onClose={() => setIsPublishDialogOpen(false)}
        onConfirm={handlePublish}
        title="Publish Exam"
        message={`Are you sure you want to publish "${exam.exam_name || exam.examName}"? Students will be able to see and take this exam after publishing.`}
        confirmText="Publish"
        loading={submitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Exam"
        message={`Are you sure you want to delete "${exam.exam_name || exam.examName}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
        loading={submitting}
      />
    </div>
  );
};

export default ViewExam;