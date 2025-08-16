// frontend/src/pages/Dashboard.jsx
import { Building, Calendar, DollarSign, FileText, TrendingUp, Users } from 'lucide-react';
import ErrorMessage from '../components/UI/ErrorMessage';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useLanguage } from '../contexts/LanguageContext';
import { useDashboardData } from '../hooks/useApi';

const Dashboard = () => {
  const { data: dashboardData, isLoading, error } = useDashboardData();
  const { t, formatCurrency, formatDate } = useLanguage();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  const summaryCards = [
    {
      title: t('totalCash'),
      value: formatCurrency(dashboardData?.total_cash || 0),
      icon: DollarSign,
      color: 'bg-blue-500',
      change: '+2.5%',
      changeType: 'positive',
    },
    {
      title: t('activeProjects'),
      value: dashboardData?.active_projects || 0,
      icon: Building,
      color: 'bg-green-500',
      change: '+1',
      changeType: 'positive',
    },
    {
      title: 'Pending Approvals',
      value: dashboardData?.pending_approvals || 0,
      icon: FileText,
      color: 'bg-yellow-500',
      change: '-2',
      changeType: 'negative',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(dashboardData?.monthly_revenue || 0),
      icon: TrendingUp,
      color: 'bg-indigo-500',
      change: '+12.5%',
      changeType: 'positive',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            {t('dashboard')}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Welcome back! Here's what's happening with your organization.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            type="button"
            className="btn-secondary"
          >
            Generate Report
          </button>
          <button
            type="button"
            className="ml-3 btn-primary"
          >
            New Entry
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.title} className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${card.color} rounded-md p-3`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {card.title}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {card.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {card.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activities and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Journal Entries */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              {t('recentEntries')}
            </h3>
          </div>
          <div className="card-body p-0">
            {dashboardData?.recent_entries?.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {dashboardData.recent_entries.map((entry) => (
                  <li key={entry.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                          {entry.entry_number}
                        </p>
                        <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {entry.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(entry.entry_date)}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center space-x-2">
                        <span className={`badge ${entry.is_posted ? 'badge-success' : 'badge-warning'}`}>
                          {entry.is_posted ? t('posted') : t('draft')}
                        </span>
                        <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                          {formatCurrency(entry.total_debit)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('No recent entries')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Quick Actions
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-4">
              <button className="btn-primary w-full justify-center">
                <FileText className="h-4 w-4 mr-2" />
                Create Journal Entry
              </button>
              <button className="btn-secondary w-full justify-center">
                <Users className="h-4 w-4 mr-2" />
                Add Supplier
              </button>
              <button className="btn-secondary w-full justify-center">
                <Building className="h-4 w-4 mr-2" />
                New Project
              </button>
              <button className="btn-secondary w-full justify-center">
                <Calendar className="h-4 w-4 mr-2" />
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview Chart - Placeholder */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Financial Overview
          </h3>
        </div>
        <div className="card-body">
          <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">
              Chart component would go here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;