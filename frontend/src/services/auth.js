// frontend/src/services/auth.js - Fixed with missing setupAutoLogout method
import { apiService, tokenUtils } from './api';

// Enhanced authentication service that works with the new token refresh system
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

      // Clear any existing tokens before login
      tokenUtils.clearTokens();

      // Call API login (tokens are automatically stored in the API service)
      const response = await apiService.auth.login({ username, password });
      const { token, user } = response;

      if (!token || !user) {
        throw new Error('Invalid login response from server');
      }

      console.log('✅ Login successful for user:', user.username);
      return { token, user };

    } catch (error) {
      console.error('❌ Login failed:', error);
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  },

  /**
   * Logout user
   */
  logout: async (reason = 'user_initiated') => {
    try {
      console.log(`🚪 Logging out: ${reason}`);
      
      // Call API logout (this will clear tokens automatically)
      await apiService.auth.logout();
      
      console.log('✅ Logout successful');
      return true;

    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Force clear tokens even if logout API call fails
      tokenUtils.clearTokens();
      return false;
    }
  },

  /**
   * Get current user from storage
   */
  getCurrentUser: () => {
    try {
      const userString = localStorage.getItem('user');
      if (!userString) return null;
      
      const user = JSON.parse(userString);
      
      // Validate user object structure
      if (user && typeof user === 'object' && user.id && user.username) {
        return user;
      }
      
      console.warn('⚠️ Invalid user data structure, clearing storage');
      localStorage.removeItem('user');
      return null;

    } catch (error) {
      console.error('❌ Error getting current user:', error);
      localStorage.removeItem('user');
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    const hasToken = !!tokenUtils.getAccessToken();
    const hasRefreshToken = !!tokenUtils.getRefreshToken();
    const hasUser = !!authService.getCurrentUser();
    
    return hasToken && hasRefreshToken && hasUser;
  },

  /**
   * Check if current tokens are valid
   */
  isTokenValid: () => {
    const accessToken = tokenUtils.getAccessToken();
    
    if (!accessToken) return false;
    
    return tokenUtils.isValidTokenFormat(accessToken);
  },

  /**
   * Check if token should be refreshed
   */
  shouldRefreshToken: () => {
    return tokenUtils.shouldRefreshToken();
  },

  /**
   * Manually refresh access token
   */
  refreshToken: async () => {
    try {
      console.log('🔄 Manual token refresh requested');
      const newToken = await tokenUtils.refreshTokens();
      
      if (newToken) {
        console.log('✅ Manual token refresh successful');
        return newToken;
      }
      
      throw new Error('No new token received');

    } catch (error) {
      console.error('❌ Manual token refresh failed:', error);
      throw error;
    }
  },

  /**
   * Refresh user data from server
   */
  refreshUserData: async () => {
    try {
      if (!authService.isAuthenticated()) {
        console.warn('⚠️ User not authenticated, cannot refresh data');
        return null;
      }

      const response = await apiService.auth.getMe();
      const user = response.data;
      
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        console.log('✅ User data refreshed');
        return user;
      }
      
      return null;

    } catch (error) {
      console.error('❌ Failed to refresh user data:', error);
      
      // Don't logout on user data refresh failure - let the API interceptor handle auth errors
      return null;
    }
  },

  /**
   * Update user data in storage
   */
  updateUser: (userData) => {
    try {
      if (!userData || typeof userData !== 'object') {
        console.error('❌ Invalid user data provided');
        return false;
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        console.error('❌ No current user to update');
        return false;
      }

      const updatedUser = { ...currentUser, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      console.log('✅ User data updated');
      return true;

    } catch (error) {
      console.error('❌ Error updating user data:', error);
      return false;
    }
  },

  /**
   * Setup automatic logout after inactivity - FIXED: Added missing method
   */
  setupAutoLogout: (timeoutMinutes = 30) => {
    let timeoutId;
    let warningTimeoutId;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = timeoutMs - (5 * 60 * 1000); // 5 minutes before logout

    const resetTimer = () => {
      // Clear existing timeouts
      if (timeoutId) clearTimeout(timeoutId);
      if (warningTimeoutId) clearTimeout(warningTimeoutId);

      // Set warning timer (5 minutes before logout)
      warningTimeoutId = setTimeout(() => {
        console.warn('⚠️ Session will expire in 5 minutes due to inactivity');
        // You could show a warning modal here
        window.dispatchEvent(new CustomEvent('auth:warning', { 
          detail: { timeLeft: 5 * 60 * 1000 }
        }));
      }, warningMs);

      // Set logout timer
      timeoutId = setTimeout(() => {
        console.log('🕐 Auto-logout triggered due to inactivity');
        authService.logout('inactivity_timeout').then(() => {
          window.dispatchEvent(new CustomEvent('auth:logout', { 
            detail: { reason: 'inactivity_timeout' }
          }));
        });
      }, timeoutMs);
    };

    // Activity events to reset timer
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Reset timer on activity
    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start the timer
    resetTimer();

    // Return cleanup function
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (warningTimeoutId) clearTimeout(warningTimeoutId);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      console.log('🛑 Auto-logout monitoring stopped');
    };
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

      console.log('✅ Password changed successfully');
      return response.data;

    } catch (error) {
      console.error('❌ Password change failed:', error);
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
      console.log('✅ Password reset requested');
      return response.data;

    } catch (error) {
      console.error('❌ Password reset request failed:', error);
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

      console.log('✅ Password reset completed');
      return response.data;

    } catch (error) {
      console.error('❌ Password reset failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to reset password');
    }
  },

  /**
   * Clear session data
   */
  clearSession: () => {
    try {
      tokenUtils.clearTokens();
      console.log('✅ Session cleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing session:', error);
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
    
    // Define role-based permissions
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
   * Get authentication status info for debugging
   */
  getAuthStatus: () => {
    const user = authService.getCurrentUser();
    const tokenDebug = tokenUtils.getTokenDebugInfo ? tokenUtils.getTokenDebugInfo() : {};
    
    return {
      isAuthenticated: authService.isAuthenticated(),
      isTokenValid: authService.isTokenValid(),
      shouldRefreshToken: authService.shouldRefreshToken(),
      user: user ? {
        id: user.id,
        username: user.username,
        role: user.role_name,
        email: user.email
      } : null,
      tokens: tokenDebug,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Setup automatic token monitoring (optional)
   */
  setupTokenMonitoring: (intervalMinutes = 1) => {
    console.log(`🔧 Setting up token monitoring (every ${intervalMinutes} minute(s))`);
    
    const monitoringInterval = setInterval(() => {
      if (authService.isAuthenticated()) {
        const status = authService.getAuthStatus();
        
        if (status.shouldRefreshToken && !status.tokens.isRefreshing) {
          console.log('🔄 Token monitoring triggered refresh');
          authService.refreshToken().catch(error => {
            console.warn('⚠️ Monitoring refresh failed:', error.message);
          });
        }
        
        // Log status in development
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 Auth Status:', {
            authenticated: status.isAuthenticated,
            shouldRefresh: status.shouldRefreshToken,
            timeUntilExpiry: status.tokens.timeUntilExpiry ? 
              `${Math.round(status.tokens.timeUntilExpiry / 1000 / 60)}min` : 'unknown'
          });
        }
      }
    }, intervalMinutes * 60 * 1000);

    // Return cleanup function
    return () => {
      clearInterval(monitoringInterval);
      console.log('🛑 Token monitoring stopped');
    };
  },

  /**
   * Force token refresh (for testing/debugging)
   */
  forceRefresh: async () => {
    try {
      console.log('🔄 Force refresh initiated');
      const newToken = await authService.refreshToken();
      console.log('✅ Force refresh successful');
      return newToken;
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
      throw error;
    }
  },

  /**
   * Test authentication flow (for development/testing)
   */
  testAuthFlow: async () => {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('⚠️ testAuthFlow is only available in development');
      return;
    }

    console.group('🧪 Testing Authentication Flow');
    
    try {
      // Test current status
      const initialStatus = authService.getAuthStatus();
      console.log('📊 Initial Status:', initialStatus);

      if (!initialStatus.isAuthenticated) {
        console.log('❌ Not authenticated - cannot test token refresh');
        return;
      }

      // Test token refresh
      if (initialStatus.shouldRefreshToken) {
        console.log('🔄 Testing token refresh...');
        await authService.refreshToken();
        console.log('✅ Token refresh test passed');
      } else {
        console.log('ℹ️ Token doesn\'t need refresh yet');
      }

      // Test user data refresh
      console.log('👤 Testing user data refresh...');
      const refreshedUser = await authService.refreshUserData();
      console.log('✅ User data refresh test passed:', !!refreshedUser);

      // Final status
      const finalStatus = authService.getAuthStatus();
      console.log('📊 Final Status:', finalStatus);

    } catch (error) {
      console.error('❌ Auth flow test failed:', error);
    } finally {
      console.groupEnd();
    }
  }
};

// Export additional utilities
export const authUtils = {
  // Token validation
  isValidTokenFormat: tokenUtils.isValidTokenFormat,
  
  // Permission helpers
  requirePermission: (permission, user = null) => {
    if (!authService.hasPermission(permission, user)) {
      throw new Error(`Permission "${permission}" required`);
    }
  },

  // Role helpers
  isAdmin: (user = null) => {
    const currentUser = user || authService.getCurrentUser();
    return currentUser?.role_name === 'Administrator';
  },

  isFinancialManager: (user = null) => {
    const currentUser = user || authService.getCurrentUser();
    return currentUser?.role_name === 'Financial Manager';
  },

  // Authentication state helpers
  waitForAuth: (timeoutMs = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkAuth = () => {
        if (authService.isAuthenticated()) {
          resolve(true);
        } else if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Authentication timeout'));
        } else {
          setTimeout(checkAuth, 100);
        }
      };
      
      checkAuth();
    });
  }
};

export default authService;