// frontend/src/pages/FixedAssets.jsx
import {
  Calendar,
  Edit,
  Eye,
  Filter,
  Laptop,
  Monitor,
  Plus,
  Search,
  Trash2,
  Truck,
} from "lucide-react";
import { useState } from "react";
import Modal from "../components/UI/Modal";
import { useLanguage } from "../contexts/LanguageContext";
import { useFixedAssets } from "../hooks/useApi/";

const FixedAssets = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { t, formatCurrency, formatDate } = useLanguage();

  const {
    data: assetsData,
    isLoading,
    error,
  } = useFixedAssets({
    search: searchTerm,
    category: categoryFilter,
    status: statusFilter,
    page: currentPage,
    per_page: 20,
  });

  const assets = assetsData?.assets || [];
  const pagination = assetsData?.pagination || {};

  const categoryOptions = [
    { value: "", label: "All Categories" },
    { value: "equipment", label: "Equipment" },
    { value: "vehicles", label: "Vehicles" },
    { value: "furniture", label: "Furniture" },
    { value: "computers", label: "Computers & IT" },
    { value: "buildings", label: "Buildings" },
    { value: "other", label: "Other" },
  ];

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "active", label: "Active" },
    { value: "disposed", label: "Disposed" },
    { value: "under_maintenance", label: "Under Maintenance" },
    { value: "deprecated", label: "Fully Depreciated" },
  ];

  const getStatusColor = (status) => {
    const colors = {
      active: "badge-success",
      disposed: "badge-danger",
      under_maintenance: "badge-warning",
      deprecated: "badge-info",
    };
    return colors[status] || "badge-info";
  };

  const getCategoryIcon = (category) => {
    const icons = {
      equipment: Monitor,
      vehicles: Truck,
      computers: Laptop,
      default: Monitor,
    };
    return icons[category] || icons.default;
  };

  const calculateDepreciation = (asset) => {
    if (!asset.purchase_price || !asset.useful_life_years) return 0;
    const yearlyDepreciation = asset.purchase_price / asset.useful_life_years;
    const yearsSincePurchase =
      new Date().getFullYear() - new Date(asset.purchase_date).getFullYear();
    return Math.min(
      yearlyDepreciation * yearsSincePurchase,
      asset.purchase_price
    );
  };

  const handleViewDetails = (asset) => {
    setSelectedAsset(asset);
    setShowDetails(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            Error loading fixed assets: {error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
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
            {t("fixedAssets")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your organization's fixed assets and depreciation
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button className="btn-secondary">
            <Calendar className="h-4 w-4 mr-2" />
            Calculate Depreciation
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-blue-500 rounded-md p-3">
                  <Monitor className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Assets
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                    156
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-green-500 rounded-md p-3">
                  <Monitor className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Book Value
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(1850000)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-purple-500 rounded-md p-3">
                  <Monitor className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Annual Depreciation
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(245000)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-orange-500 rounded-md p-3">
                  <Monitor className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Under Maintenance
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                    12
                  </dd>
                </dl>
              </div>
            </div>
          </div>
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
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <select
                className="form-select mt-1"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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

      {/* Assets Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="table-header">Asset Details</th>
                <th className="table-header">Category</th>
                <th className="table-header">Purchase Info</th>
                <th className="table-header">Book Value</th>
                <th className="table-header">Depreciation</th>
                <th className="table-header">{t("status")}</th>
                <th className="table-header">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {assets.length > 0 ? (
                assets.map((asset) => {
                  const Icon = getCategoryIcon(asset.category);
                  const depreciatedAmount = calculateDepreciation(asset);
                  const bookValue =
                    (asset.purchase_price || 0) - depreciatedAmount;

                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {asset.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {asset.asset_tag || "No tag"}
                            </div>
                            {asset.serial_number && (
                              <div className="text-xs text-gray-400">
                                S/N: {asset.serial_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-info capitalize">
                          {asset.category || "other"}
                        </span>
                        {asset.location && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {asset.location}
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatCurrency(asset.purchase_price || 0)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(asset.purchase_date)}
                        </div>
                        {asset.supplier && (
                          <div className="text-xs text-gray-400">
                            {asset.supplier}
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(bookValue)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Original: {formatCurrency(asset.purchase_price || 0)}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatCurrency(depreciatedAmount)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {asset.useful_life_years}yr life
                        </div>
                        <div className="text-xs text-gray-400">
                          {Math.round(
                            (depreciatedAmount / (asset.purchase_price || 1)) *
                              100
                          )}
                          % depreciated
                        </div>
                      </td>
                      <td className="table-cell">
                        <span
                          className={`badge ${getStatusColor(asset.status)}`}
                        >
                          {asset.status || "active"}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(asset)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                            title="Edit Asset"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900 dark:text-red-400"
                            title="Delete Asset"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
                    {t("No fixed assets found")}
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

      {/* Asset Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={`Asset Details - ${selectedAsset?.name || ""}`}
        size="xl"
      >
        {selectedAsset && (
          <AssetDetailsView
            asset={selectedAsset}
            onClose={() => setShowDetails(false)}
          />
        )}
      </Modal>

      {/* Asset Form Modal - Placeholder */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Add New Fixed Asset"
        size="lg"
      >
        <div className="text-center py-8 text-gray-500">
          <Monitor className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Fixed asset form would be implemented here</p>
          <button
            onClick={() => setShowForm(false)}
            className="btn-secondary mt-4"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

// Asset Details Component
const AssetDetailsView = ({ asset, onClose }) => {
  const { formatCurrency, formatDate } = useLanguage();
  const Icon =
    asset.category === "vehicles"
      ? Truck
      : asset.category === "computers"
      ? Laptop
      : Monitor;

  const depreciatedAmount =
    asset.purchase_price && asset.useful_life_years
      ? Math.min(
          (asset.purchase_price / asset.useful_life_years) *
            (new Date().getFullYear() -
              new Date(asset.purchase_date).getFullYear()),
          asset.purchase_price
        )
      : 0;
  const bookValue = (asset.purchase_price || 0) - depreciatedAmount;

  return (
    <div className="space-y-6">
      {/* Asset Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-indigo-500 flex items-center justify-center">
              <Icon className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {asset.name}
              </h3>
              <p className="text-gray-600">{asset.asset_tag}</p>
              <span
                className={`badge ${
                  asset.status === "active" ? "badge-success" : "badge-warning"
                } mt-2`}
              >
                {asset.status || "active"}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(bookValue)}
            </div>
            <div className="text-sm text-gray-500">Current Book Value</div>
          </div>
        </div>
      </div>

      {/* Asset Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Asset Information
          </h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="text-sm text-gray-900 capitalize">
                {asset.category || "Not specified"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Serial Number
              </dt>
              <dd className="text-sm text-gray-900">
                {asset.serial_number || "Not specified"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Location</dt>
              <dd className="text-sm text-gray-900">
                {asset.location || "Not specified"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Condition</dt>
              <dd className="text-sm text-gray-900">
                {asset.condition || "Good"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Financial Information */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Financial Details
          </h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Purchase Price
              </dt>
              <dd className="text-sm text-gray-900">
                {formatCurrency(asset.purchase_price || 0)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Purchase Date
              </dt>
              <dd className="text-sm text-gray-900">
                {formatDate(asset.purchase_date)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Useful Life</dt>
              <dd className="text-sm text-gray-900">
                {asset.useful_life_years} years
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Accumulated Depreciation
              </dt>
              <dd className="text-sm text-gray-900">
                {formatCurrency(depreciatedAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Supplier</dt>
              <dd className="text-sm text-gray-900">
                {asset.supplier || "Not specified"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Description */}
      {asset.description && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Description
          </h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {asset.description}
            </p>
          </div>
        </div>
      )}

      {/* Depreciation Chart */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Depreciation Timeline
        </h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Depreciation Progress
            </span>
            <span className="text-sm font-medium text-gray-900">
              {Math.round(
                (depreciatedAmount / (asset.purchase_price || 1)) * 100
              )}
              %
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-blue-500"
              style={{
                width: `${Math.min(
                  (depreciatedAmount / (asset.purchase_price || 1)) * 100,
                  100
                )}%`,
              }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatCurrency(0)}</span>
            <span>{formatCurrency(asset.purchase_price || 0)}</span>
          </div>
        </div>
      </div>

      {/* Maintenance History Placeholder */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Maintenance History
        </h4>
        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
          <p>No maintenance records found</p>
          <p className="text-xs mt-1">
            Maintenance history would be displayed here
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
        <button className="btn-primary">Edit Asset</button>
      </div>
    </div>
  );
};

export default FixedAssets;
