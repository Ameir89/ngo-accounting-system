// frontend/src/services/api.js - Enhanced with Auto Token Refresh
import axios from 'axios';
import toast from 'react-hot-toast';

// -----------------------------
// Token Management Utilities
// -----------------------------
const TOKEN_STORAGE_KEYS = {
  ACCESS_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  TOKEN_EXPIRY: 'tokenExpiry',
};

class TokenManager {
  constructor() {
    this.refreshPromise = null;
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  // Get tokens from storage
  getAccessToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
  }

  getRefreshToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
  }

  getTokenExpiry() {
    const expiry = localStorage.getItem(TOKEN_STORAGE_KEYS.TOKEN_EXPIRY);
    return expiry ? parseInt(expiry) : null;
  }

  // Set tokens in storage
  setTokens(accessToken, refreshToken = null, expiresIn = null) {
    localStorage.setItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    
    if (refreshToken) {
      localStorage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    
    if (expiresIn) {
      // Calculate expiry time (current time + expires_in - 5 minute buffer)
      const expiryTime = Date.now() + (expiresIn * 1000) - (5 * 60 * 1000);
      localStorage.setItem(TOKEN_STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
    }
  }

  // Clear all tokens
  clearTokens() {
    localStorage.removeItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(TOKEN_STORAGE_KEYS.TOKEN_EXPIRY);
    localStorage.removeItem('user');
  }

  // Check if access token is expired or expiring soon
  isTokenExpired() {
    const expiry = this.getTokenExpiry();
    if (!expiry) return false;
    
    return Date.now() >= expiry;
  }

  // Process the refresh queue
  processQueue(error, token = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  // Add request to queue during refresh
  addToQueue(resolve, reject) {
    this.failedQueue.push({ resolve, reject });
  }
}

// Create token manager instance
const tokenManager = new TokenManager();

// -----------------------------
// Axios Configuration
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

// Create Axios instance
const api = axios.create({
  ...config,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// -----------------------------
// Request Interceptor
// -----------------------------
api.interceptors.request.use(
  async (config) => {
    // Add access token to requests
    const accessToken = tokenManager.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Check if token is expired and refresh proactively
    if (accessToken && tokenManager.isTokenExpired() && !tokenManager.isRefreshing) {
      try {
        console.log('🔄 Token is expiring soon, refreshing proactively...');
        await refreshAccessToken();
        
        // Update the request with new token
        const newToken = tokenManager.getAccessToken();
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
        }
      } catch (error) {
        console.warn('⚠️ Proactive token refresh failed, proceeding with current token');
      }
    }

    // Add request metadata for debugging
    config.metadata = { 
      requestId: Date.now().toString(),
      startTime: Date.now()
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 API Request:', {
        url: `${config.baseURL}${config.url}`,
        method: config.method.toUpperCase(),
        headers: { ...config.headers, Authorization: config.headers.Authorization ? '[HIDDEN]' : undefined },
      });
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// -----------------------------
// Response Interceptor with Token Refresh Logic
// -----------------------------
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      const duration = Date.now() - response.config.metadata?.startTime;
      console.log('✅ API Response:', {
        url: response.config.url,
        status: response.status,
        duration: `${duration}ms`,
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      console.error('🌐 Network Error:', error.message);
      toast.error('Network error. Please check your connection.');
      return Promise.reject(new Error('Network error'));
    }

    const { status, data } = error.response;

    // -----------------------------
    // Handle 401 Unauthorized with Token Refresh
    // -----------------------------
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (tokenManager.isRefreshing) {
        return new Promise((resolve, reject) => {
          tokenManager.addToQueue(
            (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            (err) => reject(err)
          );
        });
      }

      // Start refresh process
      tokenManager.isRefreshing = true;

      try {
        console.log('🔄 Access token expired, attempting refresh...');
        const newAccessToken = await refreshAccessToken();
        
        if (newAccessToken) {
          // Update the failed request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          // Process queued requests
          tokenManager.processQueue(null, newAccessToken);
          
          // Retry the original request
          return api(originalRequest);
        } else {
          throw new Error('No access token received');
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        
        // Process queue with error
        tokenManager.processQueue(refreshError, null);
        
        // Clear tokens and redirect to login
        handleAuthFailure('token_refresh_failed');
        
        return Promise.reject(refreshError);
      } finally {
        tokenManager.isRefreshing = false;
      }
    }

    // -----------------------------
    // Handle other status codes
    // -----------------------------
    handleApiError(status, data);
    return Promise.reject(error);
  }
);

// -----------------------------
// Token Refresh Function
// -----------------------------
async function refreshAccessToken() {
  const refreshToken = tokenManager.getRefreshToken();
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    // Create a new axios instance to avoid infinite loops
    const refreshApi = axios.create({
      baseURL: config.baseURL,
      timeout: 10000,
    });

    const response = await refreshApi.post('/auth/refresh', {
      refresh_token: refreshToken
    });

    const { access_token, refresh_token: newRefreshToken, expires_in } = response.data;

    if (!access_token) {
      throw new Error('Invalid refresh response: no access token');
    }

    // Store new tokens
    tokenManager.setTokens(access_token, newRefreshToken, expires_in);
    
    console.log('✅ Token refreshed successfully');
    
    // Log security event
    logSecurityEvent('TOKEN_REFRESHED', { timestamp: new Date().toISOString() });
    
    return access_token;
  } catch (error) {
    console.error('❌ Refresh token request failed:', error);
    
    // Log security event
    logSecurityEvent('TOKEN_REFRESH_FAILED', { 
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}

// -----------------------------
// Error Handling Functions
// -----------------------------
function handleApiError(status, data) {
  let message = data?.message || 'An error occurred';

  switch (status) {
    case 400:
      toast.error(message || 'Invalid request data');
      break;
    case 403:
      toast.error(message || 'You do not have permission');
      break;
    case 404:
      toast.error(message || 'Resource not found');
      break;
    case 422:
      if (data?.errors && typeof data.errors === 'object') {
        // Handle validation errors
        Object.values(data.errors).flat().forEach((msg) => toast.error(msg));
      } else {
        toast.error(message || 'Validation failed');
      }
      break;
    case 429:
      toast.error('Too many requests. Please try again later.');
      break;
    case 500:
      toast.error(message || 'Internal server error');
      break;
    case 503:
      toast.error('Service temporarily unavailable');
      break;
    default:
      if (status >= 500) {
        toast.error('Server error. Please try again later.');
      } else if (status >= 400) {
        toast.error(message);
      }
  }
}

function handleAuthFailure(reason) {
  console.log(`🚪 Authentication failed: ${reason}`);
  
  // Log security event
  logSecurityEvent('AUTH_FAILURE', { 
    reason, 
    timestamp: new Date().toISOString() 
  });
  
  // Clear all auth data
  tokenManager.clearTokens();
  
  // Show user-friendly message
  toast.error('Session expired. Please login again.');
  
  // Redirect to login after a short delay
  setTimeout(() => {
    window.location.href = '/login';
  }, 1000);
}

function logSecurityEvent(eventType, details) {
  try {
    const events = JSON.parse(localStorage.getItem('securityEvents') || '[]');
    events.push({
      eventType,
      ...details,
      userAgent: navigator.userAgent
    });
    
    // Keep only last 100 events
    localStorage.setItem('securityEvents', JSON.stringify(events.slice(-100)));
  } catch (error) {
    console.warn('Failed to log security event:', error);
  }
}

// -----------------------------
// Enhanced API Service
// -----------------------------
export const apiService = {
  // Auth endpoints
  auth: {
    login: async (credentials) => {
      const response = await api.post('/auth/login', credentials);
      const { access_token, refresh_token, expires_in, user } = response.data;
      
      // Store tokens
      tokenManager.setTokens(access_token, refresh_token, expires_in);
      localStorage.setItem('user', JSON.stringify(user));
      
      logSecurityEvent('LOGIN_SUCCESS', { username: credentials.username });
      
      return { token: access_token, user };
    },
    
    logout: async () => {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        console.warn('Logout API call failed:', error);
      }
      
      logSecurityEvent('LOGOUT', { reason: 'user_initiated' });
      tokenManager.clearTokens();
    },
    
    refreshToken: async () => {
      return refreshAccessToken();
    },
    
    getMe: () => api.get('/auth/me'),
    changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
    forgotPassword: (data) => api.post('/auth/forgot-password', data),
    resetPassword: (data) => api.post('/auth/reset-password', data),
  },

  // Dashboard endpoints
  dashboard: {
    getOverview: (params = {}) => api.get('/dashboard/overview', { params }),
    getFinancialSummary: (params = {}) => api.get('/dashboard/financial-summary', { params }),
    getSummary: (params = {}) => api.get('/dashboard/summary', { params }),
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
        charts: {
          revenue: results[2].status === 'fulfilled' ? results[2].value.data : null,
          expenses: results[3].status === 'fulfilled' ? results[3].value.data : null,
        },
      };
    },
  },

  // Journal Entries
  journalEntries: {
    getAll: (params = {}) => api.get('/journal-entries', { params }),
    getById: (id) => api.get(`/journal-entries/${id}`),
    create: (data) => api.post('/journal-entries', data),
    update: (id, data) => api.put(`/journal-entries/${id}`, data),
    delete: (id) => api.delete(`/journal-entries/${id}`),
    post: (id) => api.post(`/journal-entries/${id}/post`),
  },

  // Accounts
  accounts: {
    getAll: (params = {}) => api.get('/accounts', { params }),
    getById: (id) => api.get(`/accounts/${id}`),
    getHierarchy: () => api.get('/accounts/hierarchy'),
    create: (data) => api.post('/accounts', data),
    update: (id, data) => api.put(`/accounts/${id}`, data),
    delete: (id) => api.delete(`/accounts/${id}`),
  },

  // Suppliers
  suppliers: {
    getAll: (params = {}) => api.get('/suppliers', { params }),
    getById: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post('/suppliers', data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
  },

  // Grants
  grants: {
    getAll: (params = {}) => api.get('/grants', { params }),
    getById: (id) => api.get(`/grants/${id}`),
    getUtilization: (id) => api.get(`/grants/${id}/utilization`),
    create: (data) => api.post('/grants', data),
    update: (id, data) => api.put(`/grants/${id}`, data),
    delete: (id) => api.delete(`/grants/${id}`),
  },

  // Fixed Assets
  fixedAssets: {
    getAll: (params = {}) => api.get('/fixed-assets', { params }),
    getById: (id) => api.get(`/fixed-assets/${id}`),
    create: (data) => api.post('/fixed-assets', data),
    update: (id, data) => api.put(`/fixed-assets/${id}`, data),
    delete: (id) => api.delete(`/fixed-assets/${id}`),
  },

  // Cost Centers & Projects
  costCenters: {
    getAll: (params = {}) => api.get('/cost-centers', { params }),
    getById: (id) => api.get(`/cost-centers/${id}`),
    create: (data) => api.post('/cost-centers', data),
    update: (id, data) => api.put(`/cost-centers/${id}`, data),
    delete: (id) => api.delete(`/cost-centers/${id}`),
  },

  projects: {
    getAll: (params = {}) => api.get('/projects', { params }),
    getById: (id) => api.get(`/projects/${id}`),
    getExpenses: (id, params = {}) => api.get(`/projects/${id}/expenses`, { params }),
    create: (data) => api.post('/projects', data),
    update: (id, data) => api.put(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
  },

  // Budgets
  budgets: {
    getAll: (params = {}) => api.get('/budgets', { params }),
    getById: (id) => api.get(`/budgets/${id}`),
    getLines: (budgetId) => api.get(`/budgets/${budgetId}/lines`),
    getVarianceAnalysis: (budgetId) => api.get(`/budgets/${budgetId}/variance`),
    create: (data) => api.post('/budgets', data),
    update: (id, data) => api.put(`/budgets/${id}`, data),
    delete: (id) => api.delete(`/budgets/${id}`),
  },

  // Reports
  reports: {
    trialBalance: (params = {}) => api.get('/reports/trial-balance', { params }),
    balanceSheet: (params = {}) => api.get('/reports/balance-sheet', { params }),
    incomeStatement: (params = {}) => api.get('/reports/income-statement', { params }),
    cashFlow: (params = {}) => api.get('/reports/cash-flow', { params }),
  },

  // Health check
  health: {
    check: () => api.get('/health'),
  },
};

// -----------------------------
// Utility Functions
// -----------------------------
export const tokenUtils = {
  getAccessToken: () => tokenManager.getAccessToken(),
  getRefreshToken: () => tokenManager.getRefreshToken(),
  isTokenExpired: () => tokenManager.isTokenExpired(),
  clearTokens: () => tokenManager.clearTokens(),
  refreshToken: () => refreshAccessToken(),
};

// Setup proactive token refresh (optional)
export const setupProactiveRefresh = () => {
  setInterval(() => {
    if (tokenManager.isTokenExpired() && tokenManager.getRefreshToken()) {
      console.log('🔄 Starting proactive token refresh...');
      refreshAccessToken().catch(error => {
        console.warn('⚠️ Proactive refresh failed:', error);
      });
    }
  }, 60000); // Check every minute
};

export default api;