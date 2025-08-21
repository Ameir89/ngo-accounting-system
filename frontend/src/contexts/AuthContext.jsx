// frontend/src/contexts/AuthContext.jsx - Enhanced with better error handling
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  const [error, setError] = useState(null);
  
  // Use refs to prevent infinite loops and unnecessary re-renders
  const initializationRef = useRef(false);
  const autoLogoutCleanupRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  // Memoized auth check function
  const checkAuth = useCallback(async () => {
    // Prevent multiple initialization attempts
    if (initializationRef.current) {
      return;
    }
    initializationRef.current = true;

    try {
      setError(null);
      
      // Check if user is authenticated with valid token
      if (authService.isAuthenticated()) {
        const currentUser = authService.getCurrentUser();
        const isTokenValid = authService.isTokenValid();
        
        if (currentUser && isTokenValid) {
          // Try to refresh user data silently
          try {
            const refreshedUser = await authService.refreshUserData();
            setUser(refreshedUser || currentUser);
          } catch (refreshError) {
            console.warn('Failed to refresh user data, using cached user:', refreshError);
            // Use cached user data if refresh fails (non-critical error)
            setUser(currentUser);
          }
        } else {
          // Invalid token or user data
          console.warn('Invalid authentication state, clearing session');
          authService.clearSession();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setError(error.message);
      
      // Only logout if there was a real authentication error
      if (error.response?.status === 401) {
        authService.clearSession();
      }
      setUser(null);
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  }, []); // Empty dependency array is correct here

  // Initialize authentication state
  useEffect(() => {
    if (!isInitialized) {
      checkAuth();
    }
  }, [checkAuth, isInitialized]);

  // Setup auto-logout and refresh intervals
  useEffect(() => {
    if (isInitialized && user) {
      try {
        // FIXED: Check if setupAutoLogout exists before calling it
        if (authService.setupAutoLogout && typeof authService.setupAutoLogout === 'function') {
          autoLogoutCleanupRef.current = authService.setupAutoLogout(30); // 30 minutes
        } else {
          console.warn('⚠️ setupAutoLogout method not available in authService');
        }

        // Setup periodic token validation (every 5 minutes)
        refreshIntervalRef.current = setInterval(() => {
          try {
            if (authService.isAuthenticated() && authService.isTokenValid()) {
              // Token is still valid, optionally refresh user data
              authService.refreshUserData().catch(error => {
                console.warn('Background user data refresh failed:', error);
                if (error.response?.status === 401) {
                  handleLogout('token_expired');
                }
              });
            } else {
              // Token is invalid, logout user
              handleLogout('token_invalid');
            }
          } catch (error) {
            console.warn('Token validation error:', error);
          }
        }, 5 * 60 * 1000); // 5 minutes

        return () => {
          // Cleanup
          try {
            if (autoLogoutCleanupRef.current && typeof autoLogoutCleanupRef.current === 'function') {
              autoLogoutCleanupRef.current();
              autoLogoutCleanupRef.current = null;
            }
          } catch (error) {
            console.warn('Error during auto-logout cleanup:', error);
          }
          
          if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
          }
        };
      } catch (error) {
        console.error('Error setting up auth monitoring:', error);
        setError('Failed to setup authentication monitoring');
      }
    }
  }, [isInitialized, user]);

  // Enhanced login function
  const login = useCallback(async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const { user: userData } = await authService.login(credentials);
      setUser(userData);
      
      return userData;
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.message);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Enhanced logout function
  const handleLogout = useCallback(async (reason = 'user_initiated') => {
    try {
      setLoading(true);
      setError(null);
      
      // Cleanup intervals
      try {
        if (autoLogoutCleanupRef.current && typeof autoLogoutCleanupRef.current === 'function') {
          autoLogoutCleanupRef.current();
          autoLogoutCleanupRef.current = null;
        }
      } catch (error) {
        console.warn('Error during logout cleanup:', error);
      }
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      await authService.logout(reason);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear state even if logout fails
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update user function
  const updateUser = useCallback((userData) => {
    try {
      const success = authService.updateUser(userData);
      if (success) {
        setUser(prevUser => ({ ...prevUser, ...userData }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update user:', error);
      setError('Failed to update user data');
      return false;
    }
  }, []);

  // Permission check function
  const hasPermission = useCallback((permission) => {
    try {
      return authService.hasPermission(permission, user);
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }, [user]);

  // Change password function
  const changePassword = useCallback(async (passwordData) => {
    try {
      setError(null);
      const result = await authService.changePassword(passwordData);
      return result;
    } catch (error) {
      console.error('Password change failed:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  // Request password reset function
  const requestPasswordReset = useCallback(async (email) => {
    try {
      setError(null);
      const result = await authService.requestPasswordReset(email);
      return result;
    } catch (error) {
      console.error('Password reset request failed:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  // Reset password function
  const resetPassword = useCallback(async (resetData) => {
    try {
      setError(null);
      const result = await authService.resetPassword(resetData);
      return result;
    } catch (error) {
      console.error('Password reset failed:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  // Get security events function
  const getSecurityEvents = useCallback((limit = 50) => {
    try {
      return authService.getSecurityEvents ? authService.getSecurityEvents(limit) : [];
    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  }, []);

  // Refresh user data function
  const refreshUserData = useCallback(async () => {
    try {
      setError(null);
      const refreshedUser = await authService.refreshUserData();
      if (refreshedUser) {
        setUser(refreshedUser);
        return refreshedUser;
      }
      return null;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      setError(error.message);
      
      // If auth error, logout user
      if (error.response?.status === 401) {
        await handleLogout('auth_failed');
      }
      
      throw error;
    }
  }, [handleLogout]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    // State
    user,
    loading,
    isInitialized,
    error,
    isAuthenticated: !!user,
    
    // Auth actions
    login,
    logout: handleLogout,
    updateUser,
    refreshUserData,
    
    // Permission utilities
    hasPermission,
    
    // Password management
    changePassword,
    requestPasswordReset,
    resetPassword,
    
    // Security utilities
    getSecurityEvents,
    
    // Utility functions
    clearError: () => setError(null),
  }), [
    user,
    loading,
    isInitialized,
    error,
    login,
    handleLogout,
    updateUser,
    refreshUserData,
    hasPermission,
    changePassword,
    requestPasswordReset,
    resetPassword,
    getSecurityEvents,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Enhanced useAuth hook with additional utilities
export const useAuth = () => {
  const context = useAuthContext();
  
  // Additional derived values
  const isAdmin = useMemo(() => {
    return context.user?.role_name === 'Administrator';
  }, [context.user]);

  const userDisplayName = useMemo(() => {
    const { user } = context;
    if (!user) return '';
    
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else {
      return user.username || user.email || 'User';
    }
  }, [context.user]);

  const userRole = useMemo(() => {
    return context.user?.role_name || 'Guest';
  }, [context.user]);

  return {
    ...context,
    isAdmin,
    userDisplayName,
    userRole,
  };
};

// Permission-based component wrapper
export const ProtectedComponent = ({ permission, fallback = null, children }) => {
  const { hasPermission } = useAuth();
  
  try {
    if (!hasPermission(permission)) {
      return fallback;
    }
    
    return children;
  } catch (error) {
    console.error('ProtectedComponent error:', error);
    return fallback;
  }
};

// Role-based component wrapper
export const RoleProtectedComponent = ({ allowedRoles = [], fallback = null, children }) => {
  const { user } = useAuth();
  
  try {
    if (!user || !allowedRoles.includes(user.role_name)) {
      return fallback;
    }
    
    return children;
  } catch (error) {
    console.error('RoleProtectedComponent error:', error);
    return fallback;
  }
};

export default AuthContext;