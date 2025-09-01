// frontend/src/pages/AuditTrail.jsx - Fixed Version
import {
  Calendar,
  Download,
  Eye,
  Filter,
  Shield,
  User
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import DataTable from "../components/Tables/DataTable";
import ErrorMessage from "../components/UI/ErrorMessage";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import Modal from "../components/UI/Modal";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../hooks/useAuth";
import { exportUtils } from "../services/utils";

// Mock data for audit trail (replace with actual API calls)
const mockAuditData = [
  {
    id: "1",
    timestamp: "2024-01-15T10:30:00Z",
    user_id: "user1",
    user_name: "John Doe",
    action: "CREATE",
    resource_type: "journal_entry",
    resource_id: "je_001",
    description: "Created journal entry JE-2024-001",
    ip_address: "192.168.1.100",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    changes: {
      before: null,
      after: {
        description: "Office supplies purchase",
        total_amount: 500.0,
      },
    },
    session_id: "sess_abc123",
  },
  {
    id: "2",
    timestamp: "2024-01-15T09:15:00Z",
    user_id: "user2",
    user_name: "Jane Smith",
    action: "UPDATE",
    resource_type: "account",
    resource_id: "acc_100",
    description: "Updated account Cash on Hand",
    ip_address: "192.168.1.101",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    changes: {
      before: { name: "Cash Account" },
      after: { name: "Cash on Hand" },
    },
    session_id: "sess_def456",
  },
  {
    id: "3",
    timestamp: "2024-01-15T08:45:00Z",
    user_id: "user1",
    user_name: "John Doe",
    action: "DELETE",
    resource_type: "supplier",
    resource_id: "sup_200",
    description: "Deleted supplier ABC Corp",
    ip_address: "192.168.1.100",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    changes: {
      before: { name: "ABC Corp", status: "active" },
      after: null,
    },
    session_id: "sess_abc123",
  },
  {
    id: "4",
    timestamp: "2024-01-14T16:20:00Z",
    user_id: "user3",
    user_name: "Admin User",
    action: "LOGIN",
    resource_type: "auth",
    resource_id: null,
    description: "User logged in successfully",
    ip_address: "192.168.1.102",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    changes: null,
    session_id: "sess_ghi789",
  },
  {
    id: "5",
    timestamp: "2024-01-14T15:30:00Z",
    user_id: "user2",
    user_name: "Jane Smith",
    action: "POST",
    resource_type: "journal_entry",
    resource_id: "je_002",
    description: "Posted journal entry JE-2024-002",
    ip_address: "192.168.1.101",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    changes: {
      before: { status: "draft" },
      after: { status: "posted" },
    },
    session_id: "sess_def456",
  },
];

const AuditTrail = () => {
  const { t, formatDate } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditData, setAuditData] = useState(mockAuditData);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    user_id: "",
    action: "",
    resource_type: "",
    date_from: "",
    date_to: "",
  });

  // Format date time helper
  const formatDateTime = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      return 'Invalid date';
    }
  }, []);

  // Action types for filtering
  const actionTypes = [
    { value: "", label: "All Actions" },
    { value: "CREATE", label: "Create" },
    { value: "UPDATE", label: "Update" },
    { value: "DELETE", label: "Delete" },
    { value: "POST", label: "Post" },
    { value: "LOGIN", label: "Login" },
    { value: "LOGOUT", label: "Logout" },
    { value: "EXPORT", label: "Export" },
  ];

  const resourceTypes = [
    { value: "", label: "All Resources" },
    { value: "journal_entry", label: "Journal Entry" },
    { value: "account", label: "Account" },
    { value: "supplier", label: "Supplier" },
    { value: "grant", label: "Grant" },
    { value: "project", label: "Project" },
    { value: "auth", label: "Authentication" },
    { value: "user", label: "User" },
  ];

  // Get action color based on action type
  const getActionColor = (action) => {
    switch (action) {
      case "CREATE":
        return "badge-success";
      case "UPDATE":
        return "badge-info";
      case "DELETE":
        return "badge-danger";
      case "POST":
        return "badge-warning";
      case "LOGIN":
      case "LOGOUT":
        return "badge-secondary";
      default:
        return "badge-info";
    }
  };

  // Get risk level based on action
  const getRiskLevel = (action, resourceType) => {
    if (action === "DELETE") return "High";
    if (action === "POST" || action === "UPDATE") return "Medium";
    return "Low";
  };

  // Filtered data based on current filters
  const filteredData = useMemo(() => {
    return auditData.filter((entry) => {
      if (filters.user_id && entry.user_id !== filters.user_id) return false;
      if (filters.action && entry.action !== filters.action) return false;
      if (
        filters.resource_type &&
        entry.resource_type !== filters.resource_type
      )
        return false;

      if (filters.date_from) {
        const entryDate = new Date(entry.timestamp);
        const fromDate = new Date(filters.date_from);
        if (entryDate < fromDate) return false;
      }

      if (filters.date_to) {
        const entryDate = new Date(entry.timestamp);
        const toDate = new Date(filters.date_to + "T23:59:59");
        if (entryDate > toDate) return false;
      }

      return true;
    });
  }, [auditData, filters]);

  // Handle viewing entry details
  const handleViewDetails = useCallback((entry) => {
    setSelectedEntry(entry);
    setShowDetailsModal(true);
  }, []);

  // Handle exporting audit data
  const handleExport = useCallback(
    (format) => {
      try {
        const exportData = filteredData.map((entry) => ({
          timestamp: formatDateTime(entry.timestamp),
          user: entry.user_name,
          action: entry.action,
          resource: entry.resource_type,
          description: entry.description,
          ip_address: entry.ip_address,
        }));

        if (format === 'csv') {
          exportUtils.downloadCsv(exportData, 'audit-trail');
        } else {
          exportUtils.downloadJson(filteredData, 'audit-trail');
        }
        
        toast.success(t(`Audit trail exported as ${format.toUpperCase()}`));
      } catch (error) {
        console.error('Export error:', error);
        toast.error(t('Failed to export audit trail'));
      }
    },
    [filteredData, formatDateTime, t]
  );

  // Load audit data (replace with real API call)
  const loadAuditData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, you would call:
      // const response = await apiService.audit.getAll(filters);
      // setAuditData(response.data);
      
      setAuditData(mockAuditData);
    } catch (error) {
      console.error('Load audit data error:', error);
      setError('Failed to load audit data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Table columns configuration
  const columns = [
    {
      key: "timestamp",
      title: "Date & Time",
      sortable: true,
      render: (value) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white">
            {formatDate(value)}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {new Date(value).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: "user_name",
      title: "User",
      sortable: true,
      render: (value, entry) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {value}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {entry.ip_address}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "action",
      title: "Action",
      sortable: true,
      render: (value, entry) => (
        <div className="space-y-1">
          <span className={`badge ${getActionColor(value)}`}>{value}</span>
          <div
            className={`text-xs px-2 py-1 rounded-full inline-block ${
              getRiskLevel(value, entry.resource_type) === "High"
                ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                : getRiskLevel(value, entry.resource_type) === "Medium"
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
            }`}
          >
            {getRiskLevel(value, entry.resource_type)} Risk
          </div>
        </div>
      ),
    },
    {
      key: "resource_type",
      title: "Resource",
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
          {value?.replace("_", " ") || "N/A"}
        </span>
      ),
    },
    {
      key: "description",
      title: "Description",
      render: (value) => (
        <div
          className="text-sm text-gray-900 dark:text-white max-w-xs truncate"
          title={value}
        >
          {value}
        </div>
      ),
    },
  ];

  // Table actions
  const actions = [
    {
      key: "view",
      title: "View Details",
      icon: <Eye className="h-4 w-4" />,
      className: "text-indigo-600 hover:text-indigo-900 dark:text-indigo-400",
    },
  ];

  // Handle table actions
  const handleRowAction = useCallback(
    (action, entry) => {
      if (action === "view") {
        handleViewDetails(entry);
      }
    },
    [handleViewDetails]
  );

  // Handle filter changes
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      user_id: "",
      action: "",
      resource_type: "",
      date_from: "",
      date_to: "",
    });
  }, []);

  if (error) {
    return <ErrorMessage message={error} onRetry={loadAuditData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
            <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Audit Trail
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Monitor system activities and user actions
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Entries:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {filteredData.length}
            </span>
          </div>
          <div className="relative group">
            <button className="btn-secondary">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="py-1">
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Export as JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Events
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {filteredData.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <User className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Users
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {new Set(filteredData.map(entry => entry.user_id)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Filter className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                High Risk Actions
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {filteredData.filter(entry => getRiskLevel(entry.action, entry.resource_type) === 'High').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Calendar className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Today's Events
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {filteredData.filter(entry => {
                  const entryDate = new Date(entry.timestamp);
                  const today = new Date();
                  return entryDate.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User
            </label>
            <select
              value={filters.user_id}
              onChange={(e) => handleFilterChange('user_id', e.target.value)}
              className="form-select"
            >
              <option value="">All Users</option>
              {[...new Set(auditData.map((entry) => entry.user_id))].map(
                (userId) => {
                  const user = auditData.find(
                    (entry) => entry.user_id === userId
                  );
                  return (
                    <option key={userId} value={userId}>
                      {user?.user_name}
                    </option>
                  );
                }
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="form-select"
            >
              {actionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resource Type
            </label>
            <select
              value={filters.resource_type}
              onChange={(e) => handleFilterChange('resource_type', e.target.value)}
              className="form-select"
            >
              {resourceTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={clearFilters}
            className="btn-secondary"
          >
            Clear Filters
          </button>
          
          <button
            onClick={loadAuditData}
            disabled={loading}
            className="btn-primary flex items-center"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Audit Trail Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" message="Loading audit trail..." />
        </div>
      ) : (
        <DataTable
          data={filteredData}
          columns={columns}
          actions={actions}
          onRowAction={handleRowAction}
          loading={loading}
          emptyMessage="No audit entries found"
          searchable={true}
          exportable={false}
        />
      )}

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedEntry(null);
        }}
        title="Audit Entry Details"
        size="lg"
      >
        {selectedEntry && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Timestamp
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDateTime(selectedEntry.timestamp)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    User
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedEntry.user_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Action
                  </label>
                  <span
                    className={`badge ${getActionColor(selectedEntry.action)}`}
                  >
                    {selectedEntry.action}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Resource Type
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white capitalize">
                    {selectedEntry.resource_type?.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    IP Address
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedEntry.ip_address}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Session ID
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white font-mono">
                    {selectedEntry.session_id}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Description
              </label>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                {selectedEntry.description}
              </p>
            </div>

            {/* Changes */}
            {selectedEntry.changes && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Changes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedEntry.changes.before && (
                    <div>
                      <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                        Before
                      </label>
                      <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded-lg overflow-auto">
                        {JSON.stringify(selectedEntry.changes.before, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedEntry.changes.after && (
                    <div>
                      <label className="block text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                        After
                      </label>
                      <pre className="text-xs bg-green-50 dark:bg-green-900/20 p-3 rounded-lg overflow-auto">
                        {JSON.stringify(selectedEntry.changes.after, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* User Agent */}
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                User Agent
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg break-all">
                {selectedEntry.user_agent}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditTrail;