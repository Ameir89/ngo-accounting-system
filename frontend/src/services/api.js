// frontend/src/services/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

// -----------------------------
// Environment-based configuration
// -----------------------------
const API_CONFIG = {
  development: {
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',
    timeout: 30000,
  },
  production: {
    baseURL: process.env.REACT_APP_API_URL || '/api/v1',
    timeout: 30000,
  },
};

const config = API_CONFIG[process.env.NODE_ENV] || API_CONFIG.development;

// -----------------------------
// Axios instance
// -----------------------------
const api = axios.create({
  ...config,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// -----------------------------
// Request interceptor: Add JWT
// -----------------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    console.log('Ameir Token', token);
    //  const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.metadata = { requestId: Date.now().toString() };

    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 API Request:', {
        url: `${config.baseURL}${config.url}`,
        method: config.method.toUpperCase(),
        data: config.data,
      });
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// -----------------------------
// Response interceptor: Handle 401 & refresh token
// -----------------------------
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const { response } = error;

    if (response) {
      const { status, data } = response;

      // -----------------------------
      // Handle 401 Unauthorized (token expired)
      // -----------------------------
      if (status === 401 && !originalRequest._retry) {
        if (!isRefreshing) {
          isRefreshing = true;
          originalRequest._retry = true;

          try {
            const refreshRes = await api.post('/auth/refresh');
            const { access_token } = refreshRes.data;
            localStorage.setItem('authToken', access_token);
            api.defaults.headers['Authorization'] = `Bearer ${access_token}`;
            processQueue(null, access_token);
            return api(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            toast.error('Session expired. Please login again.');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject: (err) => reject(err),
          });
        });
      }

      // -----------------------------
      // Other status codes
      // -----------------------------
      switch (status) {
        case 400:
          toast.error(data?.message || 'Invalid request data');
          break;
        case 403:
          toast.error(data?.message || 'You do not have permission');
          break;
        case 404:
          toast.error(data?.message || 'Resource not found');
          break;
        case 422:
          if (data?.errors && typeof data.errors === 'object') {
            Object.values(data.errors).flat().forEach((msg) => toast.error(msg));
          } else {
            toast.error(data?.message || 'Validation failed');
          }
          break;
        case 500:
          toast.error(data?.message || 'Internal server error');
          break;
        default:
          toast.error(data?.message || `Error (${status})`);
      }

      return Promise.reject(error);
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(new Error('Network error'));
    } else {
      return Promise.reject(error);
    }
  }
);

// -----------------------------
// Auth API helpers
// -----------------------------
export const apiService = {
  auth: {
    login: async (credentials) => {
      const res = await api.post('/auth/login', credentials);
      const { access_token, user } = res.data;
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      return { token: access_token, user };
    },
    logout: async () => {
      try {
        await api.post('/auth/logout');
      } catch {}
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    },
    getMe: () => api.get('/auth/me'),
    refreshToken: () => api.post('/auth/refresh'),
  },

  // Dashboard example
  dashboard: {
    getSummary: (params = {}) => api.get('/dashboard/overview', { params }),
    getFinancialSummary: (params = {}) => api.get('/dashboard/financial-summary', { params }),
    getRevenueChart: (params = {}) => api.get('/dashboard/charts/revenue-trend', { params }),
    getExpenseChart: (params = {}) => api.get('/dashboard/charts/expense-breakdown', { params }),
    getComprehensiveData: async (params = {}) => {
      const results = await Promise.allSettled([
        api.get('/dashboard/overview', { params }),
        api.get('/dashboard/financial-summary', { params }),
        api.get('/dashboard/charts/revenue-trend', { params }),
        api.get('/dashboard/charts/expense-breakdown', { params }),
      ]);
      return {
        overview: results[0].status === 'fulfilled' ? results[0].value.data : null,
        financialSummary: results[1].status === 'fulfilled' ? results[1].value.data : null,
        revenueChart: results[2].status === 'fulfilled' ? results[2].value.data : null,
        expenseChart: results[3].status === 'fulfilled' ? results[3].value.data : null,
      };
    },
  },
};

export default api;
