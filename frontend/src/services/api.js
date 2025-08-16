// frontend/src/services/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    if (response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    if (response?.status === 403) {
      toast.error('You do not have permission to perform this action');
    } else if (response?.status === 500) {
      toast.error('Internal server error. Please try again later.');
    } else if (response?.data?.message) {
      toast.error(response.data.message);
    } else if (error.message) {
      toast.error(error.message);
    }
    
    return Promise.reject(error);
  }
);

// API service methods
export const apiService = {
  // Authentication
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getMe: () => api.get('/auth/me'),
    changePassword: (passwords) => api.post('/auth/change-password', passwords),
  },

  // Accounts
  accounts: {
    getAll: (params = {}) => api.get('/accounts', { params }),
    getById: (id) => api.get(`/accounts/${id}`),
    create: (data) => api.post('/accounts', data),
    update: (id, data) => api.put(`/accounts/${id}`, data),
    delete: (id) => api.delete(`/accounts/${id}`),
    getHierarchy: () => api.get('/accounts/hierarchy'),
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
  },

  // Suppliers
  suppliers: {
    getAll: (params = {}) => api.get('/suppliers', { params }),
    getById: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post('/suppliers', data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
    createPurchaseOrder: (supplierId, data) => api.post(`/suppliers/${supplierId}/purchase-orders`, data),
  },

  // Grants
  grants: {
    getAll: (params = {}) => api.get('/grants', { params }),
    getById: (id) => api.get(`/grants/${id}`),
    create: (data) => api.post('/grants', data),
    update: (id, data) => api.put(`/grants/${id}`, data),
    delete: (id) => api.delete(`/grants/${id}`),
    getUtilization: (id) => api.get(`/grants/${id}/utilization`),
  },

  // Fixed Assets
  fixedAssets: {
    getAll: (params = {}) => api.get('/fixed-assets', { params }),
    getById: (id) => api.get(`/fixed-assets/${id}`),
    create: (data) => api.post('/fixed-assets', data),
    update: (id, data) => api.put(`/fixed-assets/${id}`, data),
    delete: (id) => api.delete(`/fixed-assets/${id}`),
  },

  // Reports
  reports: {
    trialBalance: (params = {}) => api.get('/reports/trial-balance', { params }),
    balanceSheet: (params = {}) => api.get('/reports/balance-sheet', { params }),
    incomeStatement: (params = {}) => api.get('/reports/income-statement', { params }),
    cashFlow: (params = {}) => api.get('/reports/cash-flow', { params }),
  },

  // Business Logic
  business: {
    processDepreciation: (data = {}) => api.post('/business/depreciation/process', data),
    calculateDepreciation: (data) => api.post('/business/depreciation/calculate', data),
    getAnalyticsDashboard: () => api.get('/business/analytics/dashboard'),
  },

  // Dashboard
  dashboard: {
    getSummary: () => api.get('/dashboard/summary'),
  },

  // Cost Centers
  costCenters: {
    getAll: () => api.get('/cost-centers'),
    create: (data) => api.post('/cost-centers', data),
  },

  // Projects
  projects: {
    getAll: () => api.get('/projects'),
    create: (data) => api.post('/projects', data),
  },

  // Budgets
  budgets: {
    getAll: (params = {}) => api.get('/budgets', { params }),
    create: (data) => api.post('/budgets', data),
  },
};

export default api;