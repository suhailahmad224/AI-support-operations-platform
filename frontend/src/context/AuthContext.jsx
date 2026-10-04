import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth on application mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
        setToken(storedToken);
      } catch (err) {
        console.warn('Session expired or invalid token:', err.message);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const handleExpired = () => {
      setUser(null);
      setToken(null);
      setError('Your session has expired. Please sign in again.');
    };

    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token: authToken } = response.data;
      localStorage.setItem('token', authToken);
      setToken(authToken);
      setUser(userData);

      // If user is a customer, remember this customer session for the role switcher
      if (userData.role === 'customer') {
        localStorage.setItem(
          'savedCustomerSession',
          JSON.stringify({ token: authToken, user: userData })
        );
      }

      return { success: true, user: userData };
    } catch (err) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const register = async (name, email, password, department = 'General') => {
    setError(null);
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        department,
      });
      const { user: userData, token: authToken } = response.data;
      localStorage.setItem('token', authToken);
      setToken(authToken);
      setUser(userData);

      // Save registered customer session
      localStorage.setItem(
        'savedCustomerSession',
        JSON.stringify({ token: authToken, user: userData })
      );

      return { success: true, user: userData };
    } catch (err) {
      const msg = err.message || 'Registration failed. Please try again.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('savedCustomerSession');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const quickLogin = async (role) => {
    if (role === 'customer') {
      // If a custom customer was previously logged in, restore their session instead of defaulting to Jane
      const saved = localStorage.getItem('savedCustomerSession');
      if (saved) {
        try {
          const { token: savedToken } = JSON.parse(saved);
          localStorage.setItem('token', savedToken);
          setToken(savedToken);
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          return { success: true, user: res.data.user };
        } catch (e) {
          localStorage.removeItem('savedCustomerSession');
        }
      }
      // Fallback to default demo customer
      return await login('customer@platform.com', 'CustomerPass123!');
    }

    const credentials = {
      admin: { email: 'admin@platform.com', password: 'AdminPass123!' },
      agent: { email: 'agent@platform.com', password: 'AgentPass123!' },
    };

    const target = credentials[role];
    if (!target) return;
    return await login(target.email, target.password);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    quickLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
