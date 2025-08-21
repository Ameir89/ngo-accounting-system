// frontend/src/services/dashboardService.js - Comprehensive dashboard data management
import { apiService } from './api';
import { errorHandler } from './errorHandling';

/**
 * Dashboard service for managing dashboard data and state
 */
class DashboardService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.refreshInterval = null;
    this.isAutoRefreshEnabled = false;
  }

  /**
   * Get comprehensive dashboard data with caching
   */
  getDashboardData = async (params = {}, useCache = true) => {
    const cacheKey = this.getCacheKey('dashboard', params);
    
    // Check cache first
    if (useCache && this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      // Fetch data from multiple endpoints concurrently
      const [overview, financialSummary, charts] = await Promise.allSettled([
        this.getOverview(params),
        this.getFinancialSummary(params),
        this.getChartData(params),
      ]);

      const dashboardData = {
        overview: overview.status === 'fulfilled' ? overview.value : null,
        financialSummary: financialSummary.status === 'fulfilled' ? financialSummary.value : null,
        charts: charts.status === 'fulfilled' ? charts.value : null,
        timestamp: new Date().toISOString(),
        errors: this.collectErrors([overview, financialSummary, charts]),
      };

      // Cache the result
      this.setCache(cacheKey, dashboardData);

      return dashboardData;
    } catch (error) {
      errorHandler.handleApiError(error, { context: 'dashboard_data' });
      throw error;
    }
  };

  /**
   * Get dashboard overview data
   */
  getOverview = async (params = {}) => {
    try {
      const response = await apiService.dashboard.getOverview(params);
      return response.data;
    } catch (error) {
      errorHandler.handleApiError(error, { context: 'dashboard_overview' });
      throw error;
    }
  };

  /**
   * Get financial summary data
   */
  getFinancialSummary = async (params = {}) => {
    try {
      const response = await apiService.dashboard.getFinancialSummary(params);
      return response.data;
    } catch (error) {
      errorHandler.handleApiError(error, { context: 'financial_summary' });
      throw error;
    }
  };

  /**
   * Get chart data for dashboard
   */
  getChartData = async (params = {}) => {
    try {
      const [revenueChart, expenseChart] = await Promise.allSettled([
        apiService.dashboard.getRevenueChart(params),
        apiService.dashboard.getExpenseChart(params),
      ]);

      return {
        revenue: revenueChart.status === 'fulfilled' ? revenueChart.value.data : null,
        expenses: expenseChart.status === 'fulfilled' ? expenseChart.value.data : null,
        errors: this.collectErrors([revenueChart, expenseChart]),
      };
    } catch (error) {
      errorHandler.handleApiError(error, { context: 'dashboard_charts' });
      throw error;
    }
  };

  /**
   * Get key performance indicators
   */
  getKPIs = async (params = {}) => {
    try {
      const data = await this.getDashboardData(params);
      
      if (!data.overview || !data.financialSummary) {
        throw new Error('Insufficient data to calculate KPIs');
      }

      const kpis = this.calculateKPIs(data);
      return kpis;
    } catch (error) {
      errorHandler.handleApiError(error, { context: 'dashboard_kpis' });
      throw error;
    }
  };

  /**
   * Calculate key performance indicators
   */
  calculateKPIs = (dashboardData) => {
    const { overview, financialSummary } = dashboardData;
    
    if (!overview || !financialSummary) {
      return null;
    }

    try {
      // Extract financial data
      const currentRevenue = financialSummary.current_month_performance?.revenue || 0;
      const currentExpenses = financialSummary.current_month_performance?.expenses || 0;
      const totalAssets = financialSummary.financial_position?.total_assets || 0;
      const totalLiabilities = financialSummary.financial_position?.total_liabilities || 0;

      // Calculate KPIs
      const netIncome = currentRevenue - currentExpenses;
      const profitMargin = currentRevenue > 0 ? (netIncome / currentRevenue) * 100 : 0;
      const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
      const expenseRatio = currentRevenue > 0 ? (currentExpenses / currentRevenue) * 100 : 0;

      return {
        netIncome: {
          value: netIncome,
          trend: this.calculateTrend(netIncome, overview.previous_month_net_income),
          formatted: this.formatCurrency(netIncome),
        },
        profitMargin: {
          value: profitMargin,
          trend: this.calculateTrend(profitMargin, overview.previous_month_profit_margin),
          formatted: `${profitMargin.toFixed(1)}%`,
        },
        debtToAssetRatio: {
          value: debtToAssetRatio,
          trend: this.calculateTrend(debtToAssetRatio, overview.previous_month_debt_ratio),
          formatted: `${debtToAssetRatio.toFixed(1)}%`,
        },
        expenseRatio: {
          value: expenseRatio,
          trend: this.calculateTrend(expenseRatio, overview.previous_month_expense_ratio),
          formatted: `${expenseRatio.toFixed(1)}%`,
        },
        totalAssets: {
          value: totalAssets,
          formatted: this.formatCurrency(totalAssets),
        },
        totalLiabilities: {
          value: totalLiabilities,
          formatted: this.formatCurrency(totalLiabilities),
        },
      };
    } catch (error) {
      console.error('Error calculating KPIs:', error);
      return null;
    }
  };

  /**
   * Calculate trend direction and percentage
   */
  calculateTrend = (current, previous) => {
    if (!previous || previous === 0) {
      return { direction: 'neutral', percentage: 0 };
    }

    const change = current - previous;
    const percentage = Math.abs((change / previous) * 100);
    
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
      change: Math.round(change * 100) / 100, // Round to 2 decimals
    };
  };

  /**
   * Format currency values
   */
  formatCurrency = (amount, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (error) {
      return `$${amount.toLocaleString()}`;
    }
  };

  /**
   * Get recent activities/transactions
   */
  getRecentActivities = async (limit = 10) => {
    try {
      // This would typically fetch from a recent activities endpoint
      // For now, we'll use journal entries as recent activities
      const response = await apiService.journalEntries.getAll({
        per_page: limit,
        sort: 'created_at',
        order: 'desc',
      });

      return response.data?.entries || [];
    } catch (error) {
      errorHandler.handleApiError(error, { context: 'recent_activities' });
      return [];
    }
  };

  /**
   * Get alerts and notifications
   */
  getAlerts = async () => {
    try {
      const data = await this.getDashboardData();
      const alerts = [];

      // Check for various alert conditions
      if (data.financialSummary) {
        const { current_month_performance } = data.financialSummary;
        
        // Low cash alert
        if (current_month_performance?.cash_balance < 10000) {
          alerts.push({
            id: 'low_cash',
            type: 'warning',
            title: 'Low Cash Balance',
            message: 'Cash balance is below $10,000',
            priority: 'high',
          });
        }

        // High expense ratio alert
        if (current_month_performance?.expense_ratio > 80) {
          alerts.push({
            id: 'high_expenses',
            type: 'danger',
            title: 'High Expense Ratio',
            message: 'Monthly expenses exceed 80% of revenue',
            priority: 'medium',
          });
        }
      }

      // Check for overdue items (this would come from the backend in real implementation)
      alerts.push({
        id: 'overdue_reconciliation',
        type: 'info',
        title: 'Monthly Reconciliation',
        message: 'Monthly bank reconciliation is due',
        priority: 'low',
      });

      return alerts;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  };

  /**
   * Setup auto-refresh for dashboard data
   */
  setupAutoRefresh = (intervalMinutes = 5) => {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.isAutoRefreshEnabled = true;
    this.refreshInterval = setInterval(() => {
      if (this.isAutoRefreshEnabled) {
        // Clear cache and fetch fresh data
        this.clearCache();
        this.getDashboardData({}, false).catch(error => {
          console.warn('Auto-refresh failed:', error);
        });
      }
    }, intervalMinutes * 60 * 1000);
  };

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh = () => {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.isAutoRefreshEnabled = false;
  };

  /**
   * Export dashboard data
   */
  exportDashboardData = async (format = 'json', params = {}) => {
    try {
      const data = await this.getDashboardData(params);
      
      if (format === 'json') {
        this.downloadJson(data, 'dashboard-data');
      } else if (format === 'csv') {
        this.downloadCsv(data, 'dashboard-data');
      }
      
      return true;
    } catch (error) {
      errorHandler.handleApiError(error, { context: 'export_dashboard' });
      return false;
    }
  };

  /**
   * Download data as JSON
   */
  downloadJson = (data, filename) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    this.downloadBlob(blob, `${filename}.json`);
  };

  /**
   * Download data as CSV
   */
  downloadCsv = (data, filename) => {
    // Convert dashboard data to CSV format
    const csvData = this.convertToCSV(data);
    const blob = new Blob([csvData], { type: 'text/csv' });
    this.downloadBlob(blob, `${filename}.csv`);
  };

  /**
   * Convert dashboard data to CSV format
   */
  convertToCSV = (data) => {
    const rows = [];
    
    // Add overview data
    if (data.overview) {
      rows.push(['Section', 'Metric', 'Value']);
      Object.entries(data.overview).forEach(([key, value]) => {
        rows.push(['Overview', key, value]);
      });
    }
    
    return rows.map(row => row.join(',')).join('\n');
  };

  /**
   * Download blob as file
   */
  downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Cache management methods

  /**
   * Generate cache key
   */
  getCacheKey = (prefix, params) => {
    const paramString = JSON.stringify(params);
    return `${prefix}_${btoa(paramString)}`;
  };

  /**
   * Check if cache is valid
   */
  isCacheValid = (key) => {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    return now - cached.timestamp < this.cacheTimeout;
  };

  /**
   * Set cache
   */
  setCache = (key, data) => {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  };

  /**
   * Clear cache
   */
  clearCache = () => {
    this.cache.clear();
  };

  /**
   * Collect errors from Promise.allSettled results
   */
  collectErrors = (results) => {
    return results
      .filter(result => result.status === 'rejected')
      .map(result => result.reason.message || 'Unknown error');
  };

  /**
   * Get dashboard health status
   */
  getHealthStatus = async () => {
    try {
      const data = await this.getDashboardData();
      const errors = data.errors || [];
      
      return {
        status: errors.length === 0 ? 'healthy' : 'degraded',
        errors,
        lastUpdate: data.timestamp,
        cacheSize: this.cache.size,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        errors: [error.message],
        lastUpdate: null,
        cacheSize: this.cache.size,
      };
    }
  };
}

// Create singleton instance
export const dashboardService = new DashboardService();

// Export utility functions
export const dashboardUtils = {
  formatCurrency: dashboardService.formatCurrency,
  calculateTrend: dashboardService.calculateTrend,
  formatPercentage: (value) => `${value.toFixed(1)}%`,
  formatNumber: (value) => value.toLocaleString(),
};

export default dashboardService;