// frontend/src/pages/Grants.jsx
import {
  BarChart3,
  DollarSign, Edit, Eye, FileText,
  Plus,
  Search, Trash2, TrendingUp
} from 'lucide-react';
import { useState } from 'react';
import Modal from '../components/UI/Modal';
import { useLanguage } from '../contexts/LanguageContext';
import { useGrants } from '../hooks/useApi';

const Grants = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGrant, setSelectedGrant] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const { t, formatCurrency, formatDate } = useLanguage();
  
  const { data: grantsData, isLoading, error } = useGrants({
    search: searchTerm,
    status: statusFilter,
    page: currentPage,
    per_page: 20,
  });

  const grants = grantsData?.grants || [];
  const pagination = grantsData?.pagination || {};

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const getStatusColor = (status) => {
    const colors = {
      active: 'badge-success',
      pending: 'badge-warning',
      completed: 'badge-info',
      cancelled: 'badge-danger',
    };
    return colors[status] || 'badge-info';
  };

  const calculateUtilization = (grant) => {
    if (!grant.total_amount || grant.total_amount === 0) return 0;
    return Math.round((grant.utilized_amount / grant.total_amount) * 100);
  };

  const handleViewDetails = (grant) => {
    setSelectedGrant(grant);
    setShowDetails(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
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
          <p className="text-red-600 mb-4">Error loading grants: {error.message}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
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
            {t('grants')}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage grants and funding for your organization's projects
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Grant
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
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Grants
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(1250000)}
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
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Utilized
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(850000)}
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
                <div className="bg-yellow-500 rounded-md p-3">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Active Grants
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                    8
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
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Avg. Utilization
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                    68%
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('search')}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="form-input pl-10"
                  placeholder="Search grants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('status')}
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
                onClick={clearFilters}
                className="btn-secondary"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grants Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="table-header">Grant Details</th>
                <th className="table-header">Donor/Funder</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Period</th>
                <th className="table-header">Utilization</th>
                <th className="table-header">{t('status')}</th>
                <th className="table-header">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {grants.length > 0 ? (
                grants.map((grant) => {
                  const utilization = calculateUtilization(grant);
                  return (
                    <tr key={grant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {grant.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {grant.reference_number}
                          </div>
                          {grant.description && (
                            <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                              {grant.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {grant.donor_name || 'Unknown Donor'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {grant.donor_type || 'N/A'}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(grant.total_amount || 0)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Used: {formatCurrency(grant.utilized_amount || 0)}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatDate(grant.start_date)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          to {formatDate(grant.end_date)}
                        </div>
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
                        <span className={`badge ${getStatusColor(grant.status)}`}>
                          {grant.status || 'active'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleViewDetails(grant)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                            title="Edit Grant"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-900 dark:text-red-400"
                            title="Delete Grant"
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
                  <td colSpan="7" className="table-cell text-center text-gray-500 dark:text-gray-400 py-8">
                    {t('No grants found')}
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
                onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                disabled={currentPage === pagination.pages}
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
                    {Math.min(currentPage * 20, pagination.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.total}</span>{' '}
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
        )}
      </div>

      {/* Grant Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={`Grant Details - ${selectedGrant?.title || ''}`}
        size="xl"
      >
        {selectedGrant && (
          <GrantDetailsView 
            grant={selectedGrant} 
            onClose={() => setShowDetails(false)}
          />
        )}
      </Modal>

      {/* Grant Form Modal - Placeholder */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Add New Grant"
        size="lg"
      >
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Grant form would be implemented here</p>
          <button onClick={() => setShowForm(false)} className="btn-secondary mt-4">
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

// Grant Details Component
const GrantDetailsView = ({ grant, onClose }) => {
  const { formatCurrency, formatDate } = useLanguage();
  const utilization = grant.total_amount ? Math.round((grant.utilized_amount / grant.total_amount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Grant Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{grant.title}</h3>
            <p className="text-gray-600">{grant.reference_number}</p>
            <span className={`badge ${grant.status === 'active' ? 'badge-success' : 'badge-warning'} mt-2`}>
              {grant.status || 'active'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(grant.total_amount || 0)}
            </div>
            <div className="text-sm text-gray-500">Total Amount</div>
          </div>
        </div>
      </div>

      {/* Grant Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Grant Information</h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Donor/Funder</dt>
              <dd className="text-sm text-gray-900">{grant.donor_name || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Donor Type</dt>
              <dd className="text-sm text-gray-900">{grant.donor_type || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Start Date</dt>
              <dd className="text-sm text-gray-900">{formatDate(grant.start_date)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">End Date</dt>
              <dd className="text-sm text-gray-900">{formatDate(grant.end_date)}</dd>
            </div>
          </dl>
        </div>

        {/* Financial Information */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Financial Details</h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Grant Amount</dt>
              <dd className="text-sm text-gray-900">{formatCurrency(grant.total_amount || 0)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Utilized Amount</dt>
              <dd className="text-sm text-gray-900">{formatCurrency(grant.utilized_amount || 0)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Remaining Amount</dt>
              <dd className="text-sm text-gray-900">
                {formatCurrency((grant.total_amount || 0) - (grant.utilized_amount || 0))}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Utilization Rate</dt>
              <dd className="text-sm text-gray-900">{utilization}%</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Description */}
      {grant.description && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700 whitespace-pre-line">{grant.description}</p>
          </div>
        </div>
      )}

      {/* Utilization Progress */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Grant Utilization</h4>
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
            <span>{formatCurrency(grant.total_amount || 0)}</span>
          </div>
        </div>
      </div>

      {/* Recent Activities Placeholder */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Activities</h4>
        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
          <p>No recent activities found</p>
          <p className="text-xs mt-1">Grant activities and transactions would be displayed here</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="btn-secondary"
        >
          Close
        </button>
        <button className="btn-primary">
          Edit Grant
        </button>
      </div>
    </div>
  );
};

export default Grants;