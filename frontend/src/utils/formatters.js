// frontend/src/utils/formatters.js
import { format, isValid, parseISO } from 'date-fns';

/**
 * Format currency amounts with proper locale support
 */
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return currency === 'USD' ? '$0.00' : '0.00';
  }

  const numAmount = parseFloat(amount);
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  } catch (error) {
    // Fallback for unsupported currencies
    return `${numAmount.toFixed(2)} ${currency}`;
  }
};

/**
 * Format numbers with thousands separators
 */
export const formatNumber = (number, decimals = 0, locale = 'en-US') => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }

  const num = parseFloat(number);
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Format percentages
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  const num = parseFloat(value);
  return `${num.toFixed(decimals)}%`;
};

/**
 * Format dates in various formats
 */
export const formatDate = (date, formatString = 'MMM dd, yyyy') => {
  if (!date) return '';
  
  let dateObj = date;
  if (typeof date === 'string') {
    dateObj = parseISO(date);
  }
  
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, formatString);
};

/**
 * Format date and time
 */
export const formatDateTime = (date, formatString = 'MMM dd, yyyy HH:mm') => {
  return formatDate(date, formatString);
};

/**
 * Format time duration in human readable format
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0 seconds';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (secs > 0 && parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
  
  return parts.slice(0, 2).join(', ');
};

/**
 * Format file sizes
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Format account codes with consistent padding
 */
export const formatAccountCode = (code, length = 4) => {
  if (!code) return '';
  return code.toString().padStart(length, '0');
};