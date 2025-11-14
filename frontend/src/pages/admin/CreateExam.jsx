import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import Stepper from '../../components/common/Stepper';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import TextArea from '../../components/common/TextArea';
import Alert from '../../components/common/Alert';
import Badge from '../../components/common/Badge';
import { examService, subjectService, questionService } from '../../services/services';

const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

const STEPS = [
  { title: 'Basic Info', description: 'Exam details and settings' },
  { title: 'Select Questions', description: 'Choose questions for the exam' },
  { title: 'Review', description: 'Review and confirm' },
];

const CreateExam = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [alert, setAlert] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    examName: '',
    subjectId: '',
    classLevel: '',
    description: '',
    durationMinutes: 60,
    totalQuestions: 20,
    startTime: '',
    endTime: '',
    passingScore: 50,
    shuffleQuestions: true,
    shuffleOptions: true,
    showResultsImmediately: false,
    allowReview: true,
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (formData.subjectId && currentStep === 2) {
      loadQuestions();
    }
  }, [formData.subjectId, currentStep]);

  const loadSubjects = async () => {
    try {
      const response = await subjectService.getAll();
      setSubjects(response.data?.subjects || response.data || []);
    } catch (error) {
      showAlert('error', 'Failed to load subjects');
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await questionService.getAll({
        subject_id: formData.subjectId,
        class_level: formData.classLevel,
      });
      setQuestions(response.data?.questions || response.data || []);
    } catch (error) {
      showAlert('error', 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep1 = () => {
    const errors = {};

    if (!formData.examName) errors.examName = 'Exam name is required';
    if (!formData.subjectId) errors.subjectId = 'Subject is required';
    if (!formData.classLevel) errors.classLevel = 'Class level is required';
    if (!formData.startTime) errors.startTime = 'Start time is required';
    if (!formData.endTime) errors.endTime = 'End time is required';
    if (formData.durationMinutes < 10) errors.durationMinutes = 'Duration must be at least 10 minutes';
    if (formData.totalQuestions < 1) errors.totalQuestions = 'Must have at least 1 question';
    if (formData.passingScore < 0 || formData.passingScore > 100) {
      errors.passingScore = 'Passing score must be between 0 and 100';
    }

    // Validate date/time
    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    if (end <= start) {
      errors.endTime = 'End time must be after start time';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    if (selectedQuestions.length !== formData.totalQuestions) {
      showAlert(
        'error',
        `Please select exactly ${formData.totalQuestions} questions. Currently selected: ${selectedQuestions.length}`
      );
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) {
      showAlert('error', 'Please fill in all required fields correctly');
      return;
    }

    if (currentStep === 2 && !validateStep2()) {
      return;
    }

    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuestionToggle = (questionId) => {
    if (selectedQuestions.includes(questionId)) {
      setSelectedQuestions(selectedQuestions.filter((id) => id !== questionId));
    } else {
      if (selectedQuestions.length >= formData.totalQuestions) {
        showAlert('warning', `You can only select ${formData.totalQuestions} questions`);
        return;
      }
      setSelectedQuestions([...selectedQuestions, questionId]);
    }
  };

  const handleAutoSelect = () => {
    if (questions.length < formData.totalQuestions) {
      showAlert('error', `Not enough questions available. Found: ${questions.length}, Need: ${formData.totalQuestions}`);
      return;
    }

    // Randomly select questions
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, formData.totalQuestions).map((q) => q.id);
    setSelectedQuestions(selected);
    showAlert('success', `Auto-selected ${formData.totalQuestions} questions`);
  };

  const handleSubmit = async (publishNow = false) => {
    try {
      setSubmitting(true);

      const payload = {
        exam_name: formData.examName,
        subject_id: formData.subjectId,
        class_level: formData.classLevel,
        description: formData.description || null,
        duration_minutes: formData.durationMinutes,
        total_questions: formData.totalQuestions,
        passing_score: formData.passingScore,
        start_time: formData.startTime,
        end_time: formData.endTime,
        shuffle_questions: formData.shuffleQuestions,
        shuffle_options: formData.shuffleOptions,
        show_results_immediately: formData.showResultsImmediately,
        allow_review: formData.allowReview,
        question_ids: selectedQuestions,
      };

      const response = await examService.create(payload);
      const examId = response.data?.exam?.id || response.data?.id;

      if (publishNow && examId) {
        await examService.publish(examId);
        showAlert('success', 'Exam created and published successfully!');
      } else {
        showAlert('success', 'Exam created successfully as draft!');
      }

      setTimeout(() => {
        navigate('/admin/exams');
      }, 1500);
    } catch (error) {
      showAlert('error', error.message || 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Basic Information</h3>
        <div className="space-y-4">
          <Input
            label="Exam Name"
            value={formData.examName}
            onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
            error={formErrors.examName}
            placeholder="e.g., Mathematics CA Test 1"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Subject"
              value={formData.subjectId}
              onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
              error={formErrors.subjectId}
              options={subjects.map((s) => ({
                value: s.id,
                label: s.subject_name || s.subjectName,
              }))}
              placeholder="Select subject"
              required
            />
            <Select
              label="Class Level"
              value={formData.classLevel}
              onChange={(e) => setFormData({ ...formData, classLevel: e.target.value })}
              error={formErrors.classLevel}
              options={CLASS_LEVELS.map((level) => ({ value: level, label: level }))}
              placeholder="Select class"
              required
            />
          </div>

          <TextArea
            label="Description (Optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the exam..."
            rows={3}
          />
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Exam Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Duration (minutes)"
            type="number"
            value={formData.durationMinutes}
            onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
            error={formErrors.durationMinutes}
            min={10}
            required
          />
          <Input
            label="Total Questions"
            type="number"
            value={formData.totalQuestions}
            onChange={(e) => setFormData({ ...formData, totalQuestions: parseInt(e.target.value) })}
            error={formErrors.totalQuestions}
            min={1}
            required
          />
          <Input
            label="Passing Score (%)"
            type="number"
            value={formData.passingScore}
            onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) })}
            error={formErrors.passingScore}
            min={0}
            max={100}
            required
          />
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Schedule</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date & Time"
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            error={formErrors.startTime}
            required
          />
          <Input
            label="End Date & Time"
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            error={formErrors.endTime}
            required
          />
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Options</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.shuffleQuestions}
              onChange={(e) => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Shuffle questions for each student</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.shuffleOptions}
              onChange={(e) => setFormData({ ...formData, shuffleOptions: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Shuffle answer options</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.showResultsImmediately}
              onChange={(e) => setFormData({ ...formData, showResultsImmediately: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show results immediately after submission</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.allowReview}
              onChange={(e) => setFormData({ ...formData, allowReview: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Allow students to review after submission</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const selectedQuestionsData = questions.filter((q) => selectedQuestions.includes(q.id));

    return (
      <div className="space-y-6">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Select Questions</h3>
              <p className="mt-1 text-sm text-gray-600">
                Selected: {selectedQuestions.length} / {formData.totalQuestions}
              </p>
            </div>
            <Button variant="secondary" onClick={handleAutoSelect}>
              Auto Select
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-500">No questions found for selected subject and class level.</p>
              <Button variant="secondary" onClick={() => navigate('/admin/questions')} className="mt-4">
                Add Questions
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((question) => {
                const isSelected = selectedQuestions.includes(question.id);
                return (
                  <div
                    key={question.id}
                    onClick={() => handleQuestionToggle(question.id)}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600"
                      />
                      <div className="flex-1">
                        <p className="text-gray-900">{question.question_text || question.questionText}</p>
                        <div className="mt-2 flex gap-2">
                          <Badge variant="info" size="sm">
                            {question.difficulty_level || question.difficulty}
                          </Badge>
                          {question.topic && (
                            <Badge variant="default" size="sm">
                              {question.topic}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const selectedQuestionsData = questions.filter((q) => selectedQuestions.includes(q.id));
    const selectedSubject = subjects.find((s) => s.id === formData.subjectId);

    return (
      <div className="space-y-6">
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Review Exam Details</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Exam Name</p>
                <p className="mt-1 text-gray-900">{formData.examName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Subject</p>
                <p className="mt-1 text-gray-900">
                  {selectedSubject?.subject_name || selectedSubject?.subjectName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Class Level</p>
                <p className="mt-1 text-gray-900">{formData.classLevel}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Duration</p>
                <p className="mt-1 text-gray-900">{formData.durationMinutes} minutes</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Questions</p>
                <p className="mt-1 text-gray-900">{formData.totalQuestions}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Passing Score</p>
                <p className="mt-1 text-gray-900">{formData.passingScore}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Start Time</p>
                <p className="mt-1 text-gray-900">{new Date(formData.startTime).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">End Time</p>
                <p className="mt-1 text-gray-900">{new Date(formData.endTime).toLocaleString()}</p>
              </div>
            </div>

            {formData.description && (
              <div>
                <p className="text-sm font-medium text-gray-600">Description</p>
                <p className="mt-1 text-gray-900">{formData.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Selected Questions ({selectedQuestionsData.length})</h3>
          <div className="space-y-2">
            {selectedQuestionsData.map((question, index) => (
              <div key={question.id} className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm text-gray-900">
                  <span className="font-semibold">{index + 1}.</span>{' '}
                  {question.question_text || question.questionText}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card bg-blue-50">
          <h3 className="mb-2 font-semibold text-blue-900">Ready to Create?</h3>
          <p className="text-sm text-blue-800">
            You can save this exam as a draft or publish it immediately. Draft exams can be edited later.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-6">
      {/* Alert */}
      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/exams')}
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Exam</h1>
          <p className="mt-1 text-sm text-gray-600">Follow the steps to create your exam</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="card">
        <Stepper steps={STEPS} currentStep={currentStep} />
      </div>

      {/* Step Content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      {/* Navigation */}
      <div className="card">
        <div className="flex justify-between">
          <div>
            {currentStep > 1 && (
              <Button variant="secondary" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => handleSubmit(false)}
                  loading={submitting}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
                <Button onClick={() => handleSubmit(true)} loading={submitting}>
                  Publish Exam
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateExam;