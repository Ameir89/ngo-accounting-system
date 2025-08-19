// frontend/src/utils/validators.js

/**
 * Email validation
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Phone number validation (international format)
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return phoneRegex.test(cleanPhone);
};

/**
 * Required field validation
 */
export const isRequired = (value) => {
  return value !== null && value !== undefined && value !== '';
};

/**
 * Minimum length validation
 */
export const hasMinLength = (value, minLength) => {
  return value && value.length >= minLength;
};

/**
 * Maximum length validation
 */
export const hasMaxLength = (value, maxLength) => {
  return !value || value.length <= maxLength;
};

/**
 * Number validation
 */
export const isValidNumber = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * Positive number validation
 */
export const isPositiveNumber = (value) => {
  const num = parseFloat(value);
  return isValidNumber(num) && num > 0;
};

/**
 * Decimal validation with specific decimal places
 */
export const isValidDecimal = (value, decimalPlaces = 2) => {
  const regex = new RegExp(`^\\d+(\\.\\d{1,${decimalPlaces}})?$`);
  return regex.test(value);
};

/**
 * Account code validation
 */
export const isValidAccountCode = (code) => {
  const codeRegex = /^[A-Za-z0-9]{3,20}$/;
  return codeRegex.test(code);
};

/**
 * Password strength validation
 */
export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, feedback: [] };
  
  let score = 0;
  const feedback = [];
  
  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password should be at least 8 characters long');
  }
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');
  
  if (/\d/.test(password)) score += 1;
  else feedback.push('Include numbers');
  
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else feedback.push('Include special characters');
  
  // Additional strength indicators
  if (password.length >= 12) score += 1;
  if (!/(.)\1{2,}/.test(password)) score += 1; // No repeated characters
  if (!/123|abc|qwe|password/i.test(password)) score += 1; // No common patterns
  
  let strength = 'weak';
  if (score >= 6) strength = 'strong';
  else if (score >= 4) strength = 'medium';
  
  return { score, strength, feedback };
};

/**
 * URL validation
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Date validation
 */
export const isValidDate = (date) => {
  if (!date) return false;
  
  let dateObj = date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  }
  
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

/**
 * Date range validation
 */
export const isValidDateRange = (startDate, endDate) => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return start <= end;
};

/**
 * Tax number validation (generic format)
 */
export const isValidTaxNumber = (taxNumber) => {
  const taxRegex = /^[A-Z0-9\-]{5,20}$/;
  return taxRegex.test(taxNumber);
};

