// frontend/src/pages/JournalEntries.jsx
import {
  Calendar,
  CheckCircle,
  Edit,
  Eye,
  Filter,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import JournalEntryForm from "../components/Forms/JournalEntryForm";
import Modal from "../components/UI/Modal";
import { useLanguage } from "../contexts/LanguageContext";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import {
  useCreateJournalEntry,
  useJournalEntries,
  usePostJournalEntry,
} from "../hooks/useApi/";

const JournalEntries = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const { t, formatCurrency, formatDate } = useLanguage();

  const {
    data: entriesData,
    isLoading,
    error,
    refetch,
  } = useJournalEntries({
    search: searchTerm,
    date: dateFilter,
    status: statusFilter,
    page: currentPage,
    per_page: 20,
  });

  const createEntryMutation = useCreateJournalEntry();
  const postEntryMutation = usePostJournalEntry();

  const entries = entriesData?.entries || [];
  const pagination = entriesData?.pagination || {};

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "draft", label: t("draft") },
    { value: "posted", label: t("posted") },
  ];

  const getStatusColor = (isPosted) => {
    return isPosted ? "badge-success" : "badge-warning";
  };

  const getStatusIcon = (isPosted) => {
    return isPosted ? CheckCircle : XCircle;
  };

  const handleCreateEntry = async (entryData) => {
    try {
      await createEntryMutation.mutateAsync(entryData);
      setShowForm(false);
      toast.success("Journal entry created successfully");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create journal entry"
      );
    }
  };

  const handlePostEntry = async (entryId) => {
    if (
      !window.confirm(
        "Are you sure you want to post this journal entry? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await postEntryMutation.mutateAsync(entryId);
      toast.success("Journal entry posted successfully");
      refetch();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to post journal entry"
      );
    }
  };

  const handleViewDetails = (entry) => {
    setSelectedEntry(entry);
    setShowDetails(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading journal entries..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            Error loading journal entries: {error.message}
          </p>
          <button onClick={() => refetch()} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            {t("journalEntries")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your organization's journal entries and transactions
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            {t("New Journal Entry")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("search")}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="form-input pl-10"
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("date")}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  className="form-input pl-10"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("status")}
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

            <div className="flex items-end">
              <button onClick={clearFilters} className="btn-secondary">
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Journal Entries Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="table-header">Entry #</th>
                <th className="table-header">{t("date")}</th>
                <th className="table-header">{t("description")}</th>
                <th className="table-header">Reference</th>
                <th className="table-header">Total Amount</th>
                <th className="table-header">{t("status")}</th>
                <th className="table-header">Created By</th>
                <th className="table-header">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {entries.length > 0 ? (
                entries.map((entry) => {
                  const StatusIcon = getStatusIcon(entry.is_posted);
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="table-cell font-medium text-gray-900 dark:text-white">
                        {entry.entry_number}
                      </td>
                      <td className="table-cell text-gray-500 dark:text-gray-400">
                        {formatDate(entry.entry_date)}
                      </td>
                      <td className="table-cell">
                        <div className="max-w-xs truncate">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {entry.description}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell text-gray-500 dark:text-gray-400">
                        {entry.reference_number || "-"}
                      </td>
                      <td className="table-cell font-medium text-gray-900 dark:text-white">
                        {formatCurrency(entry.total_debit)}
                      </td>
                      <td className="table-cell">
                        <span
                          className={`badge ${getStatusColor(
                            entry.is_posted
                          )} flex items-center`}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {entry.is_posted ? t("posted") : t("draft")}
                        </span>
                      </td>
                      <td className="table-cell text-gray-500 dark:text-gray-400">
                        {entry.created_by_name || "System"}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(entry)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {!entry.is_posted && (
                            <>
                              <button
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                                title="Edit Entry"
                              >
                                <Edit className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => handlePostEntry(entry.id)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400"
                                title="Post Entry"
                                disabled={postEntryMutation.isLoading}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>

                              <button
                                className="text-red-600 hover:text-red-900 dark:text-red-400"
                                title="Delete Entry"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    className="table-cell text-center text-gray-500 dark:text-gray-400 py-8"
                  >
                    {t("No journal entries found")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn-secondary"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(pagination.pages, currentPage + 1))
                }
                disabled={currentPage === pagination.pages}
                className="btn-secondary"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * 20 + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * 20, pagination.total)}
                  </span>{" "}
                  of <span className="font-medium">{pagination.total}</span>{" "}
                  results
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {[...Array(Math.min(5, pagination.pages))].map((_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm rounded-md ${
                        currentPage === page
                          ? "bg-indigo-600 text-white"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Journal Entry Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Create New Journal Entry"
        size="xl"
      >
        <JournalEntryForm
          onSubmit={handleCreateEntry}
          onCancel={() => setShowForm(false)}
          loading={createEntryMutation.isLoading}
        />
      </Modal>

      {/* Entry Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={`Journal Entry ${selectedEntry?.entry_number || ""}`}
        size="lg"
      >
        {selectedEntry && (
          <EntryDetailsView
            entry={selectedEntry}
            onClose={() => setShowDetails(false)}
          />
        )}
      </Modal>
    </div>
  );
};

// Entry Details Component
const EntryDetailsView = ({ entry, onClose }) => {
  const { formatCurrency, formatDate } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Entry Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Entry Number</h3>
            <p className="text-lg font-semibold text-gray-900">
              {entry.entry_number}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <span
              className={`badge ${
                entry.is_posted ? "badge-success" : "badge-warning"
              }`}
            >
              {entry.is_posted ? "Posted" : "Draft"}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Entry Date</h3>
            <p className="text-sm text-gray-900">
              {formatDate(entry.entry_date)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Reference</h3>
            <p className="text-sm text-gray-900">
              {entry.reference_number || "-"}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500">Description</h3>
          <p className="text-sm text-gray-900">{entry.description}</p>
        </div>
      </div>

      {/* Entry Lines */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Journal Entry Lines
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Account
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Debit
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Credit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entry.lines?.map((line, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-900">
                        {line.account_code} - {line.account_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {line.description || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {line.debit_amount > 0
                      ? formatCurrency(line.debit_amount)
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {line.credit_amount > 0
                      ? formatCurrency(line.credit_amount)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td
                  colSpan="2"
                  className="px-4 py-3 text-sm font-medium text-right"
                >
                  Totals:
                </td>
                <td className="px-4 py-3 text-sm font-bold text-right">
                  {formatCurrency(entry.total_debit)}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-right">
                  {formatCurrency(entry.total_credit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
        {!entry.is_posted && (
          <button className="btn-primary">Edit Entry</button>
        )}
      </div>
    </div>
  );
};

export default JournalEntries;
