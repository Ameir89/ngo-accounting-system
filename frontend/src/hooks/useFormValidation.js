// frontend/src/hooks/useFormValidation.js

import { useCallback, useMemo, useState } from 'react';

const useFormValidation = (initialValues, validationRules, options = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { validateOnChange = true, validateOnBlur = true } = options;

  // Validation functions
  const validators = {
    required: (value) => {
      if (value === null || value === undefined || value === '') {
        return 'This field is required';
      }
      return null;
    },
    
    email: (value) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Please enter a valid email address';
      }
      return null;
    },
    
    minLength: (min) => (value) => {
      if (value && value.length < min) {
        return `Must be at least ${min} characters`;
      }
      return null;
    },
    
    maxLength: (max) => (value) => {
      if (value && value.length > max) {
        return `Must be no more than ${max} characters`;
      }
      return null;
    },
    
    pattern: (pattern, message) => (value) => {
      if (value && !pattern.test(value)) {
        return message || 'Invalid format';
      }
      return null;
    },
    
    custom: (validatorFn) => validatorFn,
    
    accountCode: (value) => {
      if (value && !/^[A-Za-z0-9]{3,20}$/.test(value)) {
        return 'Account code must be 3-20 alphanumeric characters';
      }
      return null;
    },
    
    amount: (value) => {
      if (value !== null && value !== undefined && value !== '') {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
          return 'Please enter a valid positive amount';
        }
        if (num > 999999999.99) {
          return 'Amount is too large';
        }
      }
      return null;
    },
    
    phone: (value) => {
      if (value && !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
        return 'Please enter a valid phone number';
      }
      return null;
    }
  };

  const validateField = useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return null;

    for (const rule of rules) {
      let validator;
      let ruleParams = [];

      if (typeof rule === 'string') {
        validator = validators[rule];
      } else if (typeof rule === 'function') {
        validator = rule;
      } else if (typeof rule === 'object') {
        const { type, ...params } = rule;
        validator = validators[type];
        ruleParams = Object.values(params);
      }

      if (validator) {
        const error = ruleParams.length > 0 
          ? validator(...ruleParams)(value)
          : validator(value);
        
        if (error) {
          return error;
        }
      }
    }

    return null;
  }, [validationRules]);

  const validateAllFields = useCallback(() => {
    const newErrors = {};
    
    Object.keys(validationRules).forEach(name => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validateField, validationRules]);

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    if (validateOnChange && touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validateField, validateOnChange, touched]);

  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
    
    if (validateOnBlur && isTouched) {
      const error = validateField(name, values[name]);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validateField, validateOnBlur, values]);

  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);
    
    // Mark all fields as touched
    const allTouched = Object.keys(validationRules).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    // Validate all fields
    const isValid = validateAllFields();
    
    if (isValid) {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }
    
    setIsSubmitting(false);
  }, [values, validationRules, validateAllFields]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0 && 
           Object.keys(touched).length > 0;
  }, [errors, touched]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    setValue,
    setFieldTouched,
    handleSubmit,
    reset,
    validateAllFields
  };
};

export default useFormValidation;