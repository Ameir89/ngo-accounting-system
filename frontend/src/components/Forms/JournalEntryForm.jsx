// frontend/src/components/Forms/JournalEntryForm.jsx - Optimized Version
import { AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccounts } from '../../hooks/useApi';
import { numberUtils } from '../../services/utils';

// Validation rules
const validationRules = {
  entry_date: {
    required: 'Entry date is required',
    validate: (value) => {
      const date = new Date(value);
      const today = new Date();
      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      const oneYearAhead = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      
      if (date < oneYearAgo || date > oneYearAhead) {
        return 'Entry date must be within one year of today';
      }
      return true;
    }
  },
  description: {
    required: 'Description is required',
    minLength: { value: 3, message: 'Description must be at least 3 characters' },
    maxLength: { value: 255, message: 'Description must not exceed 255 characters' }
  },
  reference_number: {
    maxLength: { value: 50, message: 'Reference number must not exceed 50 characters' }
  },
  exchange_rate: {
    required: 'Exchange rate is required',
    min: { value: 0.000001, message: 'Exchange rate must be greater than 0' },
    max: { value: 1000000, message: 'Exchange rate seems unrealistic' }
  }
};

// Memoized account selector component
const AccountSelector = ({ 
  value, 
  onChange, 
  accounts, 
  error, 
  disabled,
  placeholder = "Select Account" 
}) => {
  const groupedAccounts = useMemo(() => {
    const groups = {};
    accounts.forEach(account => {
      if (!groups[account.account_type]) {
        groups[account.account_type] = [];
      }
      groups[account.account_type].push(account);
    });
    return groups;
  }, [accounts]);

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          form-select w-full appearance-none
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? 'account-error' : undefined}
      >
        <option value="">{placeholder}</option>
        {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
          <optgroup key={type} label={type.charAt(0).toUpperCase() + type.slice(1)}>
            {typeAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.code} - {account.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {error && (
        <div id="account-error" className="mt-1 flex items-center text-sm text-red-600">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error.message}
        </div>
      )}
    </div>
  );
};

// Memoized amount input component
const AmountInput = ({ 
  value, 
  onChange, 
  onBlur,
  placeholder, 
  error,
  disabled,
  type = "debit" // debit or credit
}) => {
  const [displayValue, setDisplayValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value || '');
    }
  }, [value, isFocused]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Allow empty string, digits, and one decimal point
    if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
      onChange(inputValue);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numValue = numberUtils.parseNumber(displayValue);
    const formattedValue = numValue > 0 ? numValue.toFixed(2) : '';
    setDisplayValue(formattedValue);
    onChange(formattedValue);
    onBlur && onBlur();
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={`
          form-input w-full text-right
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          ${type === 'debit' ? 'text-blue-600' : 'text-green-600'}
        `}
        aria-invalid={error ? 'true' : 'false'}
      />
      {error && (
        <div className="mt-1 flex items-center text-sm text-red-600">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error.message}
        </div>
      )}
    </div>
  );
};

// Main Journal Entry Form Component
const JournalEntryForm = ({ onSubmit, onCancel, loading, editData = null }) => {
  const { t, formatCurrency } = useLanguage();
  const { data: accountsData } = useAccounts({ per_page: 1000 });
  const [balanceError, setBalanceError] = useState(false);

  const defaultValues = useMemo(() => ({
    entry_date: editData?.entry_date || new Date().toISOString().split('T')[0],
    description: editData?.description || '',
    reference_number: editData?.reference_number || '',
    currency_id: editData?.currency_id || 1,
    exchange_rate: editData?.exchange_rate || 1,
    lines: editData?.lines || [
      { account_id: '', description: '', debit_amount: '', credit_amount: '', cost_center_id: '', project_id: '' },
      { account_id: '', description: '', debit_amount: '', credit_amount: '', cost_center_id: '', project_id: '' }
    ]
  }), [editData]);

  const { 
    register, 
    control, 
    handleSubmit, 
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty } 
  } = useForm({
    defaultValues,
    mode: 'onChange'
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
    rules: {
      minLength: { value: 2, message: 'At least 2 lines are required' }
    }
  });

  // Watch for changes in lines to calculate totals
  const watchedLines = useWatch({ control, name: 'lines' });

  // Calculate totals with memoization
  const totals = useMemo(() => {
    if (!watchedLines) return { debit: 0, credit: 0 };
    
    return watchedLines.reduce(
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
  }, [watchedLines]);

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;
  const hasAmounts = totals.debit > 0 || totals.credit > 0;

  useEffect(() => {
    setBalanceError(!isBalanced && hasAmounts);
  }, [isBalanced, hasAmounts]);

  const addLine = useCallback(() => {
    append({
      account_id: '',
      description: '',
      debit_amount: '',
      credit_amount: '',
      cost_center_id: '',
      project_id: ''
    });
  }, [append]);

  const removeLine = useCallback((index) => {
    if (fields.length > 2) {
      remove(index);
    }
  }, [fields.length, remove]);

  const handleLineAmountChange = useCallback((index, field, value) => {
    const numValue = numberUtils.parseNumber(value);
    setValue(`lines.${index}.${field}`, numValue > 0 ? numValue.toString() : '');
    
    // Clear the opposite field when entering an amount
    const oppositeField = field === 'debit_amount' ? 'credit_amount' : 'debit_amount';
    if (numValue > 0) {
      setValue(`lines.${index}.${oppositeField}`, '');
    }
  }, [setValue]);

  const onFormSubmit = useCallback(async (data) => {
    if (!isBalanced && hasAmounts) {
      setBalanceError(true);
      return;
    }

    // Filter out empty lines and format data
    const formattedData = {
      ...data,
      lines: data.lines
        .filter(line => 
          line.account_id && (
            numberUtils.parseNumber(line.debit_amount) > 0 || 
            numberUtils.parseNumber(line.credit_amount) > 0
          )
        )
        .map(line => ({
          ...line,
          debit_amount: numberUtils.parseNumber(line.debit_amount || 0),
          credit_amount: numberUtils.parseNumber(line.credit_amount || 0)
        }))
    };

    if (formattedData.lines.length < 2) {
      setBalanceError(true);
      return;
    }

    try {
      await onSubmit(formattedData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }, [isBalanced, hasAmounts, onSubmit]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        reset();
        onCancel();
      }
    } else {
      onCancel();
    }
  }, [isDirty, reset, onCancel]);

  const accounts = accountsData?.accounts || [];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Form Header */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {editData ? 'Edit Journal Entry' : 'Create Journal Entry'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('entryDate')} *
              </label>
              <input
                type="date"
                {...register('entry_date', validationRules.entry_date)}
                className={`form-input ${errors.entry_date ? 'border-red-300' : ''}`}
                aria-invalid={errors.entry_date ? 'true' : 'false'}
              />
              {errors.entry_date && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.entry_date.message}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                {...register('reference_number', validationRules.reference_number)}
                className={`form-input ${errors.reference_number ? 'border-red-300' : ''}`}
                placeholder="Optional reference"
              />
              {errors.reference_number && (
                <div className="mt-1 text-sm text-red-600">{errors.reference_number.message}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Exchange Rate *
              </label>
              <input
                type="number"
                step="0.000001"
                {...register('exchange_rate', validationRules.exchange_rate)}
                className={`form-input ${errors.exchange_rate ? 'border-red-300' : ''}`}
              />
              {errors.exchange_rate && (
                <div className="mt-1 text-sm text-red-600">{errors.exchange_rate.message}</div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('description')} *
            </label>
            <textarea
              {...register('description', validationRules.description)}
              rows={2}
              className={`form-textarea ${errors.description ? 'border-red-300' : ''}`}
              placeholder="Describe the transaction..."
            />
            {errors.description && (
              <div className="mt-1 flex items-center text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.description.message}
              </div>
            )}
          </div>
        </div>

        {/* Journal Entry Lines */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Journal Entry Lines
              </h3>
              <button
                type="button"
                onClick={addLine}
                className="btn-secondary text-sm"
                disabled={loading || isSubmitting}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </button>
            </div>
          </div>

          {/* Table for larger screens */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Account *
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Credit
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {fields.map((field, index) => (
                  <tr key={field.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <AccountSelector
                        value={watchedLines[index]?.account_id || ''}
                        onChange={(value) => setValue(`lines.${index}.account_id`, value)}
                        accounts={accounts}
                        error={errors.lines?.[index]?.account_id}
                        disabled={loading || isSubmitting}
                      />
                    </td>
                    
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        {...register(`lines.${index}.description`)}
                        className="form-input w-full"
                        placeholder="Line description"
                        disabled={loading || isSubmitting}
                      />
                    </td>
                    
                    <td className="px-4 py-3">
                      <AmountInput
                        value={watchedLines[index]?.debit_amount || ''}
                        onChange={(value) => handleLineAmountChange(index, 'debit_amount', value)}
                        placeholder="0.00"
                        type="debit"
                        disabled={loading || isSubmitting}
                      />
                    </td>
                    
                    <td className="px-4 py-3">
                      <AmountInput
                        value={watchedLines[index]?.credit_amount || ''}
                        onChange={(value) => handleLineAmountChange(index, 'credit_amount', value)}
                        placeholder="0.00"
                        type="credit"
                        disabled={loading || isSubmitting}
                      />
                    </td>
                    
                    <td className="px-4 py-3 text-center">
                      {fields.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                          disabled={loading || isSubmitting}
                          aria-label={`Remove line ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile view */}
          <div className="md:hidden space-y-4 p-4">
            {fields.map((field, index) => (
              <div key={field.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-white">Line {index + 1}</h4>
                  {fields.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-red-600 hover:text-red-800"
                      disabled={loading || isSubmitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <AccountSelector
                  value={watchedLines[index]?.account_id || ''}
                  onChange={(value) => setValue(`lines.${index}.account_id`, value)}
                  accounts={accounts}
                  error={errors.lines?.[index]?.account_id}
                  disabled={loading || isSubmitting}
                />
                
                <input
                  type="text"
                  {...register(`lines.${index}.description`)}
                  className="form-input w-full"
                  placeholder="Line description"
                  disabled={loading || isSubmitting}
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <AmountInput
                    value={watchedLines[index]?.debit_amount || ''}
                    onChange={(value) => handleLineAmountChange(index, 'debit_amount', value)}
                    placeholder="Debit"
                    type="debit"
                    disabled={loading || isSubmitting}
                  />
                  <AmountInput
                    value={watchedLines[index]?.credit_amount || ''}
                    onChange={(value) => handleLineAmountChange(index, 'credit_amount', value)}
                    placeholder="Credit"
                    type="credit"
                    disabled={loading || isSubmitting}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Totals Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total Debits: <span className="text-blue-600 dark:text-blue-400">{formatCurrency(totals.debit)}</span>
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total Credits: <span className="text-green-600 dark:text-green-400">{formatCurrency(totals.credit)}</span>
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {isBalanced ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  isBalanced ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isBalanced ? 'Balanced' : 'Out of Balance'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {(balanceError || errors.lines) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3" />
              <div className="text-sm text-red-600 dark:text-red-400">
                {balanceError && (
                  <p className="mb-2">The journal entry must be balanced. Total debits must equal total credits.</p>
                )}
                {errors.lines && (
                  <p>Please ensure all lines have valid accounts and amounts.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary"
            disabled={loading || isSubmitting}
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={loading || isSubmitting || !isBalanced || !hasAmounts}
            className="btn-primary flex items-center"
          >
            {(loading || isSubmitting) && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            {loading || isSubmitting ? 'Saving...' : editData ? 'Update Entry' : 'Save Journal Entry'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JournalEntryForm;