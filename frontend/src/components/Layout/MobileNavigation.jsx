// frontend/src/components/Layout/MobileNavigation.jsx

import { FileText, Home, Menu, Settings, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const MobileNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t, isRTL } = useLanguage();

  const navigationItems = [
    { name: t('dashboard'), href: '/', icon: Home },
    { name: t('journalEntries'), href: '/journal-entries', icon: FileText },
    { name: t('suppliers'), href: '/suppliers', icon: Users },
    { name: t('reports'), href: '/reports', icon: FileText },
    { name: t('settings'), href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile slide-over */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-25"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-over panel */}
          <div className={`
            fixed top-0 bottom-0 w-full max-w-sm bg-white shadow-xl transform transition-transform
            ${isRTL ? 'right-0' : 'left-0'}
            ${isOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}
          `}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-medium text-gray-900">
                NGO Accounting
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="px-4 py-6 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-center px-3 py-2 text-base font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className={`h-6 w-6 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                    {item.name}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNavigation;