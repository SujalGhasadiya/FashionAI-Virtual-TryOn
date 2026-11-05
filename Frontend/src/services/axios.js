import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '3000000'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
API.interceptors.request.use(
  (config) => {
    // Check both access_token and admin_token
    const token = localStorage.getItem('access_token') || localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle auth errors and session conflicts
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error.config?.url || '').toLowerCase();

    // Public auth endpoints can legitimately return 401 (e.g., wrong password).
    // Keep these errors in-page so forms can show toast/inline feedback.
    const isPublicAuth401 =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/password-reset/verify');

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !isPublicAuth401) {
      const errorDetail = error.response?.data?.detail || '';
      
      // Check for session conflict/invalidation messages
      const isSessionConflict = 
        errorDetail.includes('session has been invalidated') ||
        errorDetail.includes('logged in from another device') ||
        errorDetail.includes('missing session ID');
      
      // Store the session conflict state so pages can show custom messages
      if (isSessionConflict) {
        sessionStorage.setItem('sessionConflictMessage', errorDetail);
      }
      
      // Clear both regular user and admin storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin');
      localStorage.removeItem('token_type');
      localStorage.removeItem('kind');
      
      // Redirect to main login for all 401s
      window.location.href = '/login';
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default API;
