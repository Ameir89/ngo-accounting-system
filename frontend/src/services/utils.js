// frontend/src/services/utils.js
import { format, isValid, parseISO } from 'date-fns';

// Date formatting utilities
export const dateUtils = {
  format: (date, formatString = 'yyyy-MM-dd') => {
    if (!date) return '';
    
    let dateObj = date;
    if (typeof date === 'string') {
      dateObj = parseISO(date);
    }
    
    if (!isValid(dateObj)) return '';
    
    return format(dateObj, formatString);
  },

  formatDisplay: (date) => {
    return dateUtils.format(date, 'MMM dd, yyyy');
  },

  formatDateTime: (date) => {
    return dateUtils.format(date, 'MMM dd, yyyy HH:mm');
  },

  getCurrentDate: () => {
    return format(new Date(), 'yyyy-MM-dd');
  },

  isDateInRange: (date, startDate, endDate) => {
    const checkDate = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return checkDate >= start && checkDate <= end;
  },
};

// Number formatting utilities
export const numberUtils = {
  formatCurrency: (amount, currency = 'USD') => {
    if (amount === null || amount === undefined) return '';
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '';
    
    const formatters = {
      USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
      EUR: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }),
      AED: new Intl.NumberFormat('ar-AE', { style: 'currency', currency: 'AED' }),
    };
    
    return formatters[currency]?.format(numAmount) || `${numAmount.toFixed(2)} ${currency}`;
  },

  formatNumber: (number, decimals = 2) => {
    if (number === null || number === undefined) return '';
    
    const num = parseFloat(number);
    if (isNaN(num)) return '';
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  },

  parseNumber: (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  },
};

// Validation utilities
export const validators = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  required: (value) => {
    return value !== null && value !== undefined && value !== '';
  },

  minLength: (value, min) => {
    return value && value.length >= min;
  },

  maxLength: (value, max) => {
    return !value || value.length <= max;
  },

  isPositive: (value) => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  },

  isDecimal: (value, decimals = 2) => {
    const regex = new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
    return regex.test(value);
  },

  accountCode: (code) => {
    const codeRegex = /^[A-Za-z0-9]{3,20}$/;
    return codeRegex.test(code);
  },
};

// Local storage utilities
export const storageUtils = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  },

  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  },
};

// Export utilities
export const exportUtils = {
  downloadJson: (data, filename) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  downloadCsv: (data, filename) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};