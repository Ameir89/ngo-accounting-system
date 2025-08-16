// frontend/src/components/Layout/Navigation.jsx
import {
  BookOpen, ChevronDown, DollarSign,
  FileText, Home, Settings
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../hooks/useAuth';

const Navigation = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const [expandedSections, setExpandedSections] = useState({
    generalLedger: true,
    finance: false,
  });

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const navigationItems = [
    {
      name: t('dashboard'),
      href: '/',
      icon: Home,
      permission: 'dashboard_read',
    },
    {
      name: t('generalLedger'),
      icon: BookOpen,
      key: 'generalLedger',
      children: [
        {
          name: t('chartOfAccounts'),
          href: '/accounts',
          permission: 'account_read',
        },
        {
          name: t('journalEntries'),
          href: '/journal-entries',
          permission: 'journal_read',
        },
        {
          name: t('costCenters'),
          href: '/cost-centers',
          permission: 'cost_center_read',
        },
        {
          name: t('projects'),
          href: '/projects',
          permission: 'project_read',
        },
      ],
    },
    {
      name: t('finance'),
      icon: DollarSign,
      key: 'finance',
      children: [
        {
          name: t('budgets'),
          href: '/budgets',
          permission: 'budget_read',
        },
        {
          name: t('grants'),
          href: '/grants',
          permission: 'grant_read',
        },
        {
          name: t('suppliers'),
          href: '/suppliers',
          permission: 'supplier_read',
        },
        {
          name: t('receipts'),
          href: '/receipts',
          permission: 'receipt_read',
        },
        {
          name: t('fixedAssets'),
          href: '/fixed-assets',
          permission: 'asset_read',
        },
      ],
    },
    {
      name: t('reports'),
      href: '/reports',
      icon: FileText,
      permission: 'reports_read',
    },
    {
      name: t('settings'),
      href: '/settings',
      icon: Settings,
      permission: 'settings_read',
    },
  ];

  const isCurrentPath = (href) => {
    return location.pathname === href;
  };

  const isParentActive = (children) => {
    return children?.some(child => isCurrentPath(child.href));
  };

  const NavigationItem = ({ item }) => {
    if (!hasPermission(item.permission)) {
      return null;
    }

    if (item.children) {
      const isExpanded = expandedSections[item.key];
      const isActive = isParentActive(item.children);

      return (
        <div>
          <button
            onClick={() => toggleSection(item.key)}
            className={`group w-full flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              isActive
                ? 'bg-gray-900 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <item.icon className="mr-3 h-6 w-6 flex-shrink-0" />
            <span className="flex-1">{item.name}</span>
            <ChevronDown
              className={`ml-3 h-5 w-5 transform transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
          {isExpanded && (
            <div className="mt-1 space-y-1">
              {item.children.map((child) => (
                <NavigationSubItem key={child.href} item={child} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        to={item.href}
        className={({ isActive }) =>
          `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
            isActive
              ? 'bg-gray-900 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`
        }
      >
        <item.icon className="mr-3 h-6 w-6 flex-shrink-0" />
        {item.name}
      </NavLink>
    );
  };

  const NavigationSubItem = ({ item }) => {
    if (!hasPermission(item.permission)) {
      return null;
    }

    return (
      <NavLink
        to={item.href}
        className={({ isActive }) =>
          `group flex items-center pl-11 pr-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
            isActive
              ? 'bg-gray-900 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`
        }
      >
        {item.name}
      </NavLink>
    );
  };

  return (
    <nav className="mt-5 flex-1 px-2 space-y-1">
      {navigationItems.map((item) => (
        <NavigationItem key={item.name} item={item} />
      ))}
    </nav>
  );
};

export default Navigation;