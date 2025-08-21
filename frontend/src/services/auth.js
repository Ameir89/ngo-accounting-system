// frontend/src/services/auth.js - Enhanced with better error handling and fallbacks
import { apiService } from './api';

export const authService = {
  login: async (credentials) => {
    try {
      const response = await apiService.auth.login(credentials);
      return response; // This already returns { token, user }
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  logout: () => {
    try {
      // Clear local storage first
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      // Try to call logout API (don't wait for it)
      apiService.auth.logout().catch(err => {
        console.warn('Logout API call failed:', err);
      });
      
      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      window.location.href = '/login';
    }
  },

  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user'); // Remove corrupted data
      return null;
    }
  },

  getToken: () => {
    try {
      return localStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  isAuthenticated: () => {
    const token = authService.getToken();
    const user = authService.getCurrentUser();
    return !!(token && user);
  },

  refreshUserData: async () => {
    try {
      // Check if the getMe method exists
      if (typeof apiService.auth.getMe !== 'function') {
        console.warn('getMe method not available, skipping user data refresh');
        return null;
      }

      const response = await apiService.auth.getMe();
      const user = response.data;
      
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return user;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      
      // If it's an auth error, clear the session
      if (error.response?.status === 401) {
        authService.logout();
        return null;
      }
      
      // For other errors, return null but don't logout
      // This allows the app to continue with cached user data
      return null;
    }
  },

  updateUser: (userData) => {
    try {
      localStorage.setItem('user', JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('Error updating user data:', error);
      return false;
    }
  },

  // Add method to validate token without making API call
  isTokenValid: () => {
    const token = authService.getToken();
    if (!token) return false;

    try {
      // Basic token validation (you can enhance this)
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Decode payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      const now = Date.now() / 1000;
      
      // Check if token is expired
      if (payload.exp && payload.exp < now) {
        console.warn('Token is expired');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  },

  // Add method to clear session without API call
  clearSession: () => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('securityEvents'); // Clear security events too
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }
};