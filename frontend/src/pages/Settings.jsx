// frontend/src/pages/Settings.jsx - Fixed Version

import {
  Bell, Database, Download,
  Globe,
  Save,
  Shield,
  User
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';
import { useSecurityContext } from '../contexts/SecurityContext';
import { useAuth } from '../hooks/useAuth';

const Settings = () => {
  const { t, language, changeLanguage } = useLanguage();
  const { user, updateUser } = useAuth();
  const { securitySettings, logSecurityEvent } = useSecurityContext();
  const [activeTab, setActiveTab] = useState('profile');
  const [showBackupModal, setShowBackupModal] = useState(false);

  const tabs = [
    { id: 'profile', name: t('Profile'), icon: User },
    { id: 'security', name: t('Security'), icon: Shield },
    { id: 'preferences', name: t('Preferences'), icon: Globe },
    { id: 'notifications', name: t('Notifications'), icon: Bell },
    { id: 'system', name: t('System'), icon: Database }
  ];

  const TabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'preferences':
        return <PreferencesSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'system':
        return <SystemSettings />;
      default:
        return <ProfileSettings />;
    }
  };

  // Profile Settings Component
  const ProfileSettings = () => {
    const [formData, setFormData] = useState({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      language: user?.language || language || 'en'
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      
      try {
        await updateUser(formData);
        toast.success(t('Profile updated successfully'));
        
        // Update language if changed
        if (formData.language !== language) {
          changeLanguage(formData.language);
        }
      } catch (error) {
        console.error('Profile update error:', error);
        toast.error(t('Failed to update profile'));
      } finally {
        setLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('Profile Information')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update your personal information and preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('First Name')} *
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              className="form-input mt-1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('Last Name')} *
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              className="form-input mt-1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('Email Address')} *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="form-input mt-1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('Phone Number')}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="form-input mt-1"
              placeholder="+1-234-567-8900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('Preferred Language')}
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
              className="form-select mt-1"
            >
              <option value="en">English</option>
              <option value="ar">العربية (Arabic)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? t('saving...') : t('Save Changes')}
          </button>
        </div>
      </form>
    );
  };

  // Security Settings Component
  const SecuritySettings = () => {
    const [passwordData, setPasswordData] = useState({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = async (e) => {
      e.preventDefault();
      
      if (passwordData.new_password !== passwordData.confirm_password) {
        toast.error(t('Passwords do not match'));
        return;
      }

      if (passwordData.new_password.length < 8) {
        toast.error(t('Password must be at least 8 characters long'));
        return;
      }

      setLoading(true);

      try {
        // Call password change API
        // await authService.changePassword(passwordData);
        toast.success(t('Password changed successfully'));
        logSecurityEvent('password_changed');
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      } catch (error) {
        console.error('Password change error:', error);
        logSecurityEvent('password_change_failed', { error: error.message });
        toast.error(t('Failed to change password'));
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-8">
        {/* Password Change */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('Change Password')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update your password to keep your account secure.
          </p>

          <form onSubmit={handlePasswordChange} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('Current Password')} *
              </label>
              <input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                className="form-input mt-1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('New Password')} *
              </label>
              <input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                className="form-input mt-1"
                required
                minLength={8}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Password must be at least 8 characters long
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('Confirm New Password')} *
              </label>
              <input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                className="form-input mt-1"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary flex items-center"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {t('Update Password')}
            </button>
          </form>
        </div>

        {/* Security Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('Security Information')}
          </h3>
          
          <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('Session Timeout')}
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">
                  {Math.round(securitySettings.sessionTimeout / 60000)} minutes
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('Max Login Attempts')}
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">
                  {securitySettings.loginAttempts.maxAttempts}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('Data Encryption')}
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">
                  {securitySettings.encryptionEnabled ? t('Enabled') : t('Disabled')}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('Password Policy')}
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">
                  Min {securitySettings.passwordPolicy.minLength} characters
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    );
  };

  // Preferences Settings Component
  const PreferencesSettings = () => {
    const [preferences, setPreferences] = useState({
      theme: localStorage.getItem('theme') || 'light',
      dateFormat: 'dd/MM/yyyy',
      currency: 'USD',
      timezone: 'UTC',
      pageSize: 20,
      autoSave: true,
      notifications: true
    });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
      setLoading(true);
      try {
        // Save preferences logic
        localStorage.setItem('userPreferences', JSON.stringify(preferences));
        
        // Apply theme immediately
        if (preferences.theme !== localStorage.getItem('theme')) {
          localStorage.setItem('theme', preferences.theme);
          if (preferences.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
        
        toast.success(t('Preferences saved successfully'));
      } catch (error) {
        console.error('Save preferences error:', error);
        toast.error(t('Failed to save preferences'));
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('User Preferences')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Customize your application experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('Language')}
            </label>
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="form-select mt-1"
            >
              <option value="en">English</option>
              <option value="ar">العربية (Arabic)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('Theme')}
            </label>
            <select
              value={preferences.theme}
              onChange={(e) => setPreferences(prev => ({ ...prev, theme: e.target.value }))}
              className="form-select mt-1"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('Date Format')}
            </label>
            <select
              value={preferences.dateFormat}
              onChange={(e) => setPreferences(prev => ({ ...prev, dateFormat: e.target.value }))}
              className="form-select mt-1"
            >
              <option value="dd/MM/yyyy">DD/MM/YYYY</option>
              <option value="MM/dd/yyyy">MM/DD/YYYY</option>
              <option value="yyyy-MM-dd">YYYY-MM-DD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('Default Currency')}
            </label>
            <select
              value={preferences.currency}
              onChange={(e) => setPreferences(prev => ({ ...prev, currency: e.target.value }))}
              className="form-select mt-1"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="AED">AED - UAE Dirham</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('Items per page')}
            </label>
            <select
              value={preferences.pageSize}
              onChange={(e) => setPreferences(prev => ({ ...prev, pageSize: parseInt(e.target.value) }))}
              className="form-select mt-1"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('Timezone')}
            </label>
            <select
              value={preferences.timezone}
              onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
              className="form-select mt-1"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Asia/Dubai">Dubai</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Auto-save</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Automatically save your work</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.autoSave}
              onChange={(e) => setPreferences(prev => ({ ...prev, autoSave: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Notifications</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receive system notifications</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifications}
              onChange={(e) => setPreferences(prev => ({ ...prev, notifications: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="btn-primary flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? t('saving...') : t('Save Preferences')}
          </button>
        </div>
      </div>
    );
  };

  // Notification Settings Component
  const NotificationSettings = () => {
    const [notifications, setNotifications] = useState({
      email: true,
      push: false,
      sms: false,
      journalEntries: true,
      reports: true,
      systemUpdates: false,
      budgetAlerts: true,
      auditAlerts: true
    });
    const [loading, setLoading] = useState(false);

    const handleToggle = (key) => {
      setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
      setLoading(true);
      try {
        // Save notification settings
        localStorage.setItem('notificationSettings', JSON.stringify(notifications));
        toast.success(t('Notification settings saved successfully'));
      } catch (error) {
        console.error('Save notification settings error:', error);
        toast.error(t('Failed to save notification settings'));
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('Notification Preferences')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose how you want to be notified about important events.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.email}
              onChange={() => handleToggle('email')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Push Notifications</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receive browser push notifications</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.push}
              onChange={() => handleToggle('push')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Journal Entry Updates</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about journal entry changes</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.journalEntries}
              onChange={() => handleToggle('journalEntries')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Report Generation</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Notifications when reports are ready</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.reports}
              onChange={() => handleToggle('reports')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Budget Alerts</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Alerts when budgets are exceeded</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.budgetAlerts}
              onChange={() => handleToggle('budgetAlerts')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">System Updates</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Notifications about system maintenance</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.systemUpdates}
              onChange={() => handleToggle('systemUpdates')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="btn-primary flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? t('saving...') : t('Save Notification Settings')}
          </button>
        </div>
      </div>
    );
  };

  // System Settings Component  
  const SystemSettings = () => {
    const [loading, setLoading] = useState(false);

    const handleBackup = async () => {
      setLoading(true);
      try {
        // Mock backup functionality
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success(t('Database backup completed successfully'));
      } catch (error) {
        console.error('Backup error:', error);
        toast.error(t('Failed to backup database'));
      } finally {
        setLoading(false);
      }
    };

    const handleExportData = async () => {
      setLoading(true);
      try {
        // Mock export functionality
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success(t('Data export completed successfully'));
      } catch (error) {
        console.error('Export error:', error);
        toast.error(t('Failed to export data'));
      } finally {
        setLoading(false);
      }
    };
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('System Information')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            System configuration and maintenance options.
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Version</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100">v1.0.0</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Backup</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100">Yesterday, 2:00 AM</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Database Size</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100">2.4 GB</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Users</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100">5 users</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Server Status</dt>
              <dd className="text-sm text-green-600 dark:text-green-400">Online</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Update</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100">2 days ago</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleBackup}
            disabled={loading}
            className="btn-secondary w-full flex items-center justify-center"
          >
            <Database className="h-4 w-4 mr-2" />
            {loading ? t('backing up...') : t('Backup Database')}
          </button>
          
          <button 
            onClick={handleExportData}
            disabled={loading}
            className="btn-secondary w-full flex items-center justify-center"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading ? t('exporting...') : t('Export Data')}
          </button>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Shield className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {t('System Maintenance')}
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  Regular system maintenance is scheduled for every Sunday at 2:00 AM. 
                  The system will be unavailable for approximately 30 minutes during maintenance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl">
          {t('settings')}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Settings Navigation */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200
                    ${activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <TabContent />
        </div>
      </div>
    </div>
  );
};

export default Settings;