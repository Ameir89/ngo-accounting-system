// frontend/src/pages/UserManagement.jsx - Fixed Version
import {
  Edit,
  Lock,
  Plus,
  Shield,
  Trash2,
  User,
  UserCheck,
  UserX,
} from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import DataTable from "../components/Tables/DataTable";
import ErrorMessage from "../components/UI/ErrorMessage";
import Modal, { ConfirmModal } from "../components/UI/Modal";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../hooks/useAuth";

// User Form Component
const UserForm = ({ user = null, onSubmit, onCancel, loading }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    role_name: user?.role_name || "Data Entry Clerk",
    phone: user?.phone || "",
    is_active: user?.is_active !== undefined ? user.is_active : true,
    must_change_password: user ? false : true,
    password: "",
    confirm_password: "",
  });

  const [errors, setErrors] = useState({});

  const roles = [
    { value: "Administrator", label: "Administrator" },
    { value: "Financial Manager", label: "Financial Manager" },
    { value: "Accountant", label: "Accountant" },
    { value: "Data Entry Clerk", label: "Data Entry Clerk" },
    { value: "Auditor", label: "Auditor" },
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }

    if (!user && !formData.password) {
      newErrors.password = "Password is required for new users";
    }

    if (!user && formData.password && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!user && formData.password !== formData.confirm_password) {
      newErrors.confirm_password = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const submitData = { ...formData };
      if (user) {
        // Don't send password fields if not changing password
        if (!submitData.password) {
          delete submitData.password;
          delete submitData.confirm_password;
        }
      }
      delete submitData.confirm_password;
      onSubmit(submitData);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Username *
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => handleChange("username", e.target.value)}
            className={`form-input ${errors.username ? "border-red-500" : ""}`}
            placeholder="Enter username"
            disabled={!!user} // Username cannot be changed after creation
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className={`form-input ${errors.email ? "border-red-500" : ""}`}
            placeholder="user@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            First Name *
          </label>
          <input
            type="text"
            value={formData.first_name}
            onChange={(e) => handleChange("first_name", e.target.value)}
            className={`form-input ${
              errors.first_name ? "border-red-500" : ""
            }`}
            placeholder="First name"
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            value={formData.last_name}
            onChange={(e) => handleChange("last_name", e.target.value)}
            className={`form-input ${errors.last_name ? "border-red-500" : ""}`}
            placeholder="Last name"
          />
          {errors.last_name && (
            <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="form-input"
            placeholder="+1-234-567-8900"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Role *
          </label>
          <select
            value={formData.role_name}
            onChange={(e) => handleChange("role_name", e.target.value)}
            className="form-select"
          >
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Password Section */}
      {!user && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Password
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className={`form-input ${
                  errors.password ? "border-red-500" : ""
                }`}
                placeholder="Enter password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                value={formData.confirm_password}
                onChange={(e) =>
                  handleChange("confirm_password", e.target.value)
                }
                className={`form-input ${
                  errors.confirm_password ? "border-red-500" : ""
                }`}
                placeholder="Confirm password"
              />
              {errors.confirm_password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirm_password}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Status */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          User Status
        </h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="is_active"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
            >
              Active user account
            </label>
          </div>

          {!user && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="must_change_password"
                checked={formData.must_change_password}
                onChange={(e) =>
                  handleChange("must_change_password", e.target.checked)
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="must_change_password"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                User must change password on first login
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex items-center"
        >
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          )}
          {user ? "Update User" : "Create User"}
        </button>
      </div>
    </form>
  );
};

// Mock data for users (replace with actual API calls)
const mockUsersData = [
  {
    id: "1",
    username: "admin",
    email: "admin@ngo.org",
    first_name: "Admin",
    last_name: "User",
    role_name: "Administrator",
    phone: "+1-555-0001",
    is_active: true,
    last_login: "2024-01-15T10:30:00Z",
    created_at: "2023-01-01T00:00:00Z",
  },
  {
    id: "2",
    username: "jdoe",
    email: "john.doe@ngo.org",
    first_name: "John",
    last_name: "Doe",
    role_name: "Financial Manager",
    phone: "+1-555-0002",
    is_active: true,
    last_login: "2024-01-15T09:15:00Z",
    created_at: "2023-02-15T00:00:00Z",
  },
  {
    id: "3",
    username: "jsmith",
    email: "jane.smith@ngo.org",
    first_name: "Jane",
    last_name: "Smith",
    role_name: "Accountant",
    phone: "+1-555-0003",
    is_active: true,
    last_login: "2024-01-14T16:45:00Z",
    created_at: "2023-03-20T00:00:00Z",
  },
  {
    id: "4",
    username: "mwilson",
    email: "mike.wilson@ngo.org",
    first_name: "Mike",
    last_name: "Wilson",
    role_name: "Data Entry Clerk",
    phone: "+1-555-0004",
    is_active: false,
    last_login: "2023-12-20T14:30:00Z",
    created_at: "2023-05-10T00:00:00Z",
  },
  {
    id: "5",
    username: "sauditor",
    email: "sarah.auditor@ngo.org",
    first_name: "Sarah",
    last_name: "Auditor",
    role_name: "Auditor",
    phone: "+1-555-0005",
    is_active: true,
    last_login: "2024-01-10T11:20:00Z",
    created_at: "2023-08-15T00:00:00Z",
  },
];

const UserManagement = () => {
  const { t, formatDate } = useLanguage();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState(mockUsersData);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] =
    useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToResetPassword, setUserToResetPassword] = useState(null);

  // Format date time helper
  const formatDateTime = useCallback((dateString) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      return 'Invalid date';
    }
  }, []);

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "Administrator":
        return "badge-danger";
      case "Financial Manager":
        return "badge-warning";
      case "Accountant":
        return "badge-info";
      case "Data Entry Clerk":
        return "badge-secondary";
      case "Auditor":
        return "badge-success";
      default:
        return "badge-secondary";
    }
  };

  // Handle creating a new user
  const handleCreateUser = async (userData) => {
    setLoading(true);
    try {
      // Mock API call - replace with actual API call
      const newUser = {
        ...userData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        last_login: null,
      };

      setUsers((prev) => [...prev, newUser]);
      setShowCreateModal(false);
      toast.success("User created successfully");
    } catch (error) {
      console.error('Create user error:', error);
      toast.error("Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  // Handle editing a user
  const handleEditUser = async (userData) => {
    setLoading(true);
    try {
      // Mock API call - replace with actual API call
      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id ? { ...user, ...userData } : user
        )
      );
      setShowEditModal(false);
      setSelectedUser(null);
      toast.success("User updated successfully");
    } catch (error) {
      console.error('Update user error:', error);
      toast.error("Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setLoading(true);
    try {
      // Mock API call - replace with actual API call
      setUsers((prev) => prev.filter((user) => user.id !== userToDelete.id));
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      toast.success("User deleted successfully");
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error("Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  // Handle resetting password
  const handleResetPassword = async () => {
    if (!userToResetPassword) return;

    setLoading(true);
    try {
      // Mock API call - replace with actual API call
      toast.success(
        `Password reset email sent to ${userToResetPassword.email}`
      );
      setShowResetPasswordConfirm(false);
      setUserToResetPassword(null);
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error("Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  // Handle toggling user status
  const handleToggleUserStatus = async (user) => {
    setLoading(true);
    try {
      // Mock API call - replace with actual API call
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, is_active: !u.is_active } : u
        )
      );

      toast.success(
        `User ${!user.is_active ? "activated" : "deactivated"} successfully`
      );
    } catch (error) {
      console.error('Toggle user status error:', error);
      toast.error("Failed to update user status");
    } finally {
      setLoading(false);
    }
  };

  // Table columns configuration
  const columns = [
    {
      key: "username",
      title: "User",
      sortable: true,
      render: (value, user) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              @{value}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      title: "Email",
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-900 dark:text-white">{value}</div>
      ),
    },
    {
      key: "role_name",
      title: "Role",
      sortable: true,
      render: (value) => (
        <span className={`badge ${getRoleBadgeColor(value)}`}>{value}</span>
      ),
    },
    {
      key: "phone",
      title: "Phone",
      render: (value) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {value || "N/A"}
        </div>
      ),
    },
    {
      key: "last_login",
      title: "Last Login",
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTime(value)}
        </div>
      ),
    },
    {
      key: "is_active",
      title: "Status",
      render: (value) => (
        <div className="flex items-center">
          {value ? (
            <span className="badge badge-success flex items-center">
              <UserCheck className="h-3 w-3 mr-1" />
              Active
            </span>
          ) : (
            <span className="badge badge-danger flex items-center">
              <UserX className="h-3 w-3 mr-1" />
              Inactive
            </span>
          )}
        </div>
      ),
    },
  ];

  // Table actions
  const actions = [
    {
      key: "edit",
      title: "Edit User",
      icon: <Edit className="h-4 w-4" />,
      className: "text-indigo-600 hover:text-indigo-900 dark:text-indigo-400",
    },
    {
      key: "toggle_status",
      title: (user) => (user.is_active ? "Deactivate" : "Activate"),
      icon: (user) =>
        user.is_active ? (
          <UserX className="h-4 w-4" />
        ) : (
          <UserCheck className="h-4 w-4" />
        ),
      className: (user) =>
        user.is_active
          ? "text-red-600 hover:text-red-900"
          : "text-green-600 hover:text-green-900",
    },
    {
      key: "reset_password",
      title: "Reset Password",
      icon: <Lock className="h-4 w-4" />,
      className: "text-orange-600 hover:text-orange-900",
    },
    {
      key: "delete",
      title: "Delete User",
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-900",
      condition: (user) => user.username !== "admin" && user.id !== currentUser?.id,
    },
  ];

  // Handle table actions
  const handleRowAction = useCallback((action, user) => {
    switch (action) {
      case "edit":
        setSelectedUser(user);
        setShowEditModal(true);
        break;
      case "toggle_status":
        handleToggleUserStatus(user);
        break;
      case "reset_password":
        setUserToResetPassword(user);
        setShowResetPasswordConfirm(true);
        break;
      case "delete":
        setUserToDelete(user);
        setShowDeleteConfirm(true);
        break;
      default:
        console.warn(`Unhandled action: ${action}`);
    }
  }, []);

  if (error) {
    return <ErrorMessage message={error} onRetry={() => setError(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
            <User className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              User Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage system users and their permissions
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Users
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {users.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Users
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {users.filter((u) => u.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Inactive Users
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {users.filter((u) => !u.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Admins
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {users.filter((u) => u.role_name === "Administrator").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <DataTable
        data={users}
        columns={columns}
        actions={actions}
        onRowAction={handleRowAction}
        loading={loading}
        emptyMessage="No users found"
        searchable={true}
        exportable={true}
      />

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User"
        size="xl"
      >
        <UserForm
          onSubmit={handleCreateUser}
          onCancel={() => setShowCreateModal(false)}
          loading={loading}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        title="Edit User"
        size="xl"
      >
        <UserForm
          user={selectedUser}
          onSubmit={handleEditUser}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          loading={loading}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete user "${userToDelete?.username}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
        loading={loading}
      />

      {/* Reset Password Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetPasswordConfirm}
        onClose={() => {
          setShowResetPasswordConfirm(false);
          setUserToResetPassword(null);
        }}
        onConfirm={handleResetPassword}
        title="Reset Password"
        message={`A password reset email will be sent to "${userToResetPassword?.email}". Continue?`}
        confirmText="Send Reset Email"
        type="warning"
        loading={loading}
      />
    </div>
  );
};

export default UserManagement;