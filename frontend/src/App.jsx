// frontend/src/App.jsx - Optimized Version
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";

// Context Providers
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SecurityProvider } from "./contexts/SecurityContext";

// Layout Components
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout/Layout";
import LoadingSpinner from "./components/UI/LoadingSpinner";
import LoginPage from "./pages/Login";

// Hooks
import { useAuth } from "./hooks/useAuth";

// Lazy load pages for better performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ChartOfAccounts = lazy(() => import("./pages/ChartOfAccounts"));
const JournalEntries = lazy(() => import("./pages/JournalEntries"));
const CostCenters = lazy(() => import("./pages/CostCenters"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Projects = lazy(() => import("./pages/Projects"));
const Grants = lazy(() => import("./pages/Grants"));
const FixedAssets = lazy(() => import("./pages/FixedAssets"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const BudgetManagement = lazy(() => import("./pages/BudgetManagement"));
const AuditTrail = lazy(() => import("./pages/AuditTrail"));
const UserManagement = lazy(() => import("./pages/UserManagement"));

// Optimized Query Client with better defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
    },
    mutations: {
      retry: 1,
    },
  },
});

// Enhanced Protected Route with better loading
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" message="Loading your dashboard..." />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

// Page Loading Fallback
const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" message="Loading page..." />
  </div>
);

// Main App Component
const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from localStorage or system preference
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        isDarkMode ? "#1f2937" : "#4f46e5"
      );
    }
  }, [isDarkMode]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      if (!localStorage.getItem("theme")) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <SecurityProvider>
              <Router>
                <div
                  className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200`}
                >
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                      path="/*"
                      element={
                        <ProtectedRoute>
                          <Layout
                            toggleDarkMode={toggleDarkMode}
                            isDarkMode={isDarkMode}
                          >
                            <Suspense fallback={<PageFallback />}>
                              <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route
                                  path="/accounts"
                                  element={<ChartOfAccounts />}
                                />
                                <Route
                                  path="/journal-entries"
                                  element={<JournalEntries />}
                                />
                                <Route
                                  path="/cost-centers"
                                  element={<CostCenters />}
                                />
                                <Route
                                  path="/audit-trail"
                                  element={<AuditTrail />}
                                />
                                <Route
                                  path="/users"
                                  element={<UserManagement />}
                                />
                                <Route
                                  path="/projects"
                                  element={<Projects />}
                                />
                                <Route
                                  path="/budgets"
                                  element={<BudgetManagement />}
                                />
                                <Route
                                  path="/suppliers"
                                  element={<Suppliers />}
                                />
                                <Route path="/grants" element={<Grants />} />
                                <Route
                                  path="/fixed-assets"
                                  element={<FixedAssets />}
                                />
                                <Route path="/reports" element={<Reports />} />
                                <Route
                                  path="/settings"
                                  element={<Settings />}
                                />
                                <Route
                                  path="*"
                                  element={<Navigate to="/" replace />}
                                />
                              </Routes>
                            </Suspense>
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </div>
              </Router>

              {/* Enhanced Toast Notifications */}
              <Toaster
                position="top-right"
                gutter={8}
                containerClassName="z-50"
                toastOptions={{
                  duration: 4000,
                  className:
                    "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 shadow-lg",
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: "#10b981",
                      secondary: "#ffffff",
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: "#ef4444",
                      secondary: "#ffffff",
                    },
                  },
                  loading: {
                    duration: Infinity,
                  },
                }}
              />
            </SecurityProvider>
          </AuthProvider>
        </LanguageProvider>

        {/* React Query DevTools - Only in development */}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
