// 2. Journal Entry Form Component
// frontend/src/components/Forms/JournalEntryForm.jsx

import { Calculator, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccounts } from '../../hooks/useApi';
import { numberUtils } from '../../services/utils';

const JournalEntryForm = ({ onSubmit, onCancel, loading, editData = null }) => {
  const { t, formatCurrency } = useLanguage();
  const { data: accountsData } = useAccounts({ per_page: 1000 });
  const [balanceError, setBalanceError] = useState(false);

  const { 
    register, 
    control, 
    handleSubmit, 
    watch, 
    setValue,
    formState: { errors } 
  } = useForm({
    defaultValues: editData || {
      entry_date: new Date().toISOString().split('T')[0],
      description: '',
      reference_number: '',
      currency_id: 1,
      exchange_rate: 1,
      lines: [
        { account_id: '', description: '', debit_amount: '', credit_amount: '', cost_center_id: '', project_id: '' },
        { account_id: '', description: '', debit_amount: '', credit_amount: '', cost_center_id: '', project_id: '' }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines'
  });

  const watchedLines = watch('lines');

  // Calculate totals
  const totals = watchedLines.reduce(
    (acc, line) => {
      const debit = numberUtils.parseNumber(line.debit_amount || 0);
      const credit = numberUtils.parseNumber(line.credit_amount || 0);
      return {
        debit: acc.debit + debit,
        credit: acc.credit + credit
      };
    },
    { debit: 0, credit: 0 }
  );

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  useEffect(() => {
    setBalanceError(!isBalanced && totals.debit > 0 && totals.credit > 0);
  }, [isBalanced, totals]);

  const addLine = () => {
    append({
      account_id: '',
      description: '',
      debit_amount: '',
      credit_amount: '',
      cost_center_id: '',
      project_id: ''
    });
  };

  const removeLine = (index) => {
    if (fields.length > 2) {
      remove(index);
    }
  };

  const handleLineAmountChange = (index, field, value) => {
    const numValue = numberUtils.parseNumber(value);
    setValue(`lines.${index}.${field}`, numValue > 0 ? numValue.toString() : '');
    
    // Clear the opposite field
    const oppositeField = field === 'debit_amount' ? 'credit_amount' : 'debit_amount';
    if (numValue > 0) {
      setValue(`lines.${index}.${oppositeField}`, '');
    }
  };

  const onFormSubmit = (data) => {
    if (!isBalanced) {
      setBalanceError(true);
      return;
    }

    // Format data for submission
    const formattedData = {
      ...data,
      lines: data.lines.filter(line => 
        line.account_id && (
          numberUtils.parseNumber(line.debit_amount) > 0 || 
          numberUtils.parseNumber(line.credit_amount) > 0
        )
      ).map(line => ({
        ...line,
        debit_amount: numberUtils.parseNumber(line.debit_amount || 0),
        credit_amount: numberUtils.parseNumber(line.credit_amount || 0)
      }))
    };

    onSubmit(formattedData);
  };

  const accounts = accountsData?.accounts || [];

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Journal Entry Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('entryDate')}
          </label>
          <input
            type="date"
            {...register('entry_date', { required: 'Entry date is required' })}
            className="form-input"
          />
          {errors.entry_date && (
            <p className="mt-1 text-sm text-red-600">{errors.entry_date.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Reference Number
          </label>
          <input
            type="text"
            {...register('reference_number')}
            className="form-input"
            placeholder="Optional reference"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Exchange Rate
          </label>
          <input
            type="number"
            step="0.000001"
            {...register('exchange_rate', { 
              required: true, 
              min: { value: 0.000001, message: 'Must be greater than 0' }
            })}
            className="form-input"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('description')}
        </label>
        <textarea
          {...register('description', { required: 'Description is required' })}
          rows={2}
          className="form-textarea"
          placeholder="Describe the transaction..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Journal Entry Lines */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Journal Entry Lines</h3>
          <button
            type="button"
            onClick={addLine}
            className="btn-secondary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Line
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Account
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Debit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Credit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fields.map((field, index) => (
                <tr key={field.id} className="bg-white">
                  <td className="px-4 py-3">
                    <select
                      {...register(`lines.${index}.account_id`, { 
                        required: 'Account is required' 
                      })}
                      className="form-select w-full"
                    >
                      <option value="">Select Account</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                    {errors.lines?.[index]?.account_id && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.lines[index].account_id.message}
                      </p>
                    )}
                  </td>
                  
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      {...register(`lines.${index}.description`)}
                      className="form-input w-full"
                      placeholder="Line description"
                    />
                  </td>
                  
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      className="form-input w-full"
                      placeholder="0.00"
                      onChange={(e) => handleLineAmountChange(index, 'debit_amount', e.target.value)}
                      value={watchedLines[index]?.debit_amount || ''}
                    />
                  </td>
                  
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      className="form-input w-full"
                      placeholder="0.00"
                      onChange={(e) => handleLineAmountChange(index, 'credit_amount', e.target.value)}
                      value={watchedLines[index]?.credit_amount || ''}
                    />
                  </td>
                  
                  <td className="px-4 py-3">
                    {fields.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan="2" className="px-4 py-3 text-right font-medium">
                  Totals:
                </td>
                <td className="px-4 py-3 font-bold">
                  {formatCurrency(totals.debit)}
                </td>
                <td className="px-4 py-3 font-bold">
                  {formatCurrency(totals.credit)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <Calculator className={`h-4 w-4 mr-1 ${
                      isBalanced ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <span className={`text-sm font-medium ${
                      isBalanced ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isBalanced ? 'Balanced' : 'Out of Balance'}
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {balanceError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">
              The journal entry must be balanced. Total debits must equal total credits.
            </p>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={loading}
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={loading || !isBalanced}
          className="btn-primary"
        >
          {loading ? 'Saving...' : 'Save Journal Entry'}
        </button>
      </div>
    </form>
  );
};

export default JournalEntryForm;

// 3. Enhanced API Service with Error Handling
// frontend/src/services/api.js (additional methods)

// Enhanced error handling
const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        throw new Error(data.message || 'Invalid request data');
      case 401:
        // Handle unauthorized - redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      case 403:
        throw new Error('You do not have permission to perform this action');
      case 404:
        throw new Error('The requested resource was not found');
      case 422:
        // Validation errors
        const validationErrors = data.errors || {};
        const errorMessages = Object.values(validationErrors).flat();
        throw new Error(errorMessages.join(', ') || 'Validation failed');
      case 500:
        throw new Error('Internal server error. Please try again later.');
      default:
        throw new Error(data.message || `Server error (${status})`);
    }
  } else if (error.request) {
    // Network error
    throw new Error('Network error. Please check your connection.');
  } else {
    // Other error
    throw new Error(error.message || 'An unexpected error occurred');
  }
};

// Enhanced API service with retry logic
const apiWithRetry = async (apiCall, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (attempt === maxRetries || error.response?.status < 500) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};

// Extended API service methods
export const extendedApiService = {
  // Batch operations
  batch: {
    journalEntries: (entries) => apiWithRetry(() => 
      api.post('/journal-entries/batch', { entries })
    ),
    
    accounts: (accounts) => apiWithRetry(() => 
      api.post('/accounts/batch', { accounts })
    )
  },

  // File operations
  files: {
    upload: (file, type = 'document') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      return apiWithRetry(() => 
        api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000 // 60 seconds for file uploads
        })
      );
    },

    download: (fileId) => apiWithRetry(() => 
      api.get(`/files/${fileId}/download`, { responseType: 'blob' })
    )
  },

  // Advanced reports
  reports: {
    generate: (reportType, params = {}) => apiWithRetry(() => 
      api.post('/reports/generate', { type: reportType, parameters: params })
    ),

    schedule: (reportConfig) => apiWithRetry(() => 
      api.post('/reports/schedule', reportConfig)
    ),

    export: (reportId, format = 'pdf') => apiWithRetry(() => 
      api.get(`/reports/${reportId}/export/${format}`, { responseType: 'blob' })
    )
  },

  // Analytics
  analytics: {
    dashboard: () => apiWithRetry(() => 
      api.get('/analytics/dashboard')
    ),

    trends: (metric, period = '12m') => apiWithRetry(() => 
      api.get(`/analytics/trends/${metric}`, { params: { period } })
    ),

    comparison: (startDate, endDate, compareWith) => apiWithRetry(() => 
      api.get('/analytics/comparison', { 
        params: { start_date: startDate, end_date: endDate, compare_with: compareWith }
      })
    )
  },

  // Import/Export
  dataExchange: {
    import: (data, type) => apiWithRetry(() => 
      api.post('/data/import', { data, type })
    ),

    export: (type, filters = {}) => apiWithRetry(() => 
      api.post('/data/export', { type, filters }, { responseType: 'blob' })
    ),

    validateImport: (data, type) => apiWithRetry(() => 
      api.post('/data/validate', { data, type })
    )
  },

  // Audit and compliance
  audit: {
    logs: (params = {}) => apiWithRetry(() => 
      api.get('/audit/logs', { params })
    ),

    trail: (entityType, entityId) => apiWithRetry(() => 
      api.get(`/audit/trail/${entityType}/${entityId}`)
    ),

    compliance: (checkType) => apiWithRetry(() => 
      api.get(`/audit/compliance/${checkType}`)
    )
  }
};
