// frontend/src/components/Layout/EnhancedNavigation.jsx - Fixed Active States
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  Database,
  DollarSign,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Home,
  Layers,
  Search,
  Settings,
  Shield,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../hooks/useAuth";

// Memoized Navigation Item to prevent unnecessary re-renders
const NavigationItem = memo(({ item, sectionColor, onItemClick }) => {
  const { isRTL } = useLanguage();
  const location = useLocation();
  const ItemIcon = item.icon;

  const isActive = useMemo(() => {
    if (item.href === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(item.href);
  }, [item.href, location.pathname]);

  const colorClasses = useMemo(
    () => getColorClasses(sectionColor, isActive),
    [sectionColor, isActive]
  );

  return (
    <NavLink
      to={item.href}
      onClick={onItemClick}
      className={`
        group flex items-center justify-between px-3 py-2.5 text-sm rounded-lg 
        transition-all duration-200 hover:scale-[1.02] hover:shadow-sm focus:outline-none
        focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
        ${
          isActive
            ? `${colorClasses.bg} ${colorClasses.text} shadow-sm border ${colorClasses.border}`
            : `hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400`
        }
      `}
      aria-label={`Navigate to ${item.name}`}
    >
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <ItemIcon
          className={`h-4 w-4 flex-shrink-0 ${
            isActive
              ? colorClasses.icon
              : "text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
          }`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{item.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {item.description}
          </div>
        </div>
      </div>

      {item.badge && (
        <span
          className={`
          inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
          ${
            item.badge === "Hot"
              ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              : item.badge === "New"
              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
              : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
          }
        `}
        >
          {item.badge}
        </span>
      )}
    </NavLink>
  );
});

NavigationItem.displayName = "NavigationItem";

// Memoized Navigation Section
const NavigationSection = memo(
  ({ section, expandedSections, toggleSection, onItemClick }) => {
    const { hasPermission } = useAuth();
    const location = useLocation();

    const visibleItems = useMemo(
      () => section.items || [], // Disabled permission check - show all items
      [section.items]
    );

    const isParentActive = useMemo(() => {
      return visibleItems.some((item) => {
        if (item.href === "/") {
          return location.pathname === "/";
        }
        return location.pathname.startsWith(item.href);
      });
    }, [visibleItems, location.pathname]);

    if (visibleItems.length === 0) return null;

    const isExpanded = expandedSections[section.id];
    const colorClasses = getColorClasses(section.color, isParentActive);
    const SectionIcon = section.icon;

    return (
      <div className={`mb-2 ${section.id === "overview" ? "mb-6" : ""}`}>
        {section.id !== "overview" && (
          <button
            onClick={() => toggleSection(section.id)}
            className={`
            w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg 
            transition-all duration-200 group hover:bg-gray-50 dark:hover:bg-gray-700/50
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
            dark:focus:ring-offset-gray-800 
            ${
              isParentActive
                ? `${colorClasses.bg} ${colorClasses.text} shadow-sm border ${colorClasses.border}`
                : "text-gray-700 dark:text-gray-300"
            }
          `}
            aria-expanded={isExpanded}
            aria-controls={`section-${section.id}`}
          >
            <div className="flex items-center space-x-3">
              <SectionIcon
                className={`h-5 w-5 ${
                  isParentActive
                    ? colorClasses.icon
                    : "text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                }`}
                aria-hidden="true"
              />
              <span className="font-semibold">{section.title}</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 transform transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              } ${
                isParentActive
                  ? colorClasses.icon
                  : "text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
              }`}
              aria-hidden="true"
            />
          </button>
        )}

        {(isExpanded || section.id === "overview") && (
          <div
            id={`section-${section.id}`}
            className={`space-y-1 ${
              section.id !== "overview" ? "mt-2 ml-2" : ""
            }`}
          >
            {visibleItems.map((item) => (
              <NavigationItem
                key={item.href}
                item={item}
                sectionColor={section.color}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

NavigationSection.displayName = "NavigationSection";

// Enhanced Search Results with keyboard navigation
const SearchResults = memo(
  ({ searchQuery, filteredItems, onItemClick, onClearSearch }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const resultsRef = useRef(null);

    useEffect(() => {
      setSelectedIndex(0);
    }, [filteredItems]);

    const handleKeyDown = useCallback(
      (e) => {
        if (!filteredItems.length) return;

        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev) =>
              Math.min(prev + 1, filteredItems.length - 1)
            );
            break;
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
            break;
          case "Enter":
            e.preventDefault();
            if (filteredItems[selectedIndex]) {
              onItemClick(filteredItems[selectedIndex]);
              onClearSearch();
            }
            break;
          case "Escape":
            e.preventDefault();
            onClearSearch();
            break;
        }
      },
      [filteredItems, selectedIndex, onItemClick, onClearSearch]
    );

    useEffect(() => {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    if (!searchQuery.trim() || filteredItems.length === 0) return null;

    return (
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Search Results ({filteredItems.length})
        </div>
        <div ref={resultsRef} className="space-y-1 max-h-48 overflow-y-auto">
          {filteredItems.slice(0, 5).map((item, index) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => {
                onItemClick();
                onClearSearch();
              }}
              className={`block px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-600 
              transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500
              ${index === selectedIndex ? "bg-gray-100 dark:bg-gray-600" : ""}
            `}
            >
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {item.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                in {item.section}
              </div>
            </NavLink>
          ))}
        </div>
        {filteredItems.length > 5 && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            and {filteredItems.length - 5} more results...
          </div>
        )}
      </div>
    );
  }
);

SearchResults.displayName = "SearchResults";

// Helper functions
const getColorClasses = (color, isActive = false) => {
  const colors = {
    blue: {
      bg: isActive ? "bg-blue-50 dark:bg-blue-900/20" : "",
      text: isActive
        ? "text-blue-700 dark:text-blue-300"
        : "text-gray-600 dark:text-gray-400",
      icon: isActive
        ? "text-blue-600 dark:text-blue-400"
        : "text-gray-500 dark:text-gray-400",
      border: isActive ? "border-blue-200 dark:border-blue-700" : "",
    },
    green: {
      bg: isActive ? "bg-green-50 dark:bg-green-900/20" : "",
      text: isActive
        ? "text-green-700 dark:text-green-300"
        : "text-gray-600 dark:text-gray-400",
      icon: isActive
        ? "text-green-600 dark:text-green-400"
        : "text-gray-500 dark:text-gray-400",
      border: isActive ? "border-green-200 dark:border-green-700" : "",
    },
    purple: {
      bg: isActive ? "bg-purple-50 dark:bg-purple-900/20" : "",
      text: isActive
        ? "text-purple-700 dark:text-purple-300"
        : "text-gray-600 dark:text-gray-400",
      icon: isActive
        ? "text-purple-600 dark:text-purple-400"
        : "text-gray-500 dark:text-gray-400",
      border: isActive ? "border-purple-200 dark:border-purple-700" : "",
    },
    gray: {
      bg: isActive ? "bg-gray-50 dark:bg-gray-700" : "",
      text: isActive
        ? "text-gray-900 dark:text-gray-100"
        : "text-gray-600 dark:text-gray-400",
      icon: isActive
        ? "text-gray-700 dark:text-gray-300"
        : "text-gray-500 dark:text-gray-400",
      border: isActive ? "border-gray-200 dark:border-gray-600" : "",
    },
  };
  return colors[color] || colors.gray;
};

// Main Navigation Component
const EnhancedNavigation = ({ isMobile = false, onItemClick }) => {
  const location = useLocation();
  const { t, isRTL } = useLanguage();
  const { hasPermission } = useAuth();

  const [expandedSections, setExpandedSections] = useState({
    generalLedger: true,
    finance: false,
    reports: false,
    administration: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);
  const searchRef = useRef(null);

  // Navigation configuration
  const navigationSections = useMemo(
    () => [
      {
        id: "overview",
        title: t("Overview"),
        icon: Activity,
        items: [
          {
            name: t("dashboard"),
            href: "/",
            icon: Home,
            permission: "dashboard_read",
            description: "Financial overview and key metrics",
            badge: null,
          },
        ],
      },
      {
        id: "generalLedger",
        title: t("General Ledger"),
        icon: BookOpen,
        color: "blue",
        items: [
          {
            name: t("chartOfAccounts"),
            href: "/accounts",
            icon: Layers,
            permission: "account_read",
            description: "Manage chart of accounts",
            badge: null,
          },
          {
            name: t("journalEntries"),
            href: "/journal-entries",
            icon: FileText,
            permission: "journal_read",
            description: "Record financial transactions",
            badge: null,
          },
          {
            name: t("costCenters"),
            href: "/cost-centers",
            icon: Target,
            permission: "journal_read",
            description: "Organize expenses by department",
            badge: null,
          },
          {
            name: t("projects"),
            href: "/projects",
            icon: Building2,
            permission: "project_read",
            description: "Track project finances",
            badge: null,
          },
        ],
      },
      {
        id: "finance",
        title: t("Finance & Operations"),
        icon: DollarSign,
        color: "green",
        items: [
          {
            name: t("budgets"),
            href: "/budgets",
            icon: BarChart3,
            permission: "budget_read",
            description: "Plan and track budgets",
            badge: null,
          },
          {
            name: t("grants"),
            href: "/grants",
            icon: Wallet,
            permission: "grant_read",
            description: "Manage grants and funding",
            badge: "Hot",
          },
          {
            name: t("suppliers"),
            href: "/suppliers",
            icon: Users,
            permission: "supplier_read",
            description: "Vendor management",
            badge: null,
          },
          {
            name: t("fixedAssets"),
            href: "/fixed-assets",
            icon: Database,
            permission: "asset_read",
            description: "Asset tracking and depreciation",
            badge: null,
          },
        ],
      },
      {
        id: "reports",
        title: t("Reports & Analytics"),
        icon: TrendingUp,
        color: "purple",
        items: [
          {
            name: t("Financial Reports"),
            href: "/reports",
            icon: FileSpreadsheet,
            permission: "reports_read",
            description: "Generate financial statements",
            badge: null,
          },
          {
            name: t("Analytics Dashboard"),
            href: "/analytics",
            icon: BarChart3,
            permission: "reports_read",
            description: "Advanced data insights",
            badge: "New",
          },
          {
            name: t("Audit Trail"),
            href: "/audit-trail",
            icon: Shield,
            permission: "audit_read",
            description: "Track system changes",
            badge: null,
          },
        ],
      },
      {
        id: "administration",
        title: t("Administration"),
        icon: Settings,
        color: "gray",
        items: [
          {
            name: t("User Management"),
            href: "/users",
            icon: Users,
            permission: "user_read",
            description: "Manage user accounts",
            badge: null,
          },
          {
            name: t("System Settings"),
            href: "/settings",
            icon: Settings,
            permission: "settings_read",
            description: "Configure system preferences",
            badge: null,
          },
          {
            name: t("Notifications"),
            href: "/notifications",
            icon: Bell,
            permission: "notification_read",
            description: "Manage alerts and notifications",
            badge: "3",
          },
        ],
      },
    ],
    [t]
  );

  const toggleSection = useCallback((sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  // Search functionality with debouncing
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = [];
      navigationSections.forEach((section) => {
        section.items.forEach((item) => {
          if (
            // hasPermission(item.permission) && // Disabled permission check
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            filtered.push({ ...item, section: section.title });
          }
        });
      });
      setFilteredItems(filtered);
    } else {
      setFilteredItems([]);
    }
  }, [searchQuery, navigationSections]); // Removed hasPermission dependency

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setFilteredItems([]);
  }, []);

  return (
    <nav
      className="space-y-1 px-3 py-4"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Enhanced Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
          <input
            ref={searchRef}
            type="text"
            placeholder={t("Search navigation...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 
              rounded-lg bg-white dark:bg-gray-700 text-sm transition-colors duration-200
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              dark:text-white placeholder-gray-400 dark:placeholder-gray-500
            "
            aria-label="Search navigation items"
          />
        </div>
        <SearchResults
          searchQuery={searchQuery}
          filteredItems={filteredItems}
          onItemClick={onItemClick}
          onClearSearch={clearSearch}
        />
      </div>

      {/* Navigation Sections */}
      <div className="space-y-1">
        {navigationSections.map((section) => (
          <NavigationSection
            key={section.id}
            section={section}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            onItemClick={onItemClick}
          />
        ))}
      </div>

      {/* Quick Help */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          className="
            w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400
            rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
            dark:focus:ring-offset-gray-800
          "
          aria-label="Help and support"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          <span>Help & Support</span>
        </button>
      </div>
    </nav>
  );
};

export default memo(EnhancedNavigation);
