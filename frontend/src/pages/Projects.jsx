// frontend/src/pages/Projects.jsx
import {
  BarChart3,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  FolderOpen,
  Plus,
  Search,
  Target,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import ErrorMessage from "../components/UI/ErrorMessage";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import Modal from "../components/UI/Modal";
import { useLanguage } from "../contexts/LanguageContext";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
  useCostCenters,
} from "../hooks/useApi";

const Projects = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const { t, formatCurrency } = useLanguage();

  const {
    data: projectsData,
    isLoading,
    error,
    refetch,
  } = useProjects({
    search: searchTerm,
    status: statusFilter,
    page: currentPage,
    per_page: 20,
  });

  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const projects = projectsData?.projects || [];
  const pagination = projectsData?.pagination || {};

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "planning", label: "Planning" },
    { value: "active", label: "Active" },
    { value: "on_hold", label: "On Hold" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const handleSubmit = async (projectData) => {
    try {
      if (editingProject) {
        await updateProjectMutation.mutateAsync({
          id: editingProject.id,
          data: projectData,
        });
        toast.success("Project updated successfully");
      } else {
        await createProjectMutation.mutateAsync(projectData);
        toast.success("Project created successfully");
      }
      setShowForm(false);
      setEditingProject(null);
      refetch();
    } catch (error) {
      toast.error(error.message || "Operation failed");
    }
  };

  if (isLoading) return <LoadingSpinner message="Loading projects..." />;
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            Project Management
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage projects, track budgets, and monitor progress
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => {
              setEditingProject(null);
              setShowForm(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Projects"
          value="24"
          icon={FolderOpen}
          color="bg-blue-500"
        />
        <SummaryCard
          title="Active Projects"
          value="18"
          icon={Target}
          color="bg-green-500"
        />
        <SummaryCard
          title="Total Budget"
          value={formatCurrency(2450000)}
          icon={BarChart3}
          color="bg-purple-500"
        />
        <SummaryCard
          title="On Schedule"
          value="15"
          icon={CheckCircle}
          color="bg-emerald-500"
        />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Search
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="form-input pl-10"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <select
                className="form-select mt-1"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Priority
              </label>
              <select className="form-select mt-1">
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                }}
                className="btn-secondary"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <ProjectsGrid
        projects={projects}
        onView={(project) => {
          setSelectedProject(project);
          setShowDetails(true);
        }}
        onEdit={(project) => {
          setEditingProject(project);
          setShowForm(true);
        }}
      />

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingProject(null);
        }}
        title={editingProject ? "Edit Project" : "Create New Project"}
        size="xl"
      >
        <ProjectForm
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingProject(null);
          }}
          loading={
            createProjectMutation.isLoading || updateProjectMutation.isLoading
          }
          editData={editingProject}
        />
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={`Project Details - ${selectedProject?.name || ""}`}
        size="xl"
      >
        {selectedProject && (
          <ProjectDetails
            project={selectedProject}
            onClose={() => setShowDetails(false)}
            onEdit={() => {
              setShowDetails(false);
              setEditingProject(selectedProject);
              setShowForm(true);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({ title, value, icon: Icon, color }) => (
  <div className="card">
    <div className="card-body">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`${color} rounded-md p-3`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              {title}
            </dt>
            <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
              {value}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

// Projects Grid Component
const ProjectsGrid = ({ projects, onView, onEdit }) => {
  if (projects.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No projects found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onView={onView}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};

// Project Card Component
const ProjectCard = ({ project, onView, onEdit }) => {
  const { formatCurrency, formatDate } = useLanguage();

  const getStatusColor = (status) => {
    const colors = {
      planning: "badge-warning",
      active: "badge-success",
      on_hold: "badge-warning",
      completed: "badge-info",
      cancelled: "badge-danger",
    };
    return colors[status] || "badge-info";
  };

  const getStatusIcon = (status) => {
    const icons = {
      planning: Clock,
      active: Target,
      on_hold: Clock,
      completed: CheckCircle,
      cancelled: XCircle,
    };
    return icons[status] || Clock;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: "text-red-600",
      medium: "text-yellow-600",
      low: "text-green-600",
    };
    return colors[priority] || "text-gray-600";
  };

  const StatusIcon = getStatusIcon(project.status);
  const budgetUsed = (project.used_budget / project.total_budget) * 100;

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="card-body">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
              {project.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {project.code}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`badge ${getStatusColor(
                project.status
              )} flex items-center`}
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {project.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {project.description || "No description available"}
        </p>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-700 dark:text-gray-300">Progress</span>
            <span className="font-medium">{project.progress || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${project.progress || 0}%` }}
            ></div>
          </div>
        </div>

        {/* Budget */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-700 dark:text-gray-300">
              Budget Used
            </span>
            <span className="font-medium">{budgetUsed.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                budgetUsed >= 90
                  ? "bg-red-500"
                  : budgetUsed >= 75
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${Math.min(budgetUsed, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatCurrency(project.used_budget || 0)}</span>
            <span>{formatCurrency(project.total_budget || 0)}</span>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Start Date</span>
            <span className="text-gray-900 dark:text-white">
              {formatDate(project.start_date)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">End Date</span>
            <span className="text-gray-900 dark:text-white">
              {formatDate(project.end_date)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Priority</span>
            <span
              className={`font-medium capitalize ${getPriorityColor(
                project.priority
              )}`}
            >
              {project.priority || "medium"}
            </span>
          </div>
        </div>

        {/* Team */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <Users className="h-4 w-4 mr-1" />
            <span>{project.team_size || 0} members</span>
          </div>
          <div className="text-sm text-gray-500">
            Manager: {project.manager_name || "Not assigned"}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onView(project)}
            className="btn-secondary text-sm"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </button>
          <button
            onClick={() => onEdit(project)}
            className="btn-primary text-sm"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

// Project Form Component
const ProjectForm = ({ onSubmit, onCancel, loading, editData }) => {
  const [formData, setFormData] = useState({
    code: editData?.code || "",
    name: editData?.name || "",
    description: editData?.description || "",
    status: editData?.status || "planning",
    priority: editData?.priority || "medium",
    start_date: editData?.start_date || "",
    end_date: editData?.end_date || "",
    total_budget: editData?.total_budget || "",
    manager_id: editData?.manager_id || "",
    cost_center_id: editData?.cost_center_id || "",
    is_billable: editData?.is_billable ?? true,
  });

  const [errors, setErrors] = useState({});

  const { data: centersData } = useCostCenters({
    search: "",
    status: "",
    page: 0,
    per_page: 100,
  });

  const costCenters = centersData?.cost_centers || [];
  const validateForm = () => {
    const newErrors = {};

    if (!formData.code) newErrors.code = "Project code is required";
    if (!formData.name) newErrors.name = "Project name is required";
    if (!formData.start_date) newErrors.start_date = "Start date is required";
    if (!formData.end_date) newErrors.end_date = "End date is required";
    if (
      formData.start_date &&
      formData.end_date &&
      new Date(formData.start_date) >= new Date(formData.end_date)
    ) {
      newErrors.end_date = "End date must be after start date";
    }
    if (formData.total_budget && isNaN(parseFloat(formData.total_budget))) {
      newErrors.total_budget = "Invalid budget amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        total_budget: parseFloat(formData.total_budget) || 0,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Project Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Project Code *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, code: e.target.value }))
              }
              className={`form-input mt-1 ${
                errors.code ? "border-red-500" : ""
              }`}
              placeholder="e.g., PROJ001"
            />
            {errors.code && (
              <p className="mt-1 text-sm text-red-600">{errors.code}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className={`form-input mt-1 ${
                errors.name ? "border-red-500" : ""
              }`}
              placeholder="e.g., Education Initiative"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, status: e.target.value }))
              }
              className="form-select mt-1"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, priority: e.target.value }))
              }
              className="form-select mt-1"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, start_date: e.target.value }))
              }
              className={`form-input mt-1 ${
                errors.start_date ? "border-red-500" : ""
              }`}
            />
            {errors.start_date && (
              <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              End Date *
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, end_date: e.target.value }))
              }
              className={`form-input mt-1 ${
                errors.end_date ? "border-red-500" : ""
              }`}
            />
            {errors.end_date && (
              <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Budget
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.total_budget}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  total_budget: e.target.value,
                }))
              }
              className={`form-input mt-1 ${
                errors.total_budget ? "border-red-500" : ""
              }`}
              placeholder="0.00"
            />
            {errors.total_budget && (
              <p className="mt-1 text-sm text-red-600">{errors.total_budget}</p>
            )}
          </div>

          <div>
            <label className="flex items-center mt-6">
              <input
                type="checkbox"
                checked={formData.is_billable}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_billable: e.target.checked,
                  }))
                }
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Billable Project
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cost Center
            </label>
            <select
              value={formData.cost_center_id}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  cost_center_id: e.target.value,
                }))
              }
              className="form-select mt-1"
            >
              <option value="">Select a cost center</option>
              {costCenters.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={4}
            className="form-textarea mt-1"
            placeholder="Describe the project objectives and scope..."
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={loading}
        >
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading
            ? "Saving..."
            : editData
            ? "Update Project"
            : "Create Project"}
        </button>
      </div>
    </form>
  );
};

// Project Details Component
const ProjectDetails = ({ project, onClose, onEdit }) => {
  const { formatCurrency, formatDate } = useLanguage();

  const getStatusColor = (status) => {
    const colors = {
      planning: "badge-warning",
      active: "badge-success",
      on_hold: "badge-warning",
      completed: "badge-info",
      cancelled: "badge-danger",
    };
    return colors[status] || "badge-info";
  };

  const budgetUsed =
    project.total_budget > 0
      ? Math.round((project.used_budget / project.total_budget) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {project.name}
            </h3>
            <p className="text-gray-600 mt-1">{project.code}</p>
            <div className="flex items-center space-x-3 mt-3">
              <span className={`badge ${getStatusColor(project.status)}`}>
                {project.status.replace("_", " ")}
              </span>
              <span className="text-sm text-gray-500">
                Priority: {project.priority || "medium"}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {project.progress || 0}%
            </div>
            <div className="text-sm text-gray-500">Complete</div>
          </div>
        </div>
      </div>

      {/* Project Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Project Details
          </h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Start Date</dt>
              <dd className="text-sm text-gray-900">
                {formatDate(project.start_date)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">End Date</dt>
              <dd className="text-sm text-gray-900">
                {formatDate(project.end_date)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Project Manager
              </dt>
              <dd className="text-sm text-gray-900">
                {project.manager_name || "Not assigned"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Team Size</dt>
              <dd className="text-sm text-gray-900">
                {project.team_size || 0} members
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Budget Information
          </h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Total Budget
              </dt>
              <dd className="text-sm text-gray-900">
                {formatCurrency(project.total_budget || 0)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Used Budget</dt>
              <dd className="text-sm text-gray-900">
                {formatCurrency(project.used_budget || 0)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Remaining Budget
              </dt>
              <dd className="text-sm text-gray-900">
                {formatCurrency(
                  (project.total_budget || 0) - (project.used_budget || 0)
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Billing Status
              </dt>
              <dd className="text-sm text-gray-900">
                {project.is_billable ? "Billable" : "Non-billable"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Description
          </h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {project.description}
            </p>
          </div>
        </div>
      )}

      {/* Progress Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Project Progress
          </h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progress
              </span>
              <span className="text-sm font-medium text-gray-900">
                {project.progress || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full"
                style={{ width: `${project.progress || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Budget Utilization
          </h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Budget Used
              </span>
              <span className="text-sm font-medium text-gray-900">
                {budgetUsed}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  budgetUsed >= 90
                    ? "bg-red-500"
                    : budgetUsed >= 75
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones Placeholder */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Project Milestones
        </h4>
        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
          <p>No milestones defined</p>
          <p className="text-xs mt-1">
            Project milestones and deliverables would be displayed here
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
        <button onClick={onEdit} className="btn-primary">
          Edit Project
        </button>
      </div>
    </div>
  );
};

export default Projects;
