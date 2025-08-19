// frontend/src/components/Forms/SupplierForm.jsx

import { Save, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import useFormValidation from '../../hooks/useFormValidation';

const SupplierForm = ({ 
  onSubmit, 
  onCancel, 
  loading = false, 
  editData = null 
}) => {
  const { t, isRTL } = useLanguage();

  const initialValues = editData || {
    name: '',
    name_ar: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_number: '',
    payment_terms: '30 days',
    bank_account: '',
    notes: ''
  };

  const validationRules = {
    name: ['required', { type: 'maxLength', max: 100 }],
    email: ['required', 'email'],
    phone: ['phone'],
    tax_number: [{ type: 'pattern', pattern: /^[A-Z0-9\-]{5,20}$/, message: 'Invalid tax number format' }],
    payment_terms: ['required']
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldTouched,
    handleSubmit
  } = useFormValidation(initialValues, validationRules);

  const paymentTermsOptions = [
    { value: 'cash', label: t('Cash on Delivery') },
    { value: '15 days', label: t('15 Days') },
    { value: '30 days', label: t('30 Days') },
    { value: '45 days', label: t('45 Days') },
    { value: '60 days', label: t('60 Days') },
    { value: '90 days', label: t('90 Days') }
  ];

  const FormField = ({ name, label, type = 'text', required = false, ...props }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {type === 'textarea' ? (
        <textarea
          value={values[name] || ''}
          onChange={(e) => setValue(name, e.target.value)}
          onBlur={() => setFieldTouched(name)}
          className={`form-textarea ${errors[name] && touched[name] ? 'border-red-500' : ''}`}
          dir={isRTL && name.includes('_ar') ? 'rtl' : 'ltr'}
          {...props}
        />
      ) : type === 'select' ? (
        <select
          value={values[name] || ''}
          onChange={(e) => setValue(name, e.target.value)}
          onBlur={() => setFieldTouched(name)}
          className={`form-select ${errors[name] && touched[name] ? 'border-red-500' : ''}`}
          {...props}
        >
          {props.options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={values[name] || ''}
          onChange={(e) => setValue(name, e.target.value)}
          onBlur={() => setFieldTouched(name)}
          className={`form-input ${errors[name] && touched[name] ? 'border-red-500' : ''}`}
          dir={isRTL && name.includes('_ar') ? 'rtl' : 'ltr'}
          {...props}
        />
      )}
      
      {errors[name] && touched[name] && (
        <p className="mt-1 text-sm text-red-600">{errors[name]}</p>
      )}
    </div>
  );

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(onSubmit);
      }}
      className="space-y-6"
    >
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('Basic Information')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="name"
            label={t('Supplier Name')}
            required
            placeholder="Enter supplier name"
          />
          
          <FormField
            name="name_ar"
            label={t('Supplier Name (Arabic)')}
            placeholder="اسم المورد"
          />
          
          <FormField
            name="contact_person"
            label={t('Contact Person')}
            placeholder="Contact person name"
          />
          
          <FormField
            name="email"
            label={t('Email Address')}
            type="email"
            required
            placeholder="supplier@example.com"
          />
          
          <FormField
            name="phone"
            label={t('Phone Number')}
            type="tel"
            placeholder="+1-234-567-8900"
          />
          
          <FormField
            name="tax_number"
            label={t('Tax Number')}
            placeholder="TAX123456789"
          />
        </div>
      </div>

      {/* Address Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('Address Information')}
        </h3>
        
        <FormField
          name="address"
          label={t('Address')}
          type="textarea"
          rows={3}
          placeholder="Enter full address"
        />
      </div>

      {/* Payment Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('Payment Information')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="payment_terms"
            label={t('Payment Terms')}
            type="select"
            required
            options={paymentTermsOptions}
          />
          
          <FormField
            name="bank_account"
            label={t('Bank Account')}
            placeholder="Bank account details"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <FormField
          name="notes"
          label={t('Notes')}
          type="textarea"
          rows={3}
          placeholder="Additional notes about the supplier"
        />
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading || isSubmitting}
          className="btn-secondary"
        >
          <X className="h-4 w-4 mr-2" />
          {t('cancel')}
        </button>
        
        <button
          type="submit"
          disabled={loading || isSubmitting}
          className="btn-primary"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading || isSubmitting ? t('saving...') : t('save')}
        </button>
      </div>
    </form>
  );
};

export default SupplierForm;