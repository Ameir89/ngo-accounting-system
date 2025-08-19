// frontend/src/utils/translations.js

/**
 * Additional translation keys for extended functionality
 */
export const additionalTranslations = {
  en: {
    // Error messages
    'validation.required': 'This field is required',
    'validation.email': 'Please enter a valid email address',
    'validation.phone': 'Please enter a valid phone number',
    'validation.minLength': 'Must be at least {min} characters long',
    'validation.maxLength': 'Must not exceed {max} characters',
    'validation.positiveNumber': 'Must be a positive number',
    'validation.invalidDate': 'Please enter a valid date',
    'validation.invalidDateRange': 'End date must be after start date',
    
    // Success messages
    'success.saved': 'Successfully saved',
    'success.deleted': 'Successfully deleted',
    'success.updated': 'Successfully updated',
    'success.created': 'Successfully created',
    'success.imported': 'Successfully imported',
    'success.exported': 'Successfully exported',
    
    // Confirmation messages
    'confirm.delete': 'Are you sure you want to delete this item?',
    'confirm.unsavedChanges': 'You have unsaved changes. Are you sure you want to leave?',
    'confirm.post': 'Are you sure you want to post this entry? This action cannot be undone.',
    
    // Common actions
    'action.viewAll': 'View All',
    'action.showMore': 'Show More',
    'action.showLess': 'Show Less',
    'action.refresh': 'Refresh',
    'action.duplicate': 'Duplicate',
    'action.archive': 'Archive',
    'action.restore': 'Restore',
    'action.download': 'Download',
    'action.upload': 'Upload',
    'action.preview': 'Preview',
    'action.print': 'Print',
    
    // Status indicators
    'status.connecting': 'Connecting...',
    'status.connected': 'Connected',
    'status.disconnected': 'Disconnected',
    'status.syncing': 'Syncing...',
    'status.synced': 'Synced',
    'status.pending': 'Pending',
    'status.processing': 'Processing...',
    'status.completed': 'Completed',
    'status.failed': 'Failed',
    
    // Time and dates
    'time.now': 'Now',
    'time.today': 'Today',
    'time.yesterday': 'Yesterday',
    'time.thisWeek': 'This Week',
    'time.thisMonth': 'This Month',
    'time.thisYear': 'This Year',
    'time.lastWeek': 'Last Week',
    'time.lastMonth': 'Last Month',
    'time.lastYear': 'Last Year',
  },
  
  ar: {
    // Error messages
    'validation.required': 'هذا الحقل مطلوب',
    'validation.email': 'يرجى إدخال عنوان بريد إلكتروني صحيح',
    'validation.phone': 'يرجى إدخال رقم هاتف صحيح',
    'validation.minLength': 'يجب أن يكون على الأقل {min} أحرف',
    'validation.maxLength': 'يجب ألا يتجاوز {max} حرفاً',
    'validation.positiveNumber': 'يجب أن يكون رقماً موجباً',
    'validation.invalidDate': 'يرجى إدخال تاريخ صحيح',
    'validation.invalidDateRange': 'يجب أن يكون تاريخ النهاية بعد تاريخ البداية',
    
    // Success messages
    'success.saved': 'تم الحفظ بنجاح',
    'success.deleted': 'تم الحذف بنجاح',
    'success.updated': 'تم التحديث بنجاح',
    'success.created': 'تم الإنشاء بنجاح',
    'success.imported': 'تم الاستيراد بنجاح',
    'success.exported': 'تم التصدير بنجاح',
    
    // Confirmation messages
    'confirm.delete': 'هل أنت متأكد من حذف هذا العنصر؟',
    'confirm.unsavedChanges': 'لديك تغييرات غير محفوظة. هل أنت متأكد من المغادرة؟',
    'confirm.post': 'هل أنت متأكد من ترحيل هذا القيد؟ لا يمكن التراجع عن هذا الإجراء.',
    
    // Common actions
    'action.viewAll': 'عرض الكل',
    'action.showMore': 'عرض المزيد',
    'action.showLess': 'عرض أقل',
    'action.refresh': 'تحديث',
    'action.duplicate': 'نسخ',
    'action.archive': 'أرشفة',
    'action.restore': 'استعادة',
    'action.download': 'تحميل',
    'action.upload': 'رفع',
    'action.preview': 'معاينة',
    'action.print': 'طباعة',
    
    // Status indicators
    'status.connecting': 'جاري الاتصال...',
    'status.connected': 'متصل',
    'status.disconnected': 'منقطع',
    'status.syncing': 'جاري المزامنة...',
    'status.synced': 'مُزامن',
    'status.pending': 'معلق',
    'status.processing': 'جاري المعالجة...',
    'status.completed': 'مكتمل',
    'status.failed': 'فشل',
    
    // Time and dates
    'time.now': 'الآن',
    'time.today': 'اليوم',
    'time.yesterday': 'أمس',
    'time.thisWeek': 'هذا الأسبوع',
    'time.thisMonth': 'هذا الشهر',
    'time.thisYear': 'هذه السنة',
    'time.lastWeek': 'الأسبوع الماضي',
    'time.lastMonth': 'الشهر الماضي',
    'time.lastYear': 'السنة الماضية',
  }
};

/**
 * Format translation string with parameters
 */
export const formatTranslation = (template, params = {}) => {
  if (!template) return '';
  
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
};

/**
 * Get relative time string
 */
export const getRelativeTime = (date, locale = 'en') => {
  if (!date) return '';
  
  const now = new Date();
  const targetDate = new Date(date);
  const diffMs = now - targetDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return locale === 'ar' ? 'الآن' : 'now';
  if (diffMins < 60) return locale === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
  if (diffHours < 24) return locale === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
  if (diffDays < 7) return locale === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  
  return formatDate(date, 'MMM dd, yyyy');
};

/**
 * Pluralization helper
 */
export const pluralize = (count, singular, plural, locale = 'en') => {
  if (locale === 'ar') {
    // Arabic pluralization rules are complex, this is a simplified version
    if (count === 0) return `لا ${plural}`;
    if (count === 1) return `${singular} واحد`;
    if (count === 2) return `${singular}ان`;
    if (count <= 10) return `${count} ${plural}`;
    return `${count} ${singular}`;
  }
  
  // English pluralization
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
};