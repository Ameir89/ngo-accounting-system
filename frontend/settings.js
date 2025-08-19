// Add these components to the end of Settings.jsx

// Preferences Settings Component
const PreferencesSettings = () => {
  const { t, language, changeLanguage } = useLanguage();
  const [preferences, setPreferences] = useState({
    theme: 'light',
    dateFormat: 'dd/MM/yyyy',
    currency: 'USD',
    timezone: 'UTC',
    pageSize: 20,
    autoSave: true,
    notifications: true
  });

  const handleSave = () => {
    // Save preferences logic
    toast.success('Preferences saved successfully');
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
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} className="btn-primary">
          <Save className="h-4 w-4 mr-2" />
          {t('Save Preferences')}
        </button>
      </div>
    </div>
  );
};

// Notification Settings Component
const NotificationSettings = () => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
    journalEntries: true,
    reports: true,
    systemUpdates: false
  });

  const handleToggle = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
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
      </div>

      <div className="flex justify-end">
        <button className="btn-primary">
          <Save className="h-4 w-4 mr-2" />
          {t('Save Notification Settings')}
        </button>
      </div>
    </div>
  );
};

// System Settings Component  
const SystemSettings = () => {
  const { t } = useLanguage();
  
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
        </dl>
      </div>

      <div className="space-y-4">
        <button className="btn-secondary w-full">
          <Database className="h-4 w-4 mr-2" />
          {t('Backup Database')}
        </button>
        
        <button className="btn-secondary w-full">
          <Download className="h-4 w-4 mr-2" />
          {t('Export Data')}
        </button>
      </div>
    </div>
  );
};