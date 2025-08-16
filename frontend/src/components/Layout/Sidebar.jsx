// frontend/src/components/Layout/Sidebar.jsx
import { X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import Navigation from './Navigation';

const Sidebar = ({ sidebarOpen, setSidebarOpen, isRTL }) => {
  const { t } = useLanguage();

  return (
    <>
      {/* Mobile sidebar overlay */}
      <div className={`fixed inset-0 z-40 bg-gray-600 bg-opacity-75 transition-opacity ease-linear duration-300 ${
        sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } lg:hidden`}>
        <div className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} flex w-64 transition ease-in-out duration-300 transform ${
          sidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')
        }`}>
          <div className="flex-1 flex flex-col min-h-0 bg-gray-800">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center justify-between flex-shrink-0 px-4">
                <h2 className="text-lg font-semibold text-white">
                  {t('navigation', 'Navigation')}
                </h2>
                <button
                  className="text-gray-300 hover:text-white focus:outline-none focus:text-white"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <Navigation />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 bg-gray-800">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4 mb-5">
                <h2 className="text-lg font-semibold text-white">
                  {t('navigation', 'Navigation')}
                </h2>
              </div>
              <Navigation />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;