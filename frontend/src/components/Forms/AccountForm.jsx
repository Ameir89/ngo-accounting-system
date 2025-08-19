import { useForm } from 'react-hook-form';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAccounts } from '../../hooks/useApi';

const AccountForm = ({ onSubmit, onCancel, loading, editData = null }) => {
  const { t } = useLanguage();
  const { data: accountsData } = useAccounts({ type: '', per_page: 1000 });
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: editData || {
      code: '',
      name: '',
      name_ar: '',
      account_type: 'asset',
      parent_id: '',
      description: ''
    }
  });

  const accountType = watch('account_type');
  const parentId = watch('parent_id');

  // Filter parent accounts based on selected type
  const availableParents = accountsData?.accounts?.filter(account => 
    account.account_type === accountType && account.id !== editData?.id
  ) || [];

  const accountTypes = [
    { value: 'asset', label: t('asset') },
    { value: 'liability', label: t('liability') },
    { value: 'equity', label: t('equity') },
    { value: 'revenue', label: t('revenue') },
    { value: 'expense', label: t('expense') }
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('accountCode')}
          </label>
          <input
            {...register('code', { 
              required: 'Account code is required',
              pattern: {
                value: /^[A-Za-z0-9]{3,20}$/,
                message: 'Account code must be 3-20 alphanumeric characters'
              }
            })}
            className="form-input"
            placeholder="e.g., 1100"
          />
          {errors.code && (
            <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('accountType')}
          </label>
          <select {...register('account_type', { required: true })} className="form-select">
            {accountTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('accountName')} (English)
          </label>
          <input
            {...register('name', { required: 'Account name is required' })}
            className="form-input"
            placeholder="e.g., Cash and Cash Equivalents"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('accountName')} (Arabic)
          </label>
          <input
            {...register('name_ar')}
            className="form-input"
            placeholder="النقد وما في حكمه"
            dir="rtl"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('parentAccount')}
          </label>
          <select {...register('parent_id')} className="form-select">
            <option value="">-- {t('No Parent Account')} --</option>
            {availableParents.map(account => (
              <option key={account.id} value={account.id}>
                {account.code} - {account.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('description')}
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className="form-textarea"
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
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? t('saving...') : t('save')}
        </button>
      </div>
    </form>
  );
};

export default AccountForm;