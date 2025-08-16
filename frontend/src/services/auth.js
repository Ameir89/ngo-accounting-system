// frontend/src/services/auth.js
import { apiService } from './api';

export const authService = {
  login: async (credentials) => {
    try {
      const response = await apiService.auth.login(credentials);
      const { access_token, user } = response.data;
      
      // Store token and user data
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { token: access_token, user };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken: () => {
    return localStorage.getItem('authToken');
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    return !!token;
  },

  refreshUserData: async () => {
    try {
      const response = await apiService.auth.getMe();
      const user = response.data;
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      return null;
    }
  },
};
