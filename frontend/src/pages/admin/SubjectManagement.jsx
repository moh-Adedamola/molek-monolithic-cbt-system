import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, BookOpen } from 'lucide-react';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import Alert from '../../components/common/Alert';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Card from '../../components/common/Card';
import { subjectService } from '../../services/services';

const CLASS_LEVELS = [
  'JSS1', 'JSS2', 'JSS3',
  'SS1', 'SS2', 'SS3'
];

const SubjectManagement = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [alert, setAlert] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  // Form state
  const [formData, setFormData] = useState({
    subjectName: '',
    subjectCode: '',
    description: '',
    classLevels: [],
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const response = await subjectService.getAll();
      const subjectList = response.data?.subjects || response.data || [];
      setSubjects(subjectList);
      
      // Calculate stats
      const active = subjectList.filter(s => s.is_active || s.isActive).length;
      setStats({
        total: subjectList.length,
        active,
        inactive: subjectList.length - active,
      });
    } catch (error) {
      showAlert('error', error.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
  };

  const handleOpenModal = (subject = null) => {
    if (subject) {
      setSelectedSubject(subject);
      setFormData({
        subjectName: subject.subject_name || subject.subjectName,
        subjectCode: subject.subject_code || subject.subjectCode,
        description: subject.description || '',
        classLevels: subject.class_levels || subject.classLevels || [],
      });
    } else {
      setSelectedSubject(null);
      setFormData({
        subjectName: '',
        subjectCode: '',
        description: '',
        classLevels: [],
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSubject(null);
    setFormData({
      subjectName: '',
      subjectCode: '',
      description: '',
      classLevels: [],
    });
    setFormErrors({});
  };

  const handleClassLevelToggle = (level) => {
    const currentLevels = [...formData.classLevels];
    const index = currentLevels.indexOf(level);
    
    if (index > -1) {
      currentLevels.splice(index, 1);
    } else {
      currentLevels.push(level);
    }
    
    setFormData({ ...formData, classLevels: currentLevels });
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.subjectName) {
      errors.subjectName = 'Subject name is required';
    }

    if (!formData.subjectCode) {
      errors.subjectCode = 'Subject code is required';
    } else if (formData.subjectCode.length < 2 || formData.subjectCode.length > 10) {
      errors.subjectCode = 'Subject code must be between 2 and 10 characters';
    }

    if (formData.classLevels.length === 0) {
      errors.classLevels = 'Select at least one class level';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const payload = {
        subject_name: formData.subjectName,
        subject_code: formData.subjectCode.toUpperCase(),
        description: formData.description,
        class_levels: formData.classLevels,
      };

      if (selectedSubject) {
        await subjectService.update(selectedSubject.id, payload);
        showAlert('success', 'Subject updated successfully');
      } else {
        await subjectService.create(payload);
        showAlert('success', 'Subject created successfully');
      }

      handleCloseModal();
      loadSubjects();
    } catch (error) {
      showAlert('error', error.message || 'Failed to save subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (subject) => {
    setSelectedSubject(subject);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setSubmitting(true);
      await subjectService.delete(selectedSubject.id);
      showAlert('success', 'Subject deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedSubject(null);
      loadSubjects();
    } catch (error) {
      showAlert('error', error.message || 'Failed to delete subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (subject) => {
    try {
      await subjectService.toggleActive(subject.id);
      showAlert(
        'success',
        `Subject ${subject.is_active || subject.isActive ? 'deactivated' : 'activated'} successfully`
      );
      loadSubjects();
    } catch (error) {
      showAlert('error', error.message || 'Failed to update subject status');
    }
  };

  const columns = [
    {
      key: 'subjectCode',
      label: 'Code',
      render: (value, row) => (
        <span className="font-mono font-semibold text-blue-600">
          {row.subject_code || row.subjectCode}
        </span>
      ),
    },
    {
      key: 'subjectName',
      label: 'Subject Name',
      render: (value, row) => row.subject_name || row.subjectName,
    },
    {
      key: 'classLevels',
      label: 'Class Levels',
      render: (value, row) => {
        const levels = row.class_levels || row.classLevels || [];
        return (
          <div className="flex flex-wrap gap-1">
            {levels.map((level) => (
              <Badge key={level} variant="info" size="sm">
                {level}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: 'questionCount',
      label: 'Questions',
      render: (value, row) => (
        <span className="text-gray-600">
          {row.question_count || row.questionCount || 0}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (value, row) => {
        const isActive = row.is_active !== undefined ? row.is_active : row.isActive;
        return (
          <Badge variant={isActive ? 'success' : 'error'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenModal(row)}
            className="rounded p-1 text-blue-600 hover:bg-blue-50"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleToggleActive(row)}
            className={`rounded p-1 ${
              row.is_active || row.isActive
                ? 'text-orange-600 hover:bg-orange-50'
                : 'text-green-600 hover:bg-green-50'
            }`}
            title={row.is_active || row.isActive ? 'Deactivate' : 'Activate'}
          >
            {row.is_active || row.isActive ? (
              <ToggleRight className="h-4 w-4" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => handleDeleteClick(row)}
            className="rounded p-1 text-red-600 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subject Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage subjects across all class levels
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card
          title="Total Subjects"
          value={stats.total}
          icon={BookOpen}
        />
        <Card
          title="Active"
          value={stats.active}
          subtitle="Currently in use"
        />
        <Card
          title="Inactive"
          value={stats.inactive}
          subtitle="Not in use"
        />
      </div>

      {/* Table */}
      <div className="card">
        <Table
          columns={columns}
          data={subjects}
          loading={loading}
          emptyMessage="No subjects found. Create your first subject to get started."
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedSubject ? 'Edit Subject' : 'Create New Subject'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Subject Name"
            type="text"
            value={formData.subjectName}
            onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
            error={formErrors.subjectName}
            placeholder="e.g., Mathematics"
            required
          />

          <Input
            label="Subject Code"
            type="text"
            value={formData.subjectCode}
            onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
            error={formErrors.subjectCode}
            placeholder="e.g., MATH"
            maxLength={10}
            required
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field min-h-[80px]"
              placeholder="Brief description of the subject..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Class Levels <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CLASS_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleClassLevelToggle(level)}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
                    formData.classLevels.includes(level)
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            {formErrors.classLevels && (
              <p className="mt-1 text-sm text-red-600">{formErrors.classLevels}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseModal}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {selectedSubject ? 'Update Subject' : 'Create Subject'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Subject"
        message={`Are you sure you want to delete ${
          selectedSubject?.subject_name || selectedSubject?.subjectName
        }? This will also delete all associated questions and cannot be undone.`}
        confirmText="Delete"
        type="danger"
        loading={submitting}
      />
    </div>
  );
};

export default SubjectManagement;