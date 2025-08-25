// frontend/src/pages/CostCenters.jsx
import { BarChart3, Edit, Eye, Plus, Search, Target, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import ErrorMessage from '../components/UI/ErrorMessage';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';
import { useLanguage } from '../contexts/LanguageContext';
import { useCostCenters, useCreateCostCenter, useDeleteCostCenter, useUpdateCostCenter } from '../hooks/useApi';

const CostCenters = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  
  const { t, formatCurrency, formatDate } = useLanguage();
  
  const { data: centersData, isLoading, error, refetch } = useCostCenters({
    search: searchTerm,
    status: statusFilter,
    page: currentPage,
    per_page: 20,
  });

  const createCenterMutation = useCreateCostCenter();
  const updateCenterMutation = useUpdateCostCenter();
  const deleteCenterMutation = useDeleteCostCenter();

  const costCenters = centersData?.cost_centers || [];
  const pagination = centersData?.pagination || {};

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: t('active') },
    { value: 'inactive', label: t('inactive') },
  ];

  const handleSubmit = async (centerData) => {
    try {
      if (editingCenter) {
        await updateCenterMutation.mutateAsync({ 
          id: editingCenter.id, 
          data: centerData 
        });
        toast.success('Cost center updated successfully');
      } else {
        await createCenterMutation.mutateAsync(centerData);
        toast.success('Cost center created successfully');
      }
      setShowForm(false);
      setEditingCenter(null);
      refetch();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
    }
  };

  const handleDelete = async (centerId) => {
    if (!window.confirm('Are you sure you want to delete this cost center?')) return;
    
    try {
      await deleteCenterMutation.mutateAsync(centerId);
      toast.success('Cost center deleted successfully');
      refetch();
    } catch (error) {
      toast.error(error.message || 'Failed to delete cost center');
    }
  };

  if (isLoading) return <LoadingSpinner message="Loading cost centers..." />;
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            Cost Centers
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage departments and cost centers for expense allocation
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => {
              setEditingCenter(null);
              setShowForm(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Cost Center
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Cost Centers"
          value="12"
          icon={Target}
          color="bg-blue-500"
        />
        <SummaryCard
          title="Active Centers"
          value="10"
          icon={TrendingUp}
          color="bg-green-500"
        />
        <SummaryCard
          title="Total Budget"
          value={formatCurrency(1250000)}
          icon={BarChart3}
          color="bg-purple-500"
        />
        <SummaryCard
          title="YTD Spent"
          value={formatCurrency(850000)}
          icon={TrendingDown}
          color="bg-orange-500"
        />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                  placeholder="Search cost centers..."
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
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                }}
                className="btn-secondary"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Centers Table */}
      <CostCentersTable
        costCenters={costCenters}
        onView={(center) => {
          setSelectedCenter(center);
          setShowDetails(true);
        }}
        onEdit={(center) => {
          setEditingCenter(center);
          setShowForm(true);
        }}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.pages}
          onPageChange={setCurrentPage}
          totalItems={pagination.total}
        />
      )}

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingCenter(null);
        }}
        title={editingCenter ? 'Edit Cost Center' : 'Add New Cost Center'}
        size="lg"
      >
        <CostCenterForm
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingCenter(null);
          }}
          loading={createCenterMutation.isLoading || updateCenterMutation.isLoading}
          editData={editingCenter}
        />
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={`Cost Center Details - ${selectedCenter?.name || ''}`}
        size="xl"
      >
        {selectedCenter && (
          <CostCenterDetails
            costCenter={selectedCenter}
            onClose={() => setShowDetails(false)}
            onEdit={() => {
              setShowDetails(false);
              setEditingCenter(selectedCenter);
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

// Cost Centers Table Component
const CostCentersTable = ({ costCenters, onView, onEdit, onDelete }) => {
  const { formatCurrency } = useLanguage();

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="table">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="table-header">Cost Center</th>
              <th className="table-header">Manager</th>
              <th className="table-header">Budget</th>
              <th className="table-header">YTD Spending</th>
              <th className="table-header">Utilization</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {costCenters.length > 0 ? (
              costCenters.map((center) => (
                <CostCenterRow
                  key={center.id}
                  center={center}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            ) : (
              <tr>
                <td colSpan="7" className="table-cell text-center text-gray-500 dark:text-gray-400 py-8">
                  No cost centers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Cost Center Row Component
const CostCenterRow = ({ center, onView, onEdit, onDelete }) => {
  const { formatCurrency } = useLanguage();
  
  const utilization = center.annual_budget > 0 
    ? Math.round((center.ytd_spending / center.annual_budget) * 100)
    : 0;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td className="table-cell">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
              <Target className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {center.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {center.code}
            </div>
          </div>
        </div>
      </td>
      <td className="table-cell text-gray-500 dark:text-gray-400">
        {center.manager_name || 'Not assigned'}
      </td>
      <td className="table-cell font-medium text-gray-900 dark:text-white">
        {formatCurrency(center.annual_budget || 0)}
      </td>
      <td className="table-cell font-medium text-gray-900 dark:text-white">
        {formatCurrency(center.ytd_spending || 0)}
      </td>
      <td className="table-cell">
        <div className="flex items-center">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-900 dark:text-white">{utilization}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className={`h-2 rounded-full ${
                  utilization >= 90 ? 'bg-red-500' : 
                  utilization >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(utilization, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </td>
      <td className="table-cell">
        <span className={`badge ${center.is_active ? 'badge-success' : 'badge-danger'}`}>
          {center.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="table-cell">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onView(center)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button 
            onClick={() => onEdit(center)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
            title="Edit Cost Center"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button 
            onClick={() => onDelete(center.id)}
            className="text-red-600 hover:text-red-900 dark:text-red-400"
            title="Delete Cost Center"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Cost Center Form Component
const CostCenterForm = ({ onSubmit, onCancel, loading, editData }) => {
  const [formData, setFormData] = useState({
    code: editData?.code || '',
    name: editData?.name || '',
    description: editData?.description || '',
    manager_id: editData?.manager_id || '',
    parent_id: editData?.parent_id || '',
    annual_budget: editData?.annual_budget || '',
    is_active: editData?.is_active ?? true,
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.code) newErrors.code = 'Code is required';
    if (!formData.name) newErrors.name = 'Name is required';
    if (formData.annual_budget && isNaN(parseFloat(formData.annual_budget))) {
      newErrors.annual_budget = 'Invalid budget amount';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        annual_budget: parseFloat(formData.annual_budget) || 0,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Cost Center Code *
          </label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
            className={`form-input mt-1 ${errors.code ? 'border-red-500' : ''}`}
            placeholder="e.g., CC001"
          />
          {errors.code && (
            <p className="mt-1 text-sm text-red-600">{errors.code}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Cost Center Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={`form-input mt-1 ${errors.name ? 'border-red-500' : ''}`}
            placeholder="e.g., Administration"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Annual Budget
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.annual_budget}
            onChange={(e) => setFormData(prev => ({ ...prev, annual_budget: e.target.value }))}
            className={`form-input mt-1 ${errors.annual_budget ? 'border-red-500' : ''}`}
            placeholder="0.00"
          />
          {errors.annual_budget && (
            <p className="mt-1 text-sm text-red-600">{errors.annual_budget}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </label>
          <select
            value={formData.is_active}
            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
            className="form-select mt-1"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="form-textarea mt-1"
            placeholder="Optional description..."
          />
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Saving...' : 'Save Cost Center'}
        </button>
      </div>
    </form>
  );
};

// Cost Center Details Component
const CostCenterDetails = ({ costCenter, onClose, onEdit }) => {
  const { formatCurrency, formatDate } = useLanguage();
  
  const utilization = costCenter.annual_budget > 0 
    ? Math.round((costCenter.ytd_spending / costCenter.annual_budget) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-indigo-500 flex items-center justify-center">
              <Target className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{costCenter.name}</h3>
              <p className="text-gray-600">{costCenter.code}</p>
              <span className={`badge ${costCenter.is_active ? 'badge-success' : 'badge-danger'} mt-2`}>
                {costCenter.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {utilization}%
            </div>
            <div className="text-sm text-gray-500">Budget Utilization</div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Code</dt>
              <dd className="text-sm text-gray-900">{costCenter.code}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Manager</dt>
              <dd className="text-sm text-gray-900">{costCenter.manager_name || 'Not assigned'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900">{formatDate(costCenter.created_at)}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Budget Information</h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Annual Budget</dt>
              <dd className="text-sm text-gray-900">{formatCurrency(costCenter.annual_budget || 0)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">YTD Spending</dt>
              <dd className="text-sm text-gray-900">{formatCurrency(costCenter.ytd_spending || 0)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Remaining Budget</dt>
              <dd className="text-sm text-gray-900">
                {formatCurrency((costCenter.annual_budget || 0) - (costCenter.ytd_spending || 0))}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Description */}
      {costCenter.description && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700 whitespace-pre-line">{costCenter.description}</p>
          </div>
        </div>
      )}

      {/* Budget Progress */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Budget Utilization</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-gray-900">{utilization}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full ${
                utilization >= 90 ? 'bg-red-500' : 
                utilization >= 75 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatCurrency(0)}</span>
            <span>{formatCurrency(costCenter.annual_budget || 0)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
        <button onClick={onEdit} className="btn-primary">
          Edit Cost Center
        </button>
      </div>
    </div>
  );
};

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange, totalItems }) => (
  <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
    <div className="flex-1 flex justify-between sm:hidden">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="btn-secondary"
      >
        Previous
      </button>
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="btn-secondary"
      >
        Next
      </button>
    </div>
    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Showing{' '}
          <span className="font-medium">
            {((currentPage - 1) * 20) + 1}
          </span>{' '}
          to{' '}
          <span className="font-medium">
            {Math.min(currentPage * 20, totalItems)}
          </span>{' '}
          of{' '}
          <span className="font-medium">{totalItems}</span>{' '}
          results
        </p>
      </div>
      <div className="flex items-center space-x-2">
        {[...Array(Math.min(5, totalPages))].map((_, index) => {
          const page = index + 1;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-2 text-sm rounded-md ${
                currentPage === page
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {page}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

export default CostCenters;