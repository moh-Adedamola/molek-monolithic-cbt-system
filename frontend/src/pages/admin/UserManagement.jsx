import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UserCheck, UserX, Search, Download } from 'lucide-react';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import Alert from '../../components/common/Alert';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { userService } from '../../services/services';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [alert, setAlert] = useState(null);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAll(filters);
      setUsers(response.data.users || []);
    } catch (error) {
      showAlert('error', error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        email: user.email,
        fullName: user.full_name || user.fullName,
        role: user.role,
        password: '', // Don't populate password for edit
      });
    } else {
      setSelectedUser(null);
      setFormData({
        email: '',
        fullName: '',
        role: '',
        password: '',
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setFormData({
      email: '',
      fullName: '',
      role: '',
      password: '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!formData.fullName) {
      errors.fullName = 'Full name is required';
    }

    if (!formData.role) {
      errors.role = 'Role is required';
    }

    if (!selectedUser && !formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      if (selectedUser) {
        // Update existing user
        const updateData = {
          email: formData.email,
          full_name: formData.fullName,
          role: formData.role,
        };
        
        // Only include password if it's provided
        if (formData.password) {
          updateData.password = formData.password;
        }

        await userService.update(selectedUser.user_id || selectedUser.userId, updateData);
        showAlert('success', 'User updated successfully');
      } else {
        // Create new user
        await userService.create({
          email: formData.email,
          full_name: formData.fullName,
          role: formData.role,
          password: formData.password,
        });
        showAlert('success', 'User created successfully');
      }

      handleCloseModal();
      loadUsers();
    } catch (error) {
      showAlert('error', error.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setSubmitting(true);
      await userService.delete(selectedUser.user_id || selectedUser.userId);
      showAlert('success', 'User deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      showAlert('error', error.message || 'Failed to delete user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const userId = user.user_id || user.userId;
      if (user.is_active || user.isActive) {
        await userService.deactivate(userId);
        showAlert('success', 'User deactivated successfully');
      } else {
        await userService.activate(userId);
        showAlert('success', 'User activated successfully');
      }
      loadUsers();
    } catch (error) {
      showAlert('error', error.message || 'Failed to update user status');
    }
  };

  const columns = [
    {
      key: 'fullName',
      label: 'Full Name',
      render: (value, row) => row.full_name || row.fullName,
    },
    {
      key: 'email',
      label: 'Email',
    },
    {
      key: 'role',
      label: 'Role',
      render: (value) => (
        <Badge variant="info">
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
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
      key: 'createdAt',
      label: 'Created',
      render: (value, row) => {
        const date = new Date(row.created_at || row.createdAt);
        return date.toLocaleDateString();
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
            onClick={() => handleToggleStatus(row)}
            className="rounded p-1 text-green-600 hover:bg-green-50"
            title={row.is_active || row.isActive ? 'Deactivate' : 'Activate'}
          >
            {row.is_active || row.isActive ? (
              <UserX className="h-4 w-4" />
            ) : (
              <UserCheck className="h-4 w-4" />
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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage system users (admins and teachers)
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Select
            label="Role"
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'admin', label: 'Admin' },
              { value: 'teacher', label: 'Teacher' },
            ]}
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            options={[
              { value: '', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
          <div className="flex items-end">
            <Button variant="secondary" onClick={loadUsers} className="w-full">
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <Table
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage="No users found"
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedUser ? 'Edit User' : 'Create New User'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={formErrors.email}
            required
          />

          <Input
            label="Full Name"
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            error={formErrors.fullName}
            required
          />

          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            error={formErrors.role}
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'teacher', label: 'Teacher' },
            ]}
            placeholder="Select role"
            required
          />

          <Input
            label={selectedUser ? 'New Password (leave blank to keep current)' : 'Password'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={formErrors.password}
            required={!selectedUser}
          />

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
              {selectedUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete ${selectedUser?.full_name || selectedUser?.fullName}? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
        loading={submitting}
      />
    </div>
  );
};

export default UserManagement;