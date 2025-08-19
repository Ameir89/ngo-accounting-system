// frontend/src/components/Tables/AccountsTable.jsx
import { Edit, Eye, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const AccountsTable = ({ 
  accounts = [], 
  onView, 
  onEdit, 
  onDelete,
  loading = false 
}) => {
  const { t } = useLanguage();

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

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="spinner mx-auto mb-4"></div>
        <p className="text-gray-500">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="table-header">{t('code')}</th>
            <th className="table-header">{t('name')}</th>
            <th className="table-header">{t('type')}</th>
            <th className="table-header">Parent Account</th>
            <th className="table-header">Balance</th>
            <th className="table-header">Status</th>
            <th className="table-header">{t('actions')}</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {accounts.length > 0 ? (
            accounts.map((account) => (
              <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="table-cell font-medium text-gray-900 dark:text-white">
                  {account.code}
                </td>
                <td className="table-cell">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {account.name}
                    </div>
                    {account.name_ar && (
                      <div className="text-sm text-gray-500 dark:text-gray-400" dir="rtl">
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
                <td className="table-cell font-medium text-gray-900 dark:text-white">
                  {account.balance ? `$${account.balance.toLocaleString()}` : '$0.00'}
                </td>
                <td className="table-cell">
                  <span className={`badge ${account.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {account.is_active ? t('active') : t('inactive')}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex items-center space-x-2">
                    {onView && (
                      <button 
                        onClick={() => onView(account)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {onEdit && (
                      <button 
                        onClick={() => onEdit(account)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                        title="Edit Account"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button 
                        onClick={() => onDelete(account)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400"
                        title="Delete Account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="table-cell text-center text-gray-500 dark:text-gray-400 py-8">
                {t('No accounts found')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AccountsTable;