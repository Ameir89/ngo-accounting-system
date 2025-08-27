// frontend/src/pages/BudgetManagement.jsx
import {
  BarChart3,
  CheckCircle,
  Edit,
  Eye,
  FileText,
  Plus,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import BudgetChart from "../components/Charts/BudgetChart";
import ErrorMessage from "../components/UI/ErrorMessage";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import Modal from "../components/UI/Modal";
import { useLanguage } from "../contexts/LanguageContext";
import {
  useApproveBudget,
  useBudgets,
  useCreateBudget,
  useUpdateBudget,
} from "../hooks/useApi/";

const BudgetManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { t, formatCurrency, formatDate } = useLanguage();

  const {
    data: budgetsData,
    isLoading,
    error,
    refetch,
  } = useBudgets({
    search: searchTerm,
    status: statusFilter,
    period: periodFilter,
    page: currentPage,
    per_page: 20,
  });

  const createBudgetMutation = useCreateBudget();
  const updateBudgetMutation = useUpdateBudget();
  const approveBudgetMutation = useApproveBudget();

  const budgets = budgetsData?.budgets || [];
  const pagination = budgetsData?.pagination || {};

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "approved", label: "Approved" },
    { value: "active", label: "Active" },
    { value: "closed", label: "Closed" },
  ];

  const periodOptions = [
    { value: "", label: "All Periods" },
    { value: "2024", label: "2024" },
    { value: "2025", label: "2025" },
    { value: "q1-2024", label: "Q1 2024" },
    { value: "q2-2024", label: "Q2 2024" },
    { value: "q3-2024", label: "Q3 2024" },
    { value: "q4-2024", label: "Q4 2024" },
  ];

  const handleSubmit = async (budgetData) => {
    try {
      if (editingBudget) {
        await updateBudgetMutation.mutateAsync({
          id: editingBudget.id,
          data: budgetData,
        });
        toast.success("Budget updated successfully");
      } else {
        await createBudgetMutation.mutateAsync(budgetData);
        toast.success("Budget created successfully");
      }
      setShowForm(false);
      setEditingBudget(null);
      refetch();
    } catch (error) {
      toast.error(error.message || "Operation failed");
    }
  };

  const handleApproveBudget = async (budgetId) => {
    if (!window.confirm("Are you sure you want to approve this budget?"))
      return;

    try {
      await approveBudgetMutation.mutateAsync(budgetId);
      toast.success("Budget approved successfully");
      refetch();
    } catch (error) {
      toast.error(error.message || "Failed to approve budget");
    }
  };

  if (isLoading) return <LoadingSpinner message="Loading budgets..." />;
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            Budget Management
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create, manage and monitor budgets across projects and departments
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button className="btn-secondary">
            <FileText className="h-4 w-4 mr-2" />
            Import Budget
          </button>
          <button
            onClick={() => {
              setEditingBudget(null);
              setShowForm(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Budget
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "overview", name: "Overview", icon: BarChart3 },
            { id: "budgets", name: "All Budgets", icon: Target },
            { id: "analysis", name: "Budget Analysis", icon: TrendingUp },
            { id: "approval", name: "Approvals", icon: CheckCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <BudgetOverview />}
      {activeTab === "budgets" && (
        <BudgetsList
          budgets={budgets}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          periodFilter={periodFilter}
          setPeriodFilter={setPeriodFilter}
          statusOptions={statusOptions}
          periodOptions={periodOptions}
          onView={(budget) => {
            setSelectedBudget(budget);
            setShowDetails(true);
          }}
          onEdit={(budget) => {
            setEditingBudget(budget);
            setShowForm(true);
          }}
          onApprove={handleApproveBudget}
        />
      )}
      {activeTab === "analysis" && <BudgetAnalysis budgets={budgets} />}
      {activeTab === "approval" && (
        <BudgetApproval budgets={budgets} onApprove={handleApproveBudget} />
      )}

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingBudget(null);
        }}
        title={editingBudget ? "Edit Budget" : "Create New Budget"}
        size="xl"
      >
        <BudgetForm
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingBudget(null);
          }}
          loading={
            createBudgetMutation.isLoading || updateBudgetMutation.isLoading
          }
          editData={editingBudget}
        />
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={`Budget Details - ${selectedBudget?.name || ""}`}
        size="xl"
      >
        {selectedBudget && (
          <BudgetDetails
            budget={selectedBudget}
            onClose={() => setShowDetails(false)}
            onEdit={() => {
              setShowDetails(false);
              setEditingBudget(selectedBudget);
              setShowForm(true);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

// Budget Overview Component
const BudgetOverview = () => {
  const { formatCurrency } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Budgets"
          value="18"
          icon={Target}
          color="bg-blue-500"
          trend={{ direction: "up", percentage: 12 }}
        />
        <SummaryCard
          title="Active Budgets"
          value="12"
          icon={CheckCircle}
          color="bg-green-500"
          trend={{ direction: "up", percentage: 8 }}
        />
        <SummaryCard
          title="Total Budget Amount"
          value={formatCurrency(2850000)}
          icon={BarChart3}
          color="bg-purple-500"
          trend={{ direction: "up", percentage: 15 }}
        />
        <SummaryCard
          title="Budget Utilization"
          value="68%"
          icon={TrendingUp}
          color="bg-orange-500"
          trend={{ direction: "down", percentage: 3 }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetChart title="Budget vs Actual - Current Quarter" height={350} />
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Budget Status Distribution
            </h3>
          </div>
          <div className="card-body">
            <BudgetStatusChart />
          </div>
        </div>
      </div>
    </div>
  );
};

// Budget Status Chart Component
const BudgetStatusChart = () => {
  const statusData = [
    { name: "Active", value: 12, color: "bg-green-500" },
    { name: "Draft", value: 4, color: "bg-yellow-500" },
    { name: "Pending Approval", value: 2, color: "bg-orange-500" },
    { name: "Closed", value: 3, color: "bg-gray-500" },
  ];

  const total = statusData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-4">
      {statusData.map((item, index) => {
        const percentage = Math.round((item.value / total) * 100);
        return (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {item.name}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{item.value}</span>
              <span className="text-sm text-gray-500">({percentage}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Budgets List Component
const BudgetsList = ({
  budgets,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  periodFilter,
  setPeriodFilter,
  statusOptions,
  periodOptions,
  onView,
  onEdit,
  onApprove,
}) => {
  return (
    <div className="space-y-6">
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
                  placeholder="Search budgets..."
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
                Period
              </label>
              <select
                className="form-select mt-1"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                  setPeriodFilter("");
                }}
                className="btn-secondary"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Budgets Table */}
      <BudgetsTable
        budgets={budgets}
        onView={onView}
        onEdit={onEdit}
        onApprove={onApprove}
      />
    </div>
  );
};

// Budgets Table Component
const BudgetsTable = ({ budgets, onView, onEdit, onApprove }) => {
  const { formatCurrency, formatDate } = useLanguage();

  const getStatusColor = (status) => {
    const colors = {
      draft: "badge-warning",
      submitted: "badge-info",
      approved: "badge-success",
      active: "badge-success",
      closed: "badge-gray",
    };
    return colors[status] || "badge-info";
  };

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="table">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="table-header">Budget Name</th>
              <th className="table-header">Period</th>
              <th className="table-header">Total Amount</th>
              <th className="table-header">Utilized</th>
              <th className="table-header">Variance</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {budgets.length > 0 ? (
              budgets.map((budget) => {
                const utilized = budget.utilized_amount || 0;
                const variance = (budget.total_amount || 0) - utilized;
                const utilizationPercent =
                  budget.total_amount > 0
                    ? Math.round((utilized / budget.total_amount) * 100)
                    : 0;

                return (
                  <tr
                    key={budget.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="table-cell">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {budget.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {budget.description || "No description"}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {budget.budget_period}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(budget.start_date)} -{" "}
                        {formatDate(budget.end_date)}
                      </div>
                    </td>
                    <td className="table-cell font-medium text-gray-900 dark:text-white">
                      {formatCurrency(budget.total_amount || 0)}
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatCurrency(utilized)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {utilizationPercent}% utilized
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-1.5 rounded-full ${
                            utilizationPercent >= 90
                              ? "bg-red-500"
                              : utilizationPercent >= 75
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{
                            width: `${Math.min(utilizationPercent, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div
                        className={`text-sm font-medium ${
                          variance >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {variance >= 0 ? "+" : ""}
                        {formatCurrency(variance)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span
                        className={`badge ${getStatusColor(budget.status)}`}
                      >
                        {budget.status || "draft"}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onView(budget)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEdit(budget)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                          title="Edit Budget"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {budget.status === "submitted" && (
                          <button
                            onClick={() => onApprove(budget.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400"
                            title="Approve Budget"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="table-cell text-center text-gray-500 dark:text-gray-400 py-8"
                >
                  No budgets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Budget Analysis Component
const BudgetAnalysis = ({ budgets }) => {
  const { formatCurrency } = useLanguage();

  // Calculate analysis metrics
  const totalBudget = budgets.reduce(
    (sum, budget) => sum + (budget.total_amount || 0),
    0
  );
  const totalUtilized = budgets.reduce(
    (sum, budget) => sum + (budget.utilized_amount || 0),
    0
  );
  const overBudgetCount = budgets.filter(
    (budget) => (budget.utilized_amount || 0) > (budget.total_amount || 0)
  ).length;

  return (
    <div className="space-y-6">
      {/* Analysis Summary */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalBudget)}
            </div>
            <div className="text-sm text-gray-500">Total Budget Allocated</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalUtilized)}
            </div>
            <div className="text-sm text-gray-500">Total Utilized</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-red-600">
              {overBudgetCount}
            </div>
            <div className="text-sm text-gray-500">Over Budget</div>
          </div>
        </div>
      </div>

      {/* Budget Performance Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Budget Performance Analysis
          </h3>
        </div>
        <div className="card-body">
          <BudgetChart title="Budget vs Actual Analysis" height={400} />
        </div>
      </div>
    </div>
  );
};

// Budget Approval Component
const BudgetApproval = ({ budgets, onApprove }) => {
  const pendingBudgets = budgets.filter(
    (budget) => budget.status === "submitted"
  );

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Pending Approvals ({pendingBudgets.length})
          </h3>
        </div>
        <div className="card-body">
          {pendingBudgets.length > 0 ? (
            <div className="space-y-4">
              {pendingBudgets.map((budget) => (
                <BudgetApprovalCard
                  key={budget.id}
                  budget={budget}
                  onApprove={onApprove}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No budgets pending approval</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Budget Approval Card Component
const BudgetApprovalCard = ({ budget, onApprove }) => {
  const { formatCurrency, formatDate } = useLanguage();

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
            {budget.name}
          </h4>
          <p className="text-sm text-gray-500 mt-1">
            {budget.description || "No description provided"}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Period:</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {budget.budget_period}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Amount:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {formatCurrency(budget.total_amount || 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Submitted:</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {formatDate(budget.submitted_at)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">By:</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {budget.submitted_by || "Unknown"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <button className="btn-secondary text-sm">
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </button>
          <button
            onClick={() => onApprove(budget.id)}
            className="btn-success text-sm"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({ title, value, icon: Icon, color, trend }) => (
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
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {value}
              </div>
              {trend && (
                <div
                  className={`ml-2 flex items-baseline text-sm font-semibold ${
                    trend.direction === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {trend.direction === "up" ? (
                    <TrendingUp className="self-center flex-shrink-0 h-3 w-3" />
                  ) : (
                    <TrendingDown className="self-center flex-shrink-0 h-3 w-3" />
                  )}
                  <span className="sr-only">
                    {trend.direction === "up" ? "Increased" : "Decreased"} by
                  </span>
                  {trend.percentage}%
                </div>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

// Budget Form Component
const BudgetForm = ({ onSubmit, onCancel, loading, editData }) => {
  const [formData, setFormData] = useState({
    name: editData?.name || "",
    description: editData?.description || "",
    budget_period: editData?.budget_period || "annual",
    start_date: editData?.start_date || "",
    end_date: editData?.end_date || "",
    total_amount: editData?.total_amount || "",
    cost_center_id: editData?.cost_center_id || "",
    project_id: editData?.project_id || "",
    budget_type: editData?.budget_type || "operational",
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) newErrors.name = "Budget name is required";
    if (!formData.start_date) newErrors.start_date = "Start date is required";
    if (!formData.end_date) newErrors.end_date = "End date is required";
    if (!formData.total_amount)
      newErrors.total_amount = "Budget amount is required";
    if (
      formData.start_date &&
      formData.end_date &&
      new Date(formData.start_date) >= new Date(formData.end_date)
    ) {
      newErrors.end_date = "End date must be after start date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        total_amount: parseFloat(formData.total_amount),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Budget Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Budget Name *
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
              placeholder="e.g., Annual Operations Budget 2024"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Budget Type
            </label>
            <select
              value={formData.budget_type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  budget_type: e.target.value,
                }))
              }
              className="form-select mt-1"
            >
              <option value="operational">Operational</option>
              <option value="capital">Capital</option>
              <option value="project">Project</option>
              <option value="program">Program</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Budget Period
            </label>
            <select
              value={formData.budget_period}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  budget_period: e.target.value,
                }))
              }
              className="form-select mt-1"
            >
              <option value="annual">Annual</option>
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
              <option value="project">Project-based</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Budget Amount *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.total_amount}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  total_amount: e.target.value,
                }))
              }
              className={`form-input mt-1 ${
                errors.total_amount ? "border-red-500" : ""
              }`}
              placeholder="0.00"
            />
            {errors.total_amount && (
              <p className="mt-1 text-sm text-red-600">{errors.total_amount}</p>
            )}
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
            placeholder="Describe the budget purpose and scope..."
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
          {loading ? "Saving..." : editData ? "Update Budget" : "Create Budget"}
        </button>
      </div>
    </form>
  );
};

// Budget Details Component
const BudgetDetails = ({ budget, onClose, onEdit }) => {
  const { formatCurrency, formatDate } = useLanguage();

  const getStatusColor = (status) => {
    const colors = {
      draft: "badge-warning",
      submitted: "badge-info",
      approved: "badge-success",
      active: "badge-success",
      closed: "badge-gray",
    };
    return colors[status] || "badge-info";
  };

  const utilized = budget.utilized_amount || 0;
  const remaining = (budget.total_amount || 0) - utilized;
  const utilizationPercent =
    budget.total_amount > 0
      ? Math.round((utilized / budget.total_amount) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {budget.name}
            </h3>
            <p className="text-gray-600 mt-1">
              {budget.description || "No description"}
            </p>
            <div className="flex items-center space-x-3 mt-3">
              <span className={`badge ${getStatusColor(budget.status)}`}>
                {budget.status || "draft"}
              </span>
              <span className="text-sm text-gray-500">
                Period: {budget.budget_period}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {utilizationPercent}%
            </div>
            <div className="text-sm text-gray-500">Utilized</div>
          </div>
        </div>
      </div>

      {/* Budget Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Budget Details
          </h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Period</dt>
              <dd className="text-sm text-gray-900">{budget.budget_period}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Start Date</dt>
              <dd className="text-sm text-gray-900">
                {formatDate(budget.start_date)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">End Date</dt>
              <dd className="text-sm text-gray-900">
                {formatDate(budget.end_date)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="text-sm text-gray-900 capitalize">
                {budget.budget_type || "operational"}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Financial Summary
          </h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Total Budget
              </dt>
              <dd className="text-sm text-gray-900">
                {formatCurrency(budget.total_amount || 0)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Amount Utilized
              </dt>
              <dd className="text-sm text-gray-900">
                {formatCurrency(utilized)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Remaining Budget
              </dt>
              <dd className="text-sm text-gray-900">
                {formatCurrency(remaining)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Utilization Rate
              </dt>
              <dd className="text-sm text-gray-900">{utilizationPercent}%</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Budget Utilization Progress */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Budget Utilization
        </h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-gray-900">
              {utilizationPercent}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${
                utilizationPercent >= 90
                  ? "bg-red-500"
                  : utilizationPercent >= 75
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatCurrency(0)}</span>
            <span>{formatCurrency(budget.total_amount || 0)}</span>
          </div>
        </div>
      </div>

      {/* Budget Breakdown Placeholder */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Budget Breakdown
        </h4>
        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
          <p>No budget line items defined</p>
          <p className="text-xs mt-1">
            Budget categories and line items would be displayed here
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
        <button onClick={onEdit} className="btn-primary">
          Edit Budget
        </button>
      </div>
    </div>
  );
};

export default BudgetManagement;
