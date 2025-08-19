// frontend/src/pages/Suppliers.jsx
import { Edit, Eye, Mail, Phone, Plus, Search, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import SupplierForm from '../components/Forms/SupplierForm';
import Modal from '../components/UI/Modal';
import { useLanguage } from '../contexts/LanguageContext';
import { useCreateSupplier, useSuppliers } from '../hooks/useApi';

const Suppliers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  
  const { t, formatDate } = useLanguage();
  
  const { data: suppliersData, isLoading, error } = useSuppliers({
    search: searchTerm,
    status: statusFilter,
    page: currentPage,
    per_page: 20,
  });

  const createSupplierMutation = useCreateSupplier();

  const suppliers = suppliersData?.suppliers || [];
  const pagination = suppliersData?.pagination || {};

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: t('active') },
    { value: 'inactive', label: t('inactive') },
  ];

  const getStatusColor = (isActive) => {
    return isActive ? 'badge-success' : 'badge-warning';
  };

  const handleCreateSupplier = async (supplierData) => {
    try {
      await createSupplierMutation.mutateAsync(supplierData);
      setShowForm(false);
      setEditingSupplier(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  const handleViewDetails = (supplier) => {
    setSelectedSupplier(supplier);
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
          <p className="text-red-600 mb-4">Error loading suppliers: {error.message}</p>
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
            {t('suppliers')}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your organization's suppliers and vendors
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => {
              setEditingSupplier(null);
              setShowForm(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('Add Supplier')}
          </button>
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
                  placeholder="Search suppliers..."
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

      {/* Suppliers Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="table-header">Supplier</th>
                <th className="table-header">Contact Info</th>
                <th className="table-header">Payment Terms</th>
                <th className="table-header">Tax Number</th>
                <th className="table-header">{t('status')}</th>
                <th className="table-header">Added</th>
                <th className="table-header">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {suppliers.length > 0 ? (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                            <User className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {supplier.name}
                          </div>
                          {supplier.name_ar && (
                            <div className="text-sm text-gray-500 dark:text-gray-400" dir="rtl">
                              {supplier.name_ar}
                            </div>
                          )}
                          {supplier.contact_person && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Contact: {supplier.contact_person}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="space-y-1">
                        {supplier.email && (
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Mail className="h-4 w-4 mr-1" />
                            {supplier.email}
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Phone className="h-4 w-4 mr-1" />
                            {supplier.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-gray-500 dark:text-gray-400">
                      {supplier.payment_terms || '-'}
                    </td>
                    <td className="table-cell text-gray-500 dark:text-gray-400">
                      {supplier.tax_number || '-'}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${getStatusColor(supplier.is_active)}`}>
                        {supplier.is_active ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="table-cell text-gray-500 dark:text-gray-400">
                      {formatDate(supplier.created_at)}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleViewDetails(supplier)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditSupplier(supplier)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                          title="Edit Supplier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900 dark:text-red-400"
                          title="Delete Supplier"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="table-cell text-center text-gray-500 dark:text-gray-400 py-8">
                    {t('No suppliers found')}
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

      {/* Supplier Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingSupplier(null);
        }}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        size="lg"
      >
        <SupplierForm
          onSubmit={handleCreateSupplier}
          onCancel={() => {
            setShowForm(false);
            setEditingSupplier(null);
          }}
          loading={createSupplierMutation.isLoading}
          editData={editingSupplier}
        />
      </Modal>

      {/* Supplier Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={`Supplier Details - ${selectedSupplier?.name || ''}`}
        size="lg"
      >
        {selectedSupplier && (
          <SupplierDetailsView 
            supplier={selectedSupplier} 
            onClose={() => setShowDetails(false)}
            onEdit={() => {
              setShowDetails(false);
              handleEditSupplier(selectedSupplier);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

// Supplier Details Component
const SupplierDetailsView = ({ supplier, onClose, onEdit }) => {
  const { formatDate } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Supplier Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-indigo-500 flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
              {supplier.name_ar && (
                <p className="text-gray-600" dir="rtl">{supplier.name_ar}</p>
              )}
              <span className={`badge ${supplier.is_active ? 'badge-success' : 'badge-warning'}`}>
                {supplier.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <button onClick={onEdit} className="btn-secondary">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </button>
        </div>
      </div>

      {/* Supplier Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h4>
          <dl className="space-y-2">
            {supplier.contact_person && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                <dd className="text-sm text-gray-900">{supplier.contact_person}</dd>
              </div>
            )}
            {supplier.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">
                  <a href={`mailto:${supplier.email}`} className="text-indigo-600 hover:text-indigo-800">
                    {supplier.email}
                  </a>
                </dd>
              </div>
            )}
            {supplier.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="text-sm text-gray-900">
                  <a href={`tel:${supplier.phone}`} className="text-indigo-600 hover:text-indigo-800">
                    {supplier.phone}
                  </a>
                </dd>
              </div>
            )}
            {supplier.address && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-line">{supplier.address}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Business Information */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Business Information</h4>
          <dl className="space-y-2">
            {supplier.tax_number && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Tax Number</dt>
                <dd className="text-sm text-gray-900">{supplier.tax_number}</dd>
              </div>
            )}
            {supplier.payment_terms && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Payment Terms</dt>
                <dd className="text-sm text-gray-900">{supplier.payment_terms}</dd>
              </div>
            )}
            {supplier.bank_account && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Bank Account</dt>
                <dd className="text-sm text-gray-900">{supplier.bank_account}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Added On</dt>
              <dd className="text-sm text-gray-900">{formatDate(supplier.created_at)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Notes */}
      {supplier.notes && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700 whitespace-pre-line">{supplier.notes}</p>
          </div>
        </div>
      )}

      {/* Transaction History Placeholder */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Transactions</h4>
        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
          <p>No recent transactions found</p>
          <p className="text-xs mt-1">Transaction history would be displayed here</p>
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
        <button
          onClick={onEdit}
          className="btn-primary"
        >
          Edit Supplier
        </button>
      </div>
    </div>
  );
};

export default Suppliers;