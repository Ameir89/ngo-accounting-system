// frontend/src/pages/Dashboard.jsx - Enhanced with proper error handling and data management
import {
  AlertCircle,
  DollarSign,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

// Components
import BudgetChart from "../components/Charts/BudgetChart";
import FinancialChart from "../components/Charts/FinancialChart";
import RevenueChart from "../components/Charts/RevenueChart";
import ErrorMessage from "../components/UI/ErrorMessage";
import LoadingSpinner from "../components/UI/LoadingSpinner";

// Hooks and Services
import { useLanguage } from "../contexts/LanguageContext";
import {
  useComprehensiveDashboard,
  useDashboardOverview,
} from "../hooks/useApi/";
import { dashboardService } from "../services/dashboardService";
import { errorHandler } from "../services/errorHandling";

// Dashboard Card Component
const DashboardCard = ({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  color = "blue",
  loading = false,
  error = null,
}) => {
  const colorClasses = {
    blue: "bg-blue-500 text-white",
    green: "bg-green-500 text-white",
    red: "bg-red-500 text-white",
    yellow: "bg-yellow-500 text-white",
    purple: "bg-purple-500 text-white",
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    return trend.direction === "up" ? TrendingUp : TrendingDown;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    return trend.direction === "up" ? "text-green-600" : "text-red-600";
  };

  const TrendIcon = getTrendIcon();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="ml-4 flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-red-500">
        <div className="flex items-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <div className="ml-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-red-600">Failed to load</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow duration-200 p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {title}
            </h3>
            {trend && TrendIcon && (
              <div className={`flex items-center ${getTrendColor()}`}>
                <TrendIcon className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">{trend.percentage}%</span>
              </div>
            )}
          </div>
          <div className="mt-1">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Alert Component
const AlertCard = ({ alert, onDismiss }) => {
  const { t } = useLanguage();

  const alertColors = {
    info: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
    warning: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
    danger: "border-red-500 bg-red-50 dark:bg-red-900/20",
    success: "border-green-500 bg-green-50 dark:bg-green-900/20",
  };

  const iconColors = {
    info: "text-blue-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
    success: "text-green-600",
  };

  return (
    <div className={`border-l-4 p-4 ${alertColors[alert.type]}`}>
      <div className="flex items-start">
        <AlertCircle className={`h-5 w-5 ${iconColors[alert.type]} mt-0.5`} />
        <div className="ml-3 flex-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            {alert.title}
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            {alert.message}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

// Main Dashboard Component
const Dashboard = () => {
  const { t, formatCurrency } = useLanguage();
  const [alerts, setAlerts] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Use the enhanced dashboard hooks
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useComprehensiveDashboard();

  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useDashboardOverview();

  // Load alerts and KPIs
  useEffect(() => {
    const loadDashboardExtras = async () => {
      try {
        // Load alerts
        const alertsData = await dashboardService.getAlerts();
        setAlerts(alertsData);

        // Load KPIs if we have dashboard data
        if (dashboardData) {
          const kpisData = await dashboardService.getKPIs();
          setKpis(kpisData);
        }
      } catch (error) {
        console.error("Failed to load dashboard extras:", error);
      }
    };

    loadDashboardExtras();
  }, [dashboardData]);

  // Setup auto-refresh
  useEffect(() => {
    dashboardService.setupAutoRefresh(5); // 5 minutes
    return () => dashboardService.stopAutoRefresh();
  }, []);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      dashboardService.clearCache();

      await Promise.all([refetchDashboard(), refetchOverview()]);

      setLastRefresh(new Date());
      toast.success("Dashboard refreshed successfully");
    } catch (error) {
      errorHandler.handleApiError(error, { context: "dashboard_refresh" });
      toast.error("Failed to refresh dashboard");
    } finally {
      setRefreshing(false);
    }
  }, [refetchDashboard, refetchOverview]);

  // Handle alert dismissal
  const handleDismissAlert = useCallback((alertId) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  // Memoized summary cards data
  const summaryCards = useMemo(() => {
    if (!dashboardData || !overviewData) return [];

    try {
      const financialSummary = dashboardData.financialSummary;
      const overview = overviewData;

      return [
        {
          title: t("Total Revenue"),
          value: formatCurrency(
            financialSummary?.current_month_performance?.revenue || 0
          ),
          icon: DollarSign,
          color: "green",
          trend: kpis?.netIncome?.trend,
          subtitle: "This month",
        },
        {
          title: t("Total Expenses"),
          value: formatCurrency(
            financialSummary?.current_month_performance?.expenses || 0
          ),
          icon: TrendingDown,
          color: "red",
          trend: kpis?.expenseRatio?.trend,
          subtitle: "This month",
        },
        {
          title: t("Net Income"),
          value: formatCurrency(
            (financialSummary?.current_month_performance?.revenue || 0) -
              (financialSummary?.current_month_performance?.expenses || 0)
          ),
          icon: TrendingUp,
          color: "blue",
          trend: kpis?.profitMargin?.trend,
          subtitle: "This month",
        },
        {
          title: t("Active Projects"),
          value: overview?.quick_stats?.total_projects || "0",
          icon: Users,
          color: "purple",
          subtitle: "Currently running",
        },
      ];
    } catch (error) {
      console.error("Error preparing summary cards:", error);
      return [];
    }
  }, [dashboardData, overviewData, kpis, t, formatCurrency]);

  // Loading state
  if (isDashboardLoading || isOverviewLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("dashboard")}
          </h1>
          <LoadingSpinner size="sm" />
        </div>

        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <DashboardCard key={i} loading />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80">
            <LoadingSpinner size="md" message="Loading charts..." />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80">
            <LoadingSpinner size="md" message="Loading data..." />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (dashboardError || overviewError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("dashboard")}
          </h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            {t("refresh")}
          </button>
        </div>

        <ErrorMessage
          message={
            dashboardError?.message ||
            overviewError?.message ||
            "Failed to load dashboard data"
          }
          onRetry={handleRefresh}
          showRetry={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("dashboard")}
          </h1>
          {lastRefresh && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary flex items-center"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : t("refresh")}
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Alerts & Notifications
          </h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onDismiss={handleDismissAlert}
              />
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => (
          <DashboardCard
            key={index}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
            trend={card.trend}
            subtitle={card.subtitle}
          />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Overview Chart */}
        <FinancialChart
          title="Financial Performance"
          data={dashboardData?.charts?.revenue?.chart_data}
          height={350}
        />

        {/* Revenue Breakdown Chart */}
        <RevenueChart
          title="Revenue Sources"
          data={dashboardData?.charts?.revenue?.chart_data}
          height={350}
        />
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 gap-6">
        <BudgetChart
          title="Budget vs Actual Analysis"
          data={dashboardData?.charts?.expenses?.chart_data}
          height={400}
        />
      </div>

      {/* KPI Details */}
      {kpis && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Key Performance Indicators
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(kpis).map(([key, kpi]) => (
                <div key={key} className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {kpi.formatted}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </div>
                  {kpi.trend && (
                    <div
                      className={`text-xs mt-1 ${
                        kpi.trend.direction === "up"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {kpi.trend.direction === "up" ? "↗" : "↘"}{" "}
                      {kpi.trend.percentage}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Quick Actions
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="btn-primary w-full">Create Journal Entry</button>
            <button className="btn-secondary w-full">Generate Report</button>
            <button className="btn-secondary w-full">Export Dashboard</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
