// frontend/src/pages/Dashboard.jsx - Optimized Version
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building, Calendar,
  CheckCircle,
  DollarSign, FileText,
  PieChart,
  TrendingUp, Users,
  Zap
} from 'lucide-react';
import { Suspense, lazy, memo, useMemo, useState } from 'react';
import ErrorMessage from '../components/UI/ErrorMessage';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useLanguage } from '../contexts/LanguageContext';
import { useDashboardData } from '../hooks/useApi';

// Lazy load chart components for better performance
const FinancialChart = lazy(() => import('../components/Charts/FinancialChart'));
const RevenueChart = lazy(() => import('../components/Charts/RevenueChart'));
const BudgetChart = lazy(() => import('../components/Charts/BudgetChart'));

// Memoized Summary Card Component
const SummaryCard = memo(({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  change, 
  changeType,
  trend,
  loading = false,
  onClick,
  description
}) => {
  const getChangeIcon = () => {
    if (changeType === 'positive') return ArrowUpRight;
    if (changeType === 'negative') return ArrowDownRight;
    return null;
  };

  const ChangeIcon = getChangeIcon();

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="card-body">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`card transition-all duration-200 hover:shadow-lg ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="card-body">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`${color} rounded-lg p-3 shadow-sm`}>
              <Icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {value}
                </div>
                {change && ChangeIcon && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    <ChangeIcon className="h-4 w-4 mr-1" />
                    {change}
                  </div>
                )}
              </dd>
              {description && (
                <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {description}
                </dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
});

SummaryCard.displayName = 'SummaryCard';

// Memoized Quick Action Component
const QuickAction = memo(({ icon: Icon, title, description, onClick, color = 'bg-gray-100' }) => (
  <button
    onClick={onClick}
    className="w-full p-4 text-left bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 
               hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
               group"
  >
    <div className="flex items-center">
      <div className={`${color} rounded-lg p-2 group-hover:scale-110 transition-transform duration-200`}>
        <Icon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </div>
      <div className="ml-3 flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {description}
        </p>
      </div>
    </div>
  </button>
));

QuickAction.displayName = 'QuickAction';

// Memoized Recent Activity Item
const ActivityItem = memo(({ activity, formatDate, formatCurrency }) => {
  const getStatusIcon = () => {
    switch (activity.status) {
      case 'completed':
      case 'posted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
      case 'draft':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 
                    transition-colors duration-150 rounded-lg">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {activity.description || activity.entry_number}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(activity.created_at || activity.entry_date)}
          </p>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {formatCurrency(activity.amount || activity.total_debit)}
        </span>
        <div className={`text-xs px-2 py-1 rounded-full inline-block ml-2 ${
          activity.is_posted || activity.status === 'completed' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
        }`}>
          {activity.is_posted || activity.status === 'completed' ? 'Posted' : 'Draft'}
        </div>
      </div>
    </div>
  );
});

ActivityItem.displayName = 'ActivityItem';

// Chart Loading Fallback
const ChartFallback = () => (
  <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
    <LoadingSpinner size="md" message="Loading chart..." />
  </div>
);

// Main Dashboard Component
const Dashboard = () => {
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData();
  const { t, formatCurrency, formatDate } = useLanguage();
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');

  // Memoized summary cards data
  const summaryCards = useMemo(() => [
    {
      title: t('totalCash'),
      value: formatCurrency(dashboardData?.financial_summary?.total_cash || 0),
      icon: DollarSign,
      color: 'bg-blue-500',
      change: dashboardData?.financial_summary?.cash_change || '+2.5%',
      changeType: dashboardData?.financial_summary?.cash_change_type || 'positive',
      description: 'Available liquid assets'
    },
    {
      title: t('activeProjects'),
      value: dashboardData?.metrics?.active_projects || 0,
      icon: Building,
      color: 'bg-green-500',
      change: dashboardData?.metrics?.projects_change || '+1',
      changeType: dashboardData?.metrics?.projects_change_type || 'positive',
      description: 'Currently running projects'
    },
    {
      title: 'Pending Approvals',
      value: dashboardData?.metrics?.pending_approvals || 0,
      icon: FileText,
      color: 'bg-yellow-500',
      change: dashboardData?.metrics?.approvals_change || '-2',
      changeType: dashboardData?.metrics?.approvals_change_type || 'negative',
      description: 'Items awaiting review'
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(dashboardData?.financial_summary?.monthly_revenue || 0),
      icon: TrendingUp,
      color: 'bg-indigo-500',
      change: dashboardData?.financial_summary?.revenue_change || '+12.5%',
      changeType: dashboardData?.financial_summary?.revenue_change_type || 'positive',
      description: `Revenue for ${new Date().toLocaleString('default', { month: 'long' })}`
    },
  ], [dashboardData, t, formatCurrency]);

  // Memoized quick actions
  const quickActions = useMemo(() => [
    {
      icon: FileText,
      title: 'Create Journal Entry',
      description: 'Record a new transaction',
      action: () => console.log('Navigate to journal entry form'),
      color: 'bg-blue-100'
    },
    {
      icon: Users,
      title: 'Add Supplier',
      description: 'Register new vendor',
      action: () => console.log('Navigate to supplier form'),
      color: 'bg-green-100'
    },
    {
      icon: Building,
      title: 'New Project',
      description: 'Start tracking project finances',
      action: () => console.log('Navigate to project form'),
      color: 'bg-purple-100'
    },
    {
      icon: BarChart3,
      title: 'Generate Report',
      description: 'Create financial statement',
      action: () => console.log('Navigate to reports'),
      color: 'bg-orange-100'
    },
    {
      icon: Calendar,
      title: 'Schedule Review',
      description: 'Plan financial review meeting',
      action: () => console.log('Open calendar'),
      color: 'bg-pink-100'
    },
    {
      icon: Zap,
      title: 'Quick Reconcile',
      description: 'Match transactions quickly',
      action: () => console.log('Open reconciliation'),
      color: 'bg-yellow-100'
    }
  ], []);

  // Handle loading and error states
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <SummaryCard key={i} loading={true} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage 
          message={error.message || 'Failed to load dashboard data'} 
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            {t('dashboard')}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Welcome back! Here's what's happening with your organization.
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="form-select text-sm"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="btn-secondary text-sm">
            <Calendar className="h-4 w-4 mr-2" />
            Custom Range
          </button>
          <button className="btn-primary text-sm">
            <FileText className="h-4 w-4 mr-2" />
            New Entry
          </button>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card, index) => (
          <SummaryCard key={index} {...card} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  {t('recentEntries')}
                </h3>
                <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  View All
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              {dashboardData?.recent_entries?.length > 0 ? (
                <div className="space-y-1">
                  {dashboardData.recent_entries.slice(0, 5).map((entry) => (
                    <ActivityItem
                      key={entry.id}
                      activity={entry}
                      formatDate={formatDate}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('No recent entries')}
                  </p>
                  <button className="btn-primary mt-4 text-sm">
                    Create First Entry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Quick Actions
              </h3>
            </div>
            <div className="card-body p-4">
              <div className="grid grid-cols-1 gap-3">
                {quickActions.map((action, index) => (
                  <QuickAction
                    key={index}
                    icon={action.icon}
                    title={action.title}
                    description={action.description}
                    onClick={action.action}
                    color={action.color}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Financial Overview Chart */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Financial Overview
              </h3>
              <div className="flex items-center space-x-2">
                <button className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <PieChart className="h-4 w-4" />
                </button>
                <button className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <BarChart3 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="card-body">
            <Suspense fallback={<ChartFallback />}>
              <FinancialChart 
                data={dashboardData?.charts?.financial_overview} 
                height={300}
              />
            </Suspense>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Revenue Trends
            </h3>
          </div>
          <div className="card-body">
            <Suspense fallback={<ChartFallback />}>
              <RevenueChart 
                data={dashboardData?.charts?.revenue_trends} 
                height={300}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Budget vs Actual Chart */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Budget vs Actual Performance
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Variance: 
                <span className="font-medium text-green-600 dark:text-green-400 ml-1">
                  +5.2%
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="card-body">
          <Suspense fallback={<ChartFallback />}>
            <BudgetChart 
              data={dashboardData?.charts?.budget_variance} 
              height={400}
            />
          </Suspense>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="card-body">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 mr-3" />
              <div>
                <p className="text-blue-100">Revenue Growth</p>
                <p className="text-2xl font-bold">+12.5%</p>
                <p className="text-sm text-blue-100">vs last month</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="card-body">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 mr-3" />
              <div>
                <p className="text-green-100">Budget Efficiency</p>
                <p className="text-2xl font-bold">94.3%</p>
                <p className="text-sm text-green-100">of planned spend</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="card-body">
            <div className="flex items-center">
              <Users className="h-8 w-8 mr-3" />
              <div>
                <p className="text-purple-100">Active Grants</p>
                <p className="text-2xl font-bold">{dashboardData?.metrics?.active_grants || 8}</p>
                <p className="text-sm text-purple-100">funding projects</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;