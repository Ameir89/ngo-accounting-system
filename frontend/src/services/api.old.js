// frontend/src/services/api.js - Enhanced with better error handling and integration
import axios from "axios";
import toast from "react-hot-toast";

// Environment-based configuration
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

// Create axios instance with enhanced config
const api = axios.create({
  ...config,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.metadata = { requestId: Date.now().toString() };

    if (process.env.NODE_ENV === "development") {
      console.log("🚀 API Request:", {
        url: `${config.baseURL}${config.url}`,
        method: config.method.toUpperCase(),
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === "development") {
      console.log("✅ API Response:", {
        url: response.config.url,
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  (error) => {
    const { response, request } = error;

    if (response) {
      const { status, data } = response;

      switch (status) {
        case 400:
          toast.error(data?.message || "Invalid request data");
          break;
        case 401:
          toast.error("Session expired. Please login again.");
          // localStorage.removeItem('authToken');
          // localStorage.removeItem('user');
          // setTimeout(() => window.location.href = '/login', 1000);
          break;
        case 403:
          toast.error(
            data?.message || "You do not have permission to perform this action"
          );
          break;
        case 404:
          toast.error(data?.message || "Resource not found");
          break;
        case 422:
          if (data?.errors && typeof data.errors === "object") {
            Object.values(data.errors)
              .flat()
              .forEach((msg) => toast.error(msg));
          } else {
            toast.error(data?.message || "Validation failed");
          }
          break;
        case 500:
          toast.error(
            data?.message || "Internal server error. Please try again later."
          );
          break;
        default:
          toast.error(data?.message || `Server error (${status})`);
      }

      if (process.env.NODE_ENV === "development") {
        console.error("❌ API Error Response:", {
          url: response.config.url,
          status,
          data,
        });
      }

      const enhancedError = new Error(data?.message || "API Error");
      enhancedError.response = response;
      enhancedError.status = status;
      enhancedError.data = data;
      return Promise.reject(enhancedError);
    } else if (request) {
      toast.error("Network error - please check your connection");
      return Promise.reject(new Error("Network error"));
    } else {
      console.error("❌ Request Setup Error:", error.message);
      return Promise.reject(new Error("Request configuration error"));
    }
  }
);

// Enhanced API service with consistent structure
export const apiService = {
  // Authentication endpoints
  auth: {
    login: async (credentials) => {
      const response = await api.post("/auth/login", credentials);
      const { access_token, user } = response.data;

      localStorage.setItem("authToken", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      return { token: access_token, user };
    },

    getMe: () => api.get("/auth/me"),

    logout: async () => {
      try {
        await api.post("/auth/logout");
      } catch (error) {
        console.warn("Logout API call failed:", error);
      } finally {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
      }
    },

    refreshToken: () => api.post("/auth/refresh"),
    changePassword: (data) => api.post("/auth/change-password", data),
    forgotPassword: (data) => api.post("/auth/forgot-password", data),
    resetPassword: (data) => api.post("/auth/reset-password", data),
  },

  // Chart of Accounts
  accounts: {
    getAll: (params = {}) => api.get("/accounts", { params }),
    getById: (id) => api.get(`/accounts/${id}`),
    create: (data) => api.post("/accounts", data),
    update: (id, data) => api.put(`/accounts/${id}`, data),
    delete: (id) => api.delete(`/accounts/${id}`),
    getHierarchy: () => api.get("/accounts/hierarchy"),
    validateCode: (code) => api.post("/accounts/validate-code", { code }),
  },

  // Journal Entries
  journalEntries: {
    getAll: (params = {}) => api.get("/journal-entries", { params }),
    getById: (id) => api.get(`/journal-entries/${id}`),
    create: (data) => api.post("/journal-entries", data),
    update: (id, data) => api.put(`/journal-entries/${id}`, data),
    delete: (id) => api.delete(`/journal-entries/${id}`),
    post: (id) => api.post(`/journal-entries/${id}/post`),
    unpost: (id) => api.post(`/journal-entries/${id}/unpost`),
    duplicate: (id) => api.post(`/journal-entries/${id}/duplicate`),
  },

  // Suppliers
  suppliers: {
    getAll: (params = {}) => api.get("/suppliers", { params }),
    getById: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post("/suppliers", data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
    search: (query) => api.get("/suppliers/search", { params: { q: query } }),
  },

  // Grants
  grants: {
    getAll: (params = {}) => api.get("/grants", { params }),
    getById: (id) => api.get(`/grants/${id}`),
    create: (data) => api.post("/grants", data),
    update: (id, data) => api.put(`/grants/${id}`, data),
    delete: (id) => api.delete(`/grants/${id}`),
    getUtilization: (id) => api.get(`/grants/${id}/utilization`),
    generateReport: (id, params) => api.get(`/grants/${id}/report`, { params }),
  },

  // Fixed Assets
  fixedAssets: {
    getAll: (params = {}) => api.get("/fixed-assets", { params }),
    getById: (id) => api.get(`/fixed-assets/${id}`),
    create: (data) => api.post("/fixed-assets", data),
    update: (id, data) => api.put(`/fixed-assets/${id}`, data),
    delete: (id) => api.delete(`/fixed-assets/${id}`),
    calculateDepreciation: (id, params) =>
      api.post(`/fixed-assets/${id}/calculate-depreciation`, params),
    getDepreciationHistory: (id) => api.get(`/fixed-assets/${id}/depreciation`),
  },

  // Cost Centers
  costCenters: {
    getAll: (params = {}) => api.get("/cost-centers", { params }),
    getById: (id) => api.get(`/cost-centers/${id}`),
    create: (data) => api.post("/cost-centers", data),
    update: (id, data) => api.put(`/cost-centers/${id}`, data),
    delete: (id) => api.delete(`/cost-centers/${id}`),
  },

  // Projects
  projects: {
    getAll: (params = {}) => api.get("/projects", { params }),
    getById: (id) => api.get(`/projects/${id}`),
    create: (data) => api.post("/projects", data),
    update: (id, data) => api.put(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
    getExpenses: (id, params) =>
      api.get(`/projects/${id}/expenses`, { params }),
  },

  // Budgets
  budgets: {
    getAll: (params = {}) => api.get("/budgets", { params }),
    getById: (id) => api.get(`/budgets/${id}`),
    create: (data) => api.post("/budgets", data),
    update: (id, data) => api.put(`/budgets/${id}`, data),
    delete: (id) => api.delete(`/budgets/${id}`),
    getLines: (id) => api.get(`/budgets/${id}/lines`),
    getVarianceAnalysis: (id) => api.get(`/budgets/${id}/variance-analysis`),
  },

  // Reports
  reports: {
    trialBalance: (params = {}) =>
      api.get("/reports/trial-balance", { params }),
    balanceSheet: (params = {}) =>
      api.get("/reports/balance-sheet", { params }),
    incomeStatement: (params = {}) =>
      api.get("/reports/income-statement", { params }),
    cashFlow: (params = {}) => api.get("/reports/cash-flow", { params }),
    export: (reportType, format, params) =>
      api.get(`/reports/${reportType}/export/${format}`, {
        params,
        responseType: "blob",
      }),
  },

  // Fixed Dashboard service - this was the main issue
  dashboard: {
    // Method that was missing and causing the error
    getSummary: (params = {}) => api.get("/dashboard/overview", { params }),

    // Additional dashboard methods
    getOverview: (params = {}) => api.get("/dashboard/overview", { params }),
    getFinancialSummary: (params = {}) =>
      api.get("/dashboard/financial-summary", { params }),
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

  // Data Exchange
  dataExchange: {
    importAccounts: (file) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post("/data-exchange/import/accounts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    exportTrialBalance: (params, format) =>
      api.get("/data-exchange/export/trial-balance", {
        params: { ...params, format },
        responseType: "blob",
      }),
    downloadTemplate: (type) =>
      api.get(`/data-exchange/templates/${type}`, {
        responseType: "blob",
      }),
    validateFile: (file, type) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("file_type", type);
      return api.post("/data-exchange/validate/file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
  },

  // File operations
  files: {
    upload: (file, type = "document") => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      return api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    download: (fileId) =>
      api.get(`/files/${fileId}/download`, { responseType: "blob" }),
  },

  // Health check
  health: {
    check: () => api.get("/health"),
  },
};

// API health check function
export const checkApiHealth = async () => {
  try {
    const response = await apiService.health.check();
    return response.data;
  } catch (error) {
    throw new Error("API is not available");
  }
};

export default api;
