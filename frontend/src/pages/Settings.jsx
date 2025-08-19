// frontend/src/pages/Settings.jsx

import {
    Bell, Database,
    Globe,
    Save,
    Shield,
    User
} from 'lucide-react';
import { useState } from 'react';
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
                    py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
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

// Profile Settings Component
const ProfileSettings = () => {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    language: user?.language || 'en'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await updateUser(formData);
      // Show success message
    } catch (error) {
      // Show error message
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
            {t('First Name')}
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
            {t('Last Name')}
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
            {t('Email Address')}
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
          className="btn-primary"
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
  const { t } = useLanguage();
  const { securitySettings, logSecurityEvent } = useSecurityContext();
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      // Show error
      return;
    }

    try {
      // Call password change API
      logSecurityEvent('password_changed');
      // Show success message
    } catch (error) {
      logSecurityEvent('password_change_failed', { error: error.message });
      // Show error message
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
              {t('Current Password')}
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
              {t('New Password')}
            </label>
            <input
              type="password"
              value={passwordData.new_password}
              onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
              className="form-input mt-1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('Confirm New Password')}
            </label>
            <input
              type="password"
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
              className="form-input mt-1"
              required
            />
          </div>

          <button type="submit" className="btn-primary">
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
                {securitySettings.sessionTimeout / 60000} minutes
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
          </dl>
        </div>
      </div>
    </div>
  );
};

export default Settings;