// frontend/src/components/Layout/Layout.jsx
import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = ({ children, toggleDarkMode, isDarkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isRTL } = useLanguage();

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isRTL={isRTL}
      />

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Header */}
        <Header
          setSidebarOpen={setSidebarOpen}
          toggleDarkMode={toggleDarkMode}
          isDarkMode={isDarkMode}
        />

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;