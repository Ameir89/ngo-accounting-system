// frontend/src/services/api.js - Enhanced with better error handling and integration
import axios from 'axios';
import toast from 'react-hot-toast';

// Environment-based configuration
const API_CONFIG = {
  development: {
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',
    timeout: 30000,
  },
  production: {
    baseURL: process.env.REACT_APP_API_URL || '/api/v1',
    timeout: 30000,
  }
};

const config = API_CONFIG[process.env.NODE_ENV] || API_CONFIG.development;

// Create axios instance with enhanced config
const api = axios.create({
  ...config,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Enhanced request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    config.metadata = { requestId: Date.now().toString() };
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 API Request:', {
        url: `${config.baseURL}${config.url}`,
        method: config.method.toUpperCase(),
        data: config.data,
        headers: config.headers
      });
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  (error) => {
    const { response, request, message } = error;
    
    // Handle different error types
    if (response) {
      // Server responded with error status
      const { status, data } = response;
      
      switch (status) {
        case 400:
          handleBadRequest(data);
          break;
        case 401:
          handleUnauthorized();
          break;
        case 403:
          handleForbidden(data);
          break;
        case 404:
          handleNotFound(data);
          break;
        case 422:
          handleValidationError(data);
          break;
        case 500:
          handleServerError(data);
          break;
        default:
          handleGenericError(data, status);
      }
      
      // Log error in development
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ API Error Response:', {
          url: response.config.url,
          status,
          data,
          message: data?.message
        });
      }
      
      return Promise.reject(createEnhancedError(response));
    } else if (request) {
      // Network error
      handleNetworkError();
      return Promise.reject(new Error('Network error - please check your connection'));
    } else {
      // Request setup error
      console.error('❌ Request Setup Error:', message);
      return Promise.reject(new Error('Request configuration error'));
    }
  }
);

// Error handlers
const handleBadRequest = (data) => {
  const message = data?.message || 'Invalid request data';
  toast.error(message);
};

const handleUnauthorized = () => {
  toast.error('Session expired. Please login again.');
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  // Delay redirect to allow toast to show
  setTimeout(() => {
    window.location.href = '/login';
  }, 1000);
};

const handleForbidden = (data) => {
  const message = data?.message || 'You do not have permission to perform this action';
  toast.error(message);
};

const handleNotFound = (data) => {
  const message = data?.message || 'Resource not found';
  toast.error(message);
};

const handleValidationError = (data) => {
  if (data?.errors && typeof data.errors === 'object') {
    // Handle field-specific validation errors
    const errorMessages = Object.values(data.errors).flat();
    errorMessages.forEach(msg => toast.error(msg));
  } else {
    toast.error(data?.message || 'Validation failed');
  }
};

const handleServerError = (data) => {
  const message = data?.message || 'Internal server error. Please try again later.';
  toast.error(message);
};

const handleGenericError = (data, status) => {
  const message = data?.message || `Server error (${status})`;
  toast.error(message);
};

const handleNetworkError = () => {
  toast.error('Network error - please check your internet connection');
};

const createEnhancedError = (response) => {
  const error = new Error(response.data?.message || 'API Error');
  error.response = response;
  error.status = response.status;
  error.data = response.data;
  return error;
};

// Enhanced API service with better structure
export const apiService = {
  // Authentication endpoints
  auth: {
    login: async (credentials) => {
      try {
        const response = await api.post('/auth/login', credentials);
        const { access_token, user } = response.data;
        
        // Store authentication data
        localStorage.setItem('authToken', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        
        return { token: access_token, user };
      } catch (error) {
        throw new Error(error.response?.data?.message || 'Login failed');
      }
    },
    // ADD THIS MISSING METHOD
    getMe: () => api.get('/auth/me'),
    logout: async () => {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        console.warn('Logout API call failed:', error);
      } finally {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    },
    
    refreshToken: () => api.post('/auth/refresh'),
    changePassword: (data) => api.post('/auth/change-password', data),
    forgotPassword: (data) => api.post('/auth/forgot-password', data),
    resetPassword: (data) => api.post('/auth/reset-password', data),
  },

  // Chart of Accounts
  accounts: {
    getAll: (params = {}) => api.get('/accounts', { params }),
    getById: (id) => api.get(`/accounts/${id}`),
    create: (data) => api.post('/accounts', data),
    update: (id, data) => api.put(`/accounts/${id}`, data),
    delete: (id) => api.delete(`/accounts/${id}`),
    getHierarchy: () => api.get('/accounts/hierarchy'),
    validateCode: (code) => api.post('/accounts/validate-code', { code }),
  },

  // Journal Entries
  journalEntries: {
    getAll: (params = {}) => api.get('/journal-entries', { params }),
    getById: (id) => api.get(`/journal-entries/${id}`),
    create: (data) => api.post('/journal-entries', data),
    update: (id, data) => api.put(`/journal-entries/${id}`, data),
    delete: (id) => api.delete(`/journal-entries/${id}`),
    post: (id) => api.post(`/journal-entries/${id}/post`),
    unpost: (id) => api.post(`/journal-entries/${id}/unpost`),
    duplicate: (id) => api.post(`/journal-entries/${id}/duplicate`),
  },

  // Suppliers
  suppliers: {
    getAll: (params = {}) => api.get('/suppliers', { params }),
    getById: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post('/suppliers', data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
    search: (query) => api.get('/suppliers/search', { params: { q: query } }),
  },

  // Grants
  grants: {
    getAll: (params = {}) => api.get('/grants', { params }),
    getById: (id) => api.get(`/grants/${id}`),
    create: (data) => api.post('/grants', data),
    update: (id, data) => api.put(`/grants/${id}`, data),
    delete: (id) => api.delete(`/grants/${id}`),
    getUtilization: (id) => api.get(`/grants/${id}/utilization`),
    generateReport: (id, params) => api.get(`/grants/${id}/report`, { params }),
  },

  // Fixed Assets
  fixedAssets: {
    getAll: (params = {}) => api.get('/fixed-assets', { params }),
    getById: (id) => api.get(`/fixed-assets/${id}`),
    create: (data) => api.post('/fixed-assets', data),
    update: (id, data) => api.put(`/fixed-assets/${id}`, data),
    delete: (id) => api.delete(`/fixed-assets/${id}`),
    calculateDepreciation: (id, params) => api.post(`/fixed-assets/${id}/calculate-depreciation`, params),
    getDepreciationHistory: (id) => api.get(`/fixed-assets/${id}/depreciation`),
  },

  // Cost Centers
  costCenters: {
    getAll: (params = {}) => api.get('/cost-centers', { params }),
    getById: (id) => api.get(`/cost-centers/${id}`),
    create: (data) => api.post('/cost-centers', data),
    update: (id, data) => api.put(`/cost-centers/${id}`, data),
    delete: (id) => api.delete(`/cost-centers/${id}`),
  },

  // Projects
  projects: {
    getAll: (params = {}) => api.get('/projects', { params }),
    getById: (id) => api.get(`/projects/${id}`),
    create: (data) => api.post('/projects', data),
    update: (id, data) => api.put(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
    getExpenses: (id, params) => api.get(`/projects/${id}/expenses`, { params }),
  },

  // Budgets
  budgets: {
    getAll: (params = {}) => api.get('/budgets', { params }),
    getById: (id) => api.get(`/budgets/${id}`),
    create: (data) => api.post('/budgets', data),
    update: (id, data) => api.put(`/budgets/${id}`, data),
    delete: (id) => api.delete(`/budgets/${id}`),
    getLines: (id) => api.get(`/budgets/${id}/lines`),
    getVarianceAnalysis: (id) => api.get(`/budgets/${id}/variance-analysis`),
  },

  // Reports
  reports: {
    trialBalance: (params = {}) => api.get('/reports/trial-balance', { params }),
    balanceSheet: (params = {}) => api.get('/reports/balance-sheet', { params }),
    incomeStatement: (params = {}) => api.get('/reports/income-statement', { params }),
    cashFlow: (params = {}) => api.get('/reports/cash-flow', { params }),
    export: (reportType, format, params) => api.get(`/reports/${reportType}/export/${format}`, { 
      params, 
      responseType: 'blob' 
    }),
  },

  // Dashboard
  dashboard: {
    getOverview: (params = {}) => api.get('/dashboard/overview', { params }),
    getFinancialSummary: (params = {}) => api.get('/dashboard/financial-summary', { params }),
    getRevenueChart: (params = {}) => api.get('/dashboard/charts/revenue-trend', { params }),
    getExpenseChart: (params = {}) => api.get('/dashboard/charts/expense-breakdown', { params }),
  },

  // Data Exchange
  dataExchange: {
    importAccounts: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/data-exchange/import/accounts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    exportTrialBalance: (params, format) => api.get('/data-exchange/export/trial-balance', {
      params: { ...params, format },
      responseType: 'blob'
    }),
    downloadTemplate: (type) => api.get(`/data-exchange/templates/${type}`, {
      responseType: 'blob'
    }),
    validateFile: (file, type) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_type', type);
      return api.post('/data-exchange/validate/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
  },

  // File operations
  files: {
    upload: (file, type = 'document') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      return api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    download: (fileId) => api.get(`/files/${fileId}/download`, { responseType: 'blob' }),
  },
};

// API health check
export const checkApiHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('API is not available');
  }
};

// Export the axios instance for direct use if needed
export default api;