// frontend/src/pages/ChartOfAccounts.jsx
import { Edit, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import AccountForm from '../components/Forms/AccountForm';
import ErrorMessage from '../components/UI/ErrorMessage';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccounts, useCreateAccount } from '../hooks/useApi';

const ChartOfAccounts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const { t } = useLanguage();
  
  const { data: accountsData, isLoading, error } = useAccounts({
    search: searchTerm,
    type: selectedType,
    page: currentPage,
    per_page: 20,
  });

  const createAccountMutation = useCreateAccount();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  const accounts = accountsData?.accounts || [];
  const totalPages = accountsData?.pages || 1;

  const accountTypes = [
    { value: '', label: 'All Types' },
    { value: 'asset', label: t('asset') },
    { value: 'liability', label: t('liability') },
    { value: 'equity', label: t('equity') },
    { value: 'revenue', label: t('revenue') },
    { value: 'expense', label: t('expense') },
  ];

  const getAccountTypeColor = (type) => {
    const colors = {
      asset: 'badge-info',
      liability: 'badge-danger',
      equity: 'badge-success',
      revenue: 'badge-success',
      expense: 'badge-warning',
    };
    return colors[type] || 'badge-info';
  };

  const handleCreateAccount = async (accountData) => {
    try {
      await createAccountMutation.mutateAsync(accountData);
      setShowForm(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            {t('chartOfAccounts')}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your organization's chart of accounts
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('Add Account')}
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
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('accountType')}
              </label>
              <select
                className="form-select mt-1"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                {accountTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('');
                }}
                className="btn-secondary"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="table-header">{t('code')}</th>
                <th className="table-header">{t('name')}</th>
                <th className="table-header">{t('type')}</th>
                <th className="table-header">Parent Account</th>
                <th className="table-header">Level</th>
                <th className="table-header">Status</th>
                <th className="table-header">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="table-cell font-medium text-gray-900 dark:text-white">
                    {account.code}
                  </td>
                  <td className="table-cell">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {account.name}
                      </div>
                      {account.name_ar && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {account.name_ar}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${getAccountTypeColor(account.account_type)}`}>
                      {t(account.account_type)}
                    </span>
                  </td>
                  <td className="table-cell text-gray-500 dark:text-gray-400">
                    {account.parent_name || '-'}
                  </td>
                  <td className="table-cell text-gray-500 dark:text-gray-400">
                    {account.level}
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${account.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {account.is_active ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 dark:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
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
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
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

      {/* Account Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Add New Account"
      >
        <AccountForm
          onSubmit={handleCreateAccount}
          onCancel={() => setShowForm(false)}
          loading={createAccountMutation.isLoading}
        />
      </Modal>
    </div>
  );
};

export default ChartOfAccounts;