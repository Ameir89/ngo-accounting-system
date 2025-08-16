// frontend/src/contexts/LanguageContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Translation data
const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    generalLedger: 'General Ledger',
    chartOfAccounts: 'Chart of Accounts',
    journalEntries: 'Journal Entries',
    costCenters: 'Cost Centers',
    projects: 'Projects',
    finance: 'Finance',
    budgets: 'Budgets',
    grants: 'Grants & Funding',
    suppliers: 'Suppliers',
    receipts: 'Receipts',
    fixedAssets: 'Fixed Assets',
    reports: 'Reports',
    settings: 'Settings',
    
    // Common actions
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    submit: 'Submit',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    view: 'View',
    actions: 'Actions',
    
    // Authentication
    login: 'Login',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    email: 'Email',
    
    // Common fields
    name: 'Name',
    description: 'Description',
    date: 'Date',
    amount: 'Amount',
    status: 'Status',
    type: 'Type',
    code: 'Code',
    active: 'Active',
    inactive: 'Inactive',
    
    // Messages
    loading: 'Loading...',
    noData: 'No data available',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    confirm: 'Confirm',
    
    // Dashboard
    totalCash: 'Total Cash',
    activeProjects: 'Active Projects',
    recentEntries: 'Recent Entries',
    financialSummary: 'Financial Summary',
    
    // Journal Entries
    entryNumber: 'Entry Number',
    entryDate: 'Entry Date',
    totalDebit: 'Total Debit',
    totalCredit: 'Total Credit',
    posted: 'Posted',
    draft: 'Draft',
    
    // Accounts
    accountCode: 'Account Code',
    accountName: 'Account Name',
    accountType: 'Account Type',
    parentAccount: 'Parent Account',
    
    // Account types
    asset: 'Asset',
    liability: 'Liability',
    equity: 'Equity',
    revenue: 'Revenue',
    expense: 'Expense',
  },
  ar: {
    // Navigation
    dashboard: 'لوحة التحكم',
    generalLedger: 'دفتر الأستاذ العام',
    chartOfAccounts: 'دليل الحسابات',
    journalEntries: 'قيود اليومية',
    costCenters: 'مراكز التكلفة',
    projects: 'المشاريع',
    finance: 'المالية',
    budgets: 'الميزانيات',
    grants: 'المنح والتمويل',
    suppliers: 'الموردين',
    receipts: 'الإيصالات',
    fixedAssets: 'الأصول الثابتة',
    reports: 'التقارير',
    settings: 'الإعدادات',
    
    // Common actions
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    submit: 'إرسال',
    search: 'بحث',
    filter: 'تصفية',
    export: 'تصدير',
    import: 'استيراد',
    view: 'عرض',
    actions: 'الإجراءات',
    
    // Authentication
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    email: 'البريد الإلكتروني',
    
    // Common fields
    name: 'الاسم',
    description: 'الوصف',
    date: 'التاريخ',
    amount: 'المبلغ',
    status: 'الحالة',
    type: 'النوع',
    code: 'الرمز',
    active: 'نشط',
    inactive: 'غير نشط',
    
    // Messages
    loading: 'جاري التحميل...',
    noData: 'لا توجد بيانات',
    error: 'خطأ',
    success: 'نجح',
    warning: 'تحذير',
    confirm: 'تأكيد',
    
    // Dashboard
    totalCash: 'إجمالي النقد',
    activeProjects: 'المشاريع النشطة',
    recentEntries: 'القيود الأخيرة',
    financialSummary: 'الملخص المالي',
    
    // Journal Entries
    entryNumber: 'رقم القيد',
    entryDate: 'تاريخ القيد',
    totalDebit: 'إجمالي المدين',
    totalCredit: 'إجمالي الدائن',
    posted: 'مرحل',
    draft: 'مسودة',
    
    // Accounts
    accountCode: 'رمز الحساب',
    accountName: 'اسم الحساب',
    accountType: 'نوع الحساب',
    parentAccount: 'الحساب الأب',
    
    // Account types
    asset: 'أصل',
    liability: 'التزام',
    equity: 'حقوق الملكية',
    revenue: 'إيراد',
    expense: 'مصروف',
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('language') || 'en';
    setLanguage(savedLanguage);
    setIsRTL(savedLanguage === 'ar');
    
    // Update document direction
    document.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = savedLanguage;
  }, []);

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    setIsRTL(newLanguage === 'ar');
    localStorage.setItem('language', newLanguage);
    
    // Update document direction
    document.dir = newLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLanguage;
  };

  const t = (key, defaultValue = key) => {
    return translations[language]?.[key] || defaultValue;
  };

  const formatNumber = (number) => {
    if (language === 'ar') {
      return new Intl.NumberFormat('ar-SA').format(number);
    }
    return new Intl.NumberFormat('en-US').format(number);
  };

  const formatCurrency = (amount, currency = 'USD') => {
    const locale = language === 'ar' ? 'ar-SA' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (date) => {
    const locale = language === 'ar' ? 'ar-SA' : 'en-US';
    return new Intl.DateTimeFormat(locale).format(new Date(date));
  };

  const value = {
    language,
    isRTL,
    changeLanguage,
    t,
    formatNumber,
    formatCurrency,
    formatDate,
    translations: translations[language],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;