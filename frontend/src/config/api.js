import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token if stored in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Extract data payload and handle common error states
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const errorResponse = error.response?.data?.error || {
      message: error.message || 'An unexpected error occurred',
    };

    // Attach HTTP status code for components to inspect
    errorResponse.status = status;

    // Handle expired sessions and invalid tokens safely (skip during active login requests)
    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      const isAuthInit = error.config?.url?.includes('/auth/me');
      if (!isAuthInit) {
        localStorage.removeItem('token');
        // Dispatch custom event so AuthContext or application can react gracefully
        window.dispatchEvent(new CustomEvent('auth:expired', { detail: errorResponse }));
      }
    }

    return Promise.reject(errorResponse);
  }
);

export default api;
