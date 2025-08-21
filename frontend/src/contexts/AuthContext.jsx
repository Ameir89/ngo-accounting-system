// frontend/src/contexts/AuthContext.jsx - Fixed version to prevent infinite loops
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext();

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use ref to prevent infinite loops
  const initializationRef = useRef(false);

  // Memoize the auth check function to prevent recreating on every render
  const checkAuth = useCallback(async () => {
    // Prevent multiple initialization attempts
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      const savedUser = authService.getCurrentUser();
      const token = authService.getToken();
      
      if (savedUser && token) {
        // Try to refresh user data, but don't fail if it doesn't work
        try {
          const userData = await authService.refreshUserData();
          setUser(userData || savedUser);
        } catch (refreshError) {
          console.warn('Failed to refresh user data, using cached user:', refreshError);
          // Use cached user data if refresh fails
          setUser(savedUser);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Only logout if there was a real authentication error
      if (error.response?.status === 401) {
        authService.logout();
      }
      setUser(null);
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  }, []); // Empty dependency array is correct here

  // Initialize auth state only once
  useEffect(() => {
    if (!isInitialized) {
      checkAuth();
    }
  }, [checkAuth, isInitialized]);

  const login = useCallback(async (credentials) => {
    try {
      setLoading(true);
      const { user: userData } = await authService.login(credentials);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setLoading(false);
    authService.logout();
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const hasPermission = useCallback((permission) => {
    if (!user || !user.role_name) return false;
    
    // Admin has all permissions
    if (user.role_name === 'Administrator') return true;
    
    // Define role permissions
    const rolePermissions = {
      'Financial Manager': [
        'account_create', 'account_read', 'account_update',
        'journal_create', 'journal_read', 'journal_update', 'journal_post',
        'cost_center_read', 'project_read', 'budget_read',
        'grant_read', 'supplier_read', 'asset_read',
        'reports_read', 'dashboard_read'
      ],
      'Accountant': [
        'account_read', 'journal_create', 'journal_read',
        'cost_center_read', 'project_read', 'reports_read', 'dashboard_read'
      ],
      'Data Entry Clerk': [
        'account_read', 'journal_create', 'journal_read',
        'cost_center_read', 'project_read', 'dashboard_read'
      ],
      'Auditor': [
        'account_read', 'journal_read', 'cost_center_read', 'project_read',
        'budget_read', 'grant_read', 'supplier_read', 'asset_read',
        'reports_read', 'dashboard_read', 'audit_read'
      ]
    };

    const userPermissions = rolePermissions[user.role_name] || [];
    return userPermissions.includes(permission);
  }, [user]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = {
    user,
    loading,
    login,
    logout,
    updateUser,
    hasPermission,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;