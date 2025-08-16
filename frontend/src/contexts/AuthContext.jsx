// frontend/src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const savedUser = authService.getCurrentUser();
        const token = authService.getToken();
        
        if (savedUser && token) {
          // Verify token is still valid by fetching current user data
          const userData = await authService.refreshUserData();
          setUser(userData || savedUser);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
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
  };

  const logout = () => {
    setUser(null);
    authService.logout();
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const hasPermission = (permission) => {
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
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    hasPermission,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;