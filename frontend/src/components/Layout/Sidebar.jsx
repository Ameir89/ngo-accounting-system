// frontend/src/components/Layout/Sidebar.jsx - Updated for Dark Mode
import { X } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import EnhancedNavigation from "./Navigation";

const Sidebar = ({ sidebarOpen, setSidebarOpen, isRTL }) => {
  const { t } = useLanguage();

  const handleItemClick = () => {
    // Close mobile sidebar when item is clicked
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile sidebar overlay */}
      <div
        className={`
          fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm 
          transition-opacity ease-linear duration-300 
          ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"} 
          lg:hidden
        `}
        onClick={() => setSidebarOpen(false)}
      >
        <div
          className={`
            fixed inset-y-0 ${isRTL ? "right-0" : "left-0"} 
            flex w-64 transition ease-in-out duration-300 transform 
            ${
              sidebarOpen
                ? "translate-x-0"
                : isRTL
                ? "translate-x-full"
                : "-translate-x-full"
            }
          `}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center justify-between flex-shrink-0 px-4 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">NG</span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    NGO Accounting
                  </h2>
                </div>
                <button
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md p-1 transition-colors duration-200"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <EnhancedNavigation
                isMobile={true}
                onItemClick={handleItemClick}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold">NG</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      NGO Accounting
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Financial Management
                    </p>
                  </div>
                </div>
              </div>
              <EnhancedNavigation onItemClick={handleItemClick} />
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                © 2025 NGO Accounting
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
