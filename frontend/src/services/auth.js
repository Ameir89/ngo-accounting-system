// frontend/src/services/auth.js - Enhanced with better error handling (RememberMe removed)
import { apiService } from './api';

// Auth service utilities
const AUTH_STORAGE_KEYS = {
  TOKEN: 'authToken',
  USER: 'user',
  REFRESH_TOKEN: 'refreshToken',
};

// Token validation utility
const validateToken = (token) => {
  if (!token) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const payload = JSON.parse(atob(parts[1]));
    const now = Date.now() / 1000;
    
    // Check if token is expired (with 5 minute buffer)
    if (payload.exp && payload.exp < now + 300) {
      console.warn('Token is expired or expiring soon');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

// Secure storage utilities (always use localStorage for persistence)
const secureStorage = {
  setItem: (key, value) => {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.error(`Failed to store ${key}:`, error);
      return false;
    }
  },

  getItem: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      
      if (!item) return defaultValue;
      
      // Try to parse as JSON, fall back to string
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch (error) {
      console.error(`Failed to retrieve ${key}:`, error);
      return defaultValue;
    }
  },

  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
      return false;
    }
  },

  clear: () => {
    try {
      Object.values(AUTH_STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear any other auth-related items
      localStorage.removeItem('securityEvents');
      
      return true;
    } catch (error) {
      console.error('Failed to clear auth storage:', error);
      return false;
    }
  }
};

// Enhanced authentication service
export const authService = {
  /**
   * Login user with credentials
   */
  login: async (credentials) => {
    try {
      const { username, password } = credentials;
      
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      // Call API login
      const response = await apiService.auth.login({ username, password });
      const { token, user } = response;

      if (!token || !user) {
        throw new Error('Invalid login response from server');
      }

      // Store authentication data in localStorage
      secureStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, token);
      secureStorage.setItem(AUTH_STORAGE_KEYS.USER, user);

      // Log successful login
      authService.logSecurityEvent('LOGIN_SUCCESS', { username });

      return { token, user };
    } catch (error) {
      // Log failed login attempt
      authService.logSecurityEvent('LOGIN_FAILED', { 
        username: credentials.username,
        error: error.message 
      });
      
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  },

  /**
   * Logout user
   */
  logout: async (reason = 'user_initiated') => {
    try {
      const user = authService.getCurrentUser();
      
      // Log logout event
      authService.logSecurityEvent('LOGOUT', { reason, username: user?.username });

      // Try to call logout API (don't wait for it)
      try {
        await apiService.auth.logout();
      } catch (error) {
        console.warn('Logout API call failed:', error);
      }
      
      // Clear all auth data
      secureStorage.clear();
      
      // Force redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      
      // Force clear session even if logout fails
      secureStorage.clear();
      
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      
      return false;
    }
  },

  /**
   * Get current user from storage
   */
  getCurrentUser: () => {
    try {
      const user = secureStorage.getItem(AUTH_STORAGE_KEYS.USER);
      
      if (!user) return null;
      
      // Validate user object structure
      if (typeof user === 'object' && user.id && user.username) {
        return user;
      }
      
      console.warn('Invalid user data structure, clearing storage');
      secureStorage.removeItem(AUTH_STORAGE_KEYS.USER);
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      secureStorage.removeItem(AUTH_STORAGE_KEYS.USER);
      return null;
    }
  },

  /**
   * Get authentication token
   */
  getToken: () => {
    try {
      const token = secureStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
      
      if (!token) return null;
      
      // Validate token before returning
      if (validateToken(token)) {
        return token;
      } else {
        console.warn('Invalid or expired token, clearing storage');
        authService.clearSession();
        return null;
      }
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    const token = authService.getToken();
    const user = authService.getCurrentUser();
    return !!(token && user);
  },

  /**
   * Refresh user data from server
   */
  refreshUserData: async () => {
    try {
      if (!authService.isAuthenticated()) {
        console.warn('User not authenticated, cannot refresh data');
        return null;
      }

      const response = await apiService.auth.getMe();
      const user = response.data;
      
      if (user) {
        secureStorage.setItem(AUTH_STORAGE_KEYS.USER, user);
        
        authService.logSecurityEvent('USER_DATA_REFRESHED', { userId: user.id });
        return user;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      
      // If it's an auth error, clear the session
      if (error.response?.status === 401) {
        console.warn('Authentication failed during refresh, logging out');
        await authService.logout('auth_failed');
        return null;
      }
      
      // For other errors, return null but don't logout
      return null;
    }
  },

  /**
   * Update user data in storage
   */
  updateUser: (userData) => {
    try {
      if (!userData || typeof userData !== 'object') {
        console.error('Invalid user data provided');
        return false;
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        console.error('No current user to update');
        return false;
      }

      const updatedUser = { ...currentUser, ...userData };
      
      const success = secureStorage.setItem(AUTH_STORAGE_KEYS.USER, updatedUser);
      
      if (success) {
        authService.logSecurityEvent('USER_DATA_UPDATED', { userId: updatedUser.id });
      }
      
      return success;
    } catch (error) {
      console.error('Error updating user data:', error);
      return false;
    }
  },

  /**
   * Refresh authentication token
   */
  refreshToken: async () => {
    try {
      const currentToken = authService.getToken();
      if (!currentToken) {
        throw new Error('No token to refresh');
      }

      const response = await apiService.auth.refreshToken();
      const { access_token } = response.data;

      if (access_token) {
        secureStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, access_token);
        
        authService.logSecurityEvent('TOKEN_REFRESHED');
        return access_token;
      }

      throw new Error('No new token received');
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // If refresh fails, logout user
      await authService.logout('token_refresh_failed');
      throw error;
    }
  },

  /**
   * Change user password
   */
  changePassword: async (passwordData) => {
    try {
      const { currentPassword, newPassword } = passwordData;
      
      if (!currentPassword || !newPassword) {
        throw new Error('Current password and new password are required');
      }

      const response = await apiService.auth.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });

      authService.logSecurityEvent('PASSWORD_CHANGED');
      return response.data;
    } catch (error) {
      authService.logSecurityEvent('PASSWORD_CHANGE_FAILED', { error: error.message });
      throw new Error(error.response?.data?.message || 'Failed to change password');
    }
  },

  /**
   * Request password reset
   */
  requestPasswordReset: async (email) => {
    try {
      if (!email) {
        throw new Error('Email is required');
      }

      const response = await apiService.auth.forgotPassword({ email });
      
      authService.logSecurityEvent('PASSWORD_RESET_REQUESTED', { email });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to request password reset');
    }
  },

  /**
   * Reset password with token
   */
  resetPassword: async (resetData) => {
    try {
      const { token, password } = resetData;
      
      if (!token || !password) {
        throw new Error('Reset token and new password are required');
      }

      const response = await apiService.auth.resetPassword({
        token,
        new_password: password
      });

      authService.logSecurityEvent('PASSWORD_RESET_COMPLETED');
      return response.data;
    } catch (error) {
      authService.logSecurityEvent('PASSWORD_RESET_FAILED', { error: error.message });
      throw new Error(error.response?.data?.message || 'Failed to reset password');
    }
  },

  /**
   * Validate token without API call
   */
  isTokenValid: () => {
    const token = secureStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
    return validateToken(token);
  },

  /**
   * Clear session data
   */
  clearSession: () => {
    try {
      secureStorage.clear();
      authService.logSecurityEvent('SESSION_CLEARED');
      return true;
    } catch (error) {
      console.error('Error clearing session:', error);
      return false;
    }
  },

  /**
   * Check if user has specific permission
   */
  hasPermission: (permission, user = null) => {
    const currentUser = user || authService.getCurrentUser();
    
    if (!currentUser || !currentUser.role_name) return false;
    
    // Admin has all permissions
    if (currentUser.role_name === 'Administrator') return true;
    
    // Define role permissions mapping
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

    const userPermissions = rolePermissions[currentUser.role_name] || [];
    return userPermissions.includes(permission);
  },

  /**
   * Log security events
   */
  logSecurityEvent: (eventType, details = {}) => {
    try {
      const user = authService.getCurrentUser();
      const securityEvent = {
        timestamp: new Date().toISOString(),
        eventType,
        userId: user?.id,
        username: user?.username,
        details,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        sessionId: secureStorage.getItem('sessionId') || 'unknown'
      };

      // Store locally (in production, also send to server)
      const events = secureStorage.getItem('securityEvents') || [];
      events.push(securityEvent);
      
      // Keep only last 100 events
      const recentEvents = events.slice(-100);
      secureStorage.setItem('securityEvents', recentEvents);

      if (process.env.NODE_ENV === 'development') {
        console.log('Security Event:', securityEvent);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  },

  /**
   * Get security events
   */
  getSecurityEvents: (limit = 50) => {
    try {
      const events = secureStorage.getItem('securityEvents') || [];
      return events.slice(-limit).reverse(); // Most recent first
    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  },

  /**
   * Auto-logout setup (for session timeout)
   */
  setupAutoLogout: (timeoutMinutes = 30) => {
    let timeoutId;
    
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        authService.logout('session_timeout');
      }, timeoutMinutes * 60 * 1000);
    };

    // Activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (authService.isAuthenticated()) {
        resetTimer();
      }
    };

    // Add event listeners
    events.forEach(event => {
      if (typeof document !== 'undefined') {
        document.addEventListener(event, handleActivity, true);
      }
    });

    // Initial timer
    resetTimer();

    // Return cleanup function
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        if (typeof document !== 'undefined') {
          document.removeEventListener(event, handleActivity, true);
        }
      });
    };
  }
};

// Export additional utilities
export const authUtils = {
  validateToken,
  secureStorage,
  AUTH_STORAGE_KEYS,
};

export default authService;