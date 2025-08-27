// frontend/src/services/api.js - Enhanced Token Refresh Implementation
import axios from "axios";
import toast from "react-hot-toast";

// -----------------------------
// Enhanced Token Management
// -----------------------------
class TokenManager {
  constructor() {
    this.refreshPromise = null;
    this.isRefreshing = false;
    this.failedQueue = [];
    this.tokenRefreshBuffer = 5 * 60 * 1000; // 5 minutes buffer before expiry
  }

  // Storage keys
  get STORAGE_KEYS() {
    return {
      ACCESS_TOKEN: "authToken",
      REFRESH_TOKEN: "refreshToken",
      TOKEN_EXPIRY: "tokenExpiry",
      USER: "user",
    };
  }

  // Get tokens from storage
  getAccessToken() {
    return localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
  }

  getRefreshToken() {
    return localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);
  }

  getTokenExpiry() {
    const expiry = localStorage.getItem(this.STORAGE_KEYS.TOKEN_EXPIRY);
    return expiry ? parseInt(expiry, 10) : null;
  }

  // Set tokens with automatic expiry calculation
  setTokens(accessToken, refreshToken = null, expiresIn = null) {
    if (!accessToken) {
      console.error("❌ Cannot set empty access token");
      return false;
    }

    localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, accessToken);

    if (refreshToken) {
      localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }

    if (expiresIn) {
      // Calculate expiry time with buffer
      const expiryTime =
        Date.now() + expiresIn * 1000 - this.tokenRefreshBuffer;
      localStorage.setItem(
        this.STORAGE_KEYS.TOKEN_EXPIRY,
        expiryTime.toString()
      );
    }

    console.log("✅ Tokens stored successfully");
    return true;
  }

  // Clear all tokens and user data
  clearTokens() {
    const keys = Object.values(this.STORAGE_KEYS);
    keys.forEach((key) => localStorage.removeItem(key));

    // Clear additional auth-related items
    localStorage.removeItem("securityEvents");

    console.log("🧹 All tokens cleared");
  }

  // Check if token needs refresh (expired or expiring soon)
  shouldRefreshToken() {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    const expiry = this.getTokenExpiry();

    // No tokens available
    if (!accessToken || !refreshToken) {
      return false;
    }

    // No expiry info, assume token is still valid
    if (!expiry) {
      return false;
    }

    // Check if token is expired or expiring soon
    return Date.now() >= expiry;
  }

  // Validate token format (basic JWT structure check)
  isValidTokenFormat(token) {
    if (!token || typeof token !== "string") return false;

    const parts = token.split(".");
    if (parts.length !== 3) return false;

    try {
      // Try to decode the payload
      const payload = JSON.parse(atob(parts[1]));
      return payload && typeof payload === "object";
    } catch {
      return false;
    }
  }

  // Add request to refresh queue
  addToRefreshQueue(resolve, reject) {
    this.failedQueue.push({ resolve, reject });
  }

  // Process all queued requests
  processRefreshQueue(error = null, token = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  // Reset refresh state
  resetRefreshState() {
    this.isRefreshing = false;
    this.refreshPromise = null;
  }
}

// Create token manager instance
const tokenManager = new TokenManager();

// -----------------------------
// Axios Configuration
// -----------------------------
const API_CONFIG = {
  development: {
    baseURL:
      process.env.REACT_APP_API_URL || "http://188.34.167.110:5013/api/v1",
    timeout: 30000,
  },
  production: {
    baseURL: process.env.REACT_APP_API_URL || "/api/v1",
    timeout: 30000,
  },
};

const config = API_CONFIG[process.env.NODE_ENV] || API_CONFIG.development;

// Create main Axios instance
const api = axios.create({
  ...config,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// -----------------------------
// Token Refresh Function
// -----------------------------
async function refreshTokens() {
  const refreshToken = tokenManager.getRefreshToken();

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  console.log("🔄 Refreshing access token...");

  try {
    // Create separate axios instance to avoid interceptor loops
    const refreshApi = axios.create({
      baseURL: config.baseURL,
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await refreshApi.post("/auth/refresh", {
      refresh_token: refreshToken,
    });

    const {
      access_token,
      refresh_token: newRefreshToken,
      expires_in,
    } = response.data;

    if (!access_token) {
      throw new Error("Invalid refresh response: missing access token");
    }

    // Validate token format
    if (!tokenManager.isValidTokenFormat(access_token)) {
      throw new Error("Invalid access token format received");
    }

    // Store new tokens
    const success = tokenManager.setTokens(
      access_token,
      newRefreshToken,
      expires_in
    );
    if (!success) {
      throw new Error("Failed to store new tokens");
    }

    // Log success
    logSecurityEvent("TOKEN_REFRESHED", {
      timestamp: new Date().toISOString(),
      hasNewRefreshToken: !!newRefreshToken,
    });

    console.log("✅ Token refresh successful");
    return access_token;
  } catch (error) {
    console.error("❌ Token refresh failed:", error);

    // Log failure
    logSecurityEvent("TOKEN_REFRESH_FAILED", {
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    // If refresh token is invalid/expired, clear everything
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log("🚪 Refresh token invalid, clearing session");
      tokenManager.clearTokens();
    }

    throw error;
  }
}

// -----------------------------
// Request Interceptor
// -----------------------------
api.interceptors.request.use(
  async (config) => {
    const accessToken = tokenManager.getAccessToken();

    // Add access token to request headers
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Proactive token refresh (optional enhancement)
    if (
      accessToken &&
      tokenManager.shouldRefreshToken() &&
      !tokenManager.isRefreshing
    ) {
      try {
        console.log("🔄 Token expiring soon, refreshing proactively...");

        // Don't await this to avoid blocking the request
        // The response interceptor will handle any 401s if this fails
        refreshTokens()
          .then((newToken) => {
            if (newToken && config.headers) {
              config.headers.Authorization = `Bearer ${newToken}`;
            }
          })
          .catch((error) => {
            console.warn("⚠️ Proactive refresh failed:", error.message);
          });
      } catch (error) {
        console.warn("⚠️ Proactive refresh error:", error.message);
      }
    }

    // Add request metadata for debugging
    config.metadata = {
      requestId: Math.random().toString(36).substr(2, 9),
      startTime: Date.now(),
    };

    if (process.env.NODE_ENV === "development") {
      console.log(`🚀 API Request [${config.metadata.requestId}]:`, {
        method: config.method?.toUpperCase(),
        url: config.url,
        hasAuth: !!config.headers.Authorization,
      });
    }

    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// -----------------------------
// Response Interceptor with Enhanced Token Refresh
// -----------------------------
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === "development") {
      const requestId = response.config.metadata?.requestId;
      const duration = Date.now() - (response.config.metadata?.startTime || 0);
      console.log(`✅ API Response [${requestId}]:`, {
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
      console.error("🌐 Network Error:", error.message);
      toast.error("Network error. Please check your connection.");
      return Promise.reject(new Error("Network error"));
    }

    const { status } = error.response;

    // -----------------------------
    // Enhanced 401 Handling with Token Refresh
    // -----------------------------
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = tokenManager.getRefreshToken();

      // No refresh token available
      if (!refreshToken) {
        console.log("🚪 No refresh token, redirecting to login");
        handleAuthFailure("no_refresh_token");
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (tokenManager.isRefreshing) {
        console.log("🔄 Already refreshing, queuing request...");

        return new Promise((resolve, reject) => {
          tokenManager.addToRefreshQueue(
            async (newToken) => {
              if (newToken && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              try {
                const response = await api(originalRequest);
                resolve(response);
              } catch (retryError) {
                reject(retryError);
              }
            },
            (refreshError) => reject(refreshError)
          );
        });
      }

      // Start refresh process
      console.log("🔄 Starting token refresh process...");
      tokenManager.isRefreshing = true;

      try {
        const newAccessToken = await refreshTokens();

        if (newAccessToken) {
          // Update the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          // Process queued requests
          tokenManager.processRefreshQueue(null, newAccessToken);

          // Reset refresh state
          tokenManager.resetRefreshState();

          // Retry the original request
          console.log("🔁 Retrying original request with new token");
          return api(originalRequest);
        } else {
          throw new Error("Token refresh succeeded but no token received");
        }
      } catch (refreshError) {
        console.error("❌ Token refresh process failed:", refreshError);

        // Process queued requests with error
        tokenManager.processRefreshQueue(refreshError);

        // Reset refresh state
        tokenManager.resetRefreshState();

        // Handle auth failure
        handleAuthFailure("token_refresh_failed");

        return Promise.reject(refreshError);
      }
    }

    // -----------------------------
    // Handle Other Error Status Codes
    // -----------------------------
    handleApiError(status, error.response.data, error);
    return Promise.reject(error);
  }
);

// -----------------------------
// Error Handling Functions
// -----------------------------
function handleApiError(status, data, originalError) {
  const message = data?.message || "An error occurred";

  switch (status) {
    case 400:
      toast.error(message || "Invalid request data");
      break;
    case 403:
      toast.error(
        message || "You do not have permission to perform this action"
      );
      break;
    case 404:
      toast.error(message || "Resource not found");
      break;
    case 422:
      handleValidationErrors(data);
      break;
    case 429:
      toast.error("Too many requests. Please try again later.");
      break;
    case 500:
      toast.error(message || "Internal server error. Please try again later.");
      break;
    case 503:
      toast.error("Service temporarily unavailable. Please try again later.");
      break;
    default:
      if (status >= 500) {
        toast.error("Server error. Please try again later.");
      } else if (status >= 400) {
        toast.error(message);
      }
  }

  // Log error for debugging
  if (process.env.NODE_ENV === "development") {
    console.error(`❌ API Error [${status}]:`, {
      message,
      url: originalError?.config?.url,
      method: originalError?.config?.method?.toUpperCase(),
    });
  }
}

function handleValidationErrors(data) {
  if (data?.errors && typeof data.errors === "object") {
    // Handle field-specific validation errors
    Object.entries(data.errors).forEach(([field, messages]) => {
      const errorMessages = Array.isArray(messages) ? messages : [messages];
      errorMessages.forEach((msg) => {
        toast.error(`${field}: ${msg}`);
      });
    });
  } else {
    toast.error(data?.message || "Validation failed");
  }
}

function handleAuthFailure(reason) {
  console.log(`🚪 Authentication failed: ${reason}`);

  // Log security event
  logSecurityEvent("AUTH_FAILURE", {
    reason,
    timestamp: new Date().toISOString(),
  });

  // Clear all auth data
  tokenManager.clearTokens();

  // Reset any refresh state
  tokenManager.resetRefreshState();

  // Show user-friendly message
  toast.error("Your session has expired. Please login again.");

  // Redirect to login after a short delay
  setTimeout(() => {
    // Clear any remaining app state
    window.dispatchEvent(
      new CustomEvent("auth:logout", {
        detail: { reason },
      })
    );

    // Redirect
    window.location.href = "/login";
  }, 1500);
}

function logSecurityEvent(eventType, details) {
  try {
    const events = JSON.parse(localStorage.getItem("securityEvents") || "[]");
    events.push({
      eventType,
      ...details,
      userAgent: navigator.userAgent.substring(0, 100), // Truncate for storage
    });

    // Keep only last 100 events
    localStorage.setItem("securityEvents", JSON.stringify(events.slice(-100)));
  } catch (error) {
    console.warn("Failed to log security event:", error);
  }
}

// -----------------------------
// API Service Endpoints
// -----------------------------
export const apiService = {
  // Auth endpoints
  auth: {
    login: async (credentials) => {
      const response = await api.post("/auth/login", credentials);
      const { access_token, refresh_token, expires_in, user } = response.data;

      if (!access_token || !user) {
        throw new Error("Invalid login response");
      }

      // Store tokens and user data
      tokenManager.setTokens(access_token, refresh_token, expires_in);
      localStorage.setItem(
        tokenManager.STORAGE_KEYS.USER,
        JSON.stringify(user)
      );

      logSecurityEvent("LOGIN_SUCCESS", {
        username: credentials.username,
        timestamp: new Date().toISOString(),
      });

      return { token: access_token, user };
    },

    logout: async () => {
      try {
        // Call logout endpoint if possible
        await api.post("/auth/logout");
      } catch (error) {
        console.warn("Logout API call failed:", error);
      }

      logSecurityEvent("LOGOUT", {
        reason: "user_initiated",
        timestamp: new Date().toISOString(),
      });

      tokenManager.clearTokens();
    },

    refreshToken: () => refreshTokens(),
    getMe: () => api.get("/auth/me"),
    changePassword: (data) => api.put("/auth/change-password", data),
    forgotPassword: (data) => api.post("/auth/forgot-password", data),
    resetPassword: (data) => api.post("/auth/reset-password", data),
  },

  // Dashboard endpoints
  dashboard: {
    getOverview: (params = {}) => api.get("/dashboard/overview", { params }),
    getFinancialSummary: (params = {}) =>
      api.get("/dashboard/financial-summary", { params }),
    // getSummary: (params = {}) => api.get('/dashboard/summary', { params }),
    getRevenueChart: (params = {}) =>
      api.get("/dashboard/charts/revenue-trend", { params }),
    getExpenseChart: (params = {}) =>
      api.get("/dashboard/charts/expense-breakdown", { params }),

    // New comprehensive method for dashboard data
    getComprehensiveData: async (params = {}) => {
      try {
        const [overview, financialSummary, revenueChart, expenseChart] =
          await Promise.allSettled([
            api.get("/dashboard/overview", { params }),
            api.get("/dashboard/financial-summary", { params }),
            api.get("/dashboard/charts/revenue-trend", { params }),
            api.get("/dashboard/charts/expense-breakdown", { params }),
          ]);

        return {
          overview:
            overview.status === "fulfilled" ? overview.value.data : null,
          financialSummary:
            financialSummary.status === "fulfilled"
              ? financialSummary.value.data
              : null,
          revenueChart:
            revenueChart.status === "fulfilled"
              ? revenueChart.value.data
              : null,
          expenseChart:
            expenseChart.status === "fulfilled"
              ? expenseChart.value.data
              : null,
        };
      } catch (error) {
        console.error("Failed to fetch comprehensive dashboard data:", error);
        throw error;
      }
    },
  },

  // Other endpoints... (keep existing ones)
  journalEntries: {
    getAll: (params = {}) => api.get("/journal-entries", { params }),
    getById: (id) => api.get(`/journal-entries/${id}`),
    create: (data) => api.post("/journal-entries", data),
    update: (id, data) => api.put(`/journal-entries/${id}`, data),
    delete: (id) => api.delete(`/journal-entries/${id}`),
    post: (id) => api.post(`/journal-entries/${id}/post`),
  },

  accounts: {
    getAll: (params = {}) => api.get("/accounts", { params }),
    getById: (id) => api.get(`/accounts/${id}`),
    getHierarchy: () => api.get("/accounts/hierarchy"),
    create: (data) => api.post("/accounts", data),
    update: (id, data) => api.put(`/accounts/${id}`, data),
    delete: (id) => api.delete(`/accounts/${id}`),
  },

  // Add other endpoints as needed...
  suppliers: {
    getAll: (params = {}) => api.get("/suppliers", { params }),
    getById: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post("/suppliers", data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
  },

  grants: {
    getAll: (params = {}) => api.get("/grants", { params }),
    getById: (id) => api.get(`/grants/${id}`),
    getUtilization: (id) => api.get(`/grants/${id}/utilization`),
    create: (data) => api.post("/grants", data),
    update: (id, data) => api.put(`/grants/${id}`, data),
    delete: (id) => api.delete(`/grants/${id}`),
  },

  fixedAssets: {
    getAll: (params = {}) => api.get("/assets", { params }),
    getById: (id) => api.get(`/assets/${id}`),
    create: (data) => api.post("/assets", data),
    update: (id, data) => api.put(`/assets/${id}`, data),
    delete: (id) => api.delete(`/assets/${id}`),
  },

  costCenters: {
    getAll: (params = {}) => api.get("/cost-centers", { params }),
    getById: (id) => api.get(`/cost-centers/${id}`),
    create: (data) => api.post("/cost-centers", data),
    update: (id, data) => api.put(`/cost-centers/${id}`, data),
    delete: (id) => api.delete(`/cost-centers/${id}`),
  },

  projects: {
    getAll: (params = {}) => api.get("/projects", { params }),
    getById: (id) => api.get(`/projects/${id}`),
    getExpenses: (id, params = {}) =>
      api.get(`/projects/${id}/expenses`, { params }),
    create: (data) => api.post("/projects", data),
    update: (id, data) => api.put(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
  },

  budgets: {
    getAll: (params = {}) => api.get("/budgets", { params }),
    getById: (id) => api.get(`/budgets/${id}`),
    getLines: (budgetId) => api.get(`/budgets/${budgetId}/lines`),
    getVarianceAnalysis: (budgetId) => api.get(`/budgets/${budgetId}/variance`),
    create: (data) => api.post("/budgets", data),
    update: (id, data) => api.put(`/budgets/${id}`, data),
    delete: (id) => api.delete(`/budgets/${id}`),
  },

  reports: {
    trialBalance: (params = {}) =>
      api.get("/reports/trial-balance", { params }),
    balanceSheet: (params = {}) =>
      api.get("/reports/balance-sheet", { params }),
    incomeStatement: (params = {}) =>
      api.get("/reports/income-statement", { params }),
    cashFlow: (params = {}) => api.get("/reports/cash-flow", { params }),
  },

  health: {
    check: () => api.get("/health"),
  },
};

// -----------------------------
// Utility Functions & Exports
// -----------------------------
export const tokenUtils = {
  getAccessToken: () => tokenManager.getAccessToken(),
  getRefreshToken: () => tokenManager.getRefreshToken(),
  shouldRefreshToken: () => tokenManager.shouldRefreshToken(),
  clearTokens: () => tokenManager.clearTokens(),
  refreshTokens: () => refreshTokens(),
  isValidTokenFormat: (token) => tokenManager.isValidTokenFormat(token),
};

// Setup periodic token check (optional)
export const setupTokenMonitoring = (intervalMinutes = 1) => {
  return setInterval(() => {
    if (tokenManager.shouldRefreshToken() && !tokenManager.isRefreshing) {
      console.log("🔄 Background token refresh triggered");
      refreshTokens().catch((error) => {
        console.warn("⚠️ Background refresh failed:", error.message);
      });
    }
  }, intervalMinutes * 60 * 1000);
};

// Get token debug info
export const getTokenDebugInfo = () => {
  const accessToken = tokenManager.getAccessToken();
  const refreshToken = tokenManager.getRefreshToken();
  const expiry = tokenManager.getTokenExpiry();

  return {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    tokenExpiry: expiry ? new Date(expiry).toISOString() : null,
    shouldRefresh: tokenManager.shouldRefreshToken(),
    isRefreshing: tokenManager.isRefreshing,
    timeUntilExpiry: expiry ? Math.max(0, expiry - Date.now()) : null,
  };
};

export default api;
