import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as authAPI from '@/services/api/auth';
import * as userAPI from '@/services/api/user';

const AuthContext = createContext();

const extractErrorMessage = (err, defaultMsg) => {
  const detail = err.response?.data?.detail;
  if (typeof detail === 'object' && detail !== null) {
    return detail.message || defaultMsg;
  }
  return detail || defaultMsg;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token') || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Ensure is_fully_registered flag exists (default to false if not set)
        if (!('is_fully_registered' in parsedUser)) {
          parsedUser.is_fully_registered = false;
        }
        setToken(storedToken);
        setUser(parsedUser);
        setIsAuthenticated(true);
        console.log('[AuthContext] Initialized from localStorage:', {
          user: parsedUser.email,
          kind: parsedUser.kind || 'user',
          is_fully_registered: parsedUser.is_fully_registered,
        });
      } catch (err) {
        console.error('[AuthContext] Error parsing stored user:', err);
        // Clear corrupted data
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    } else {
      console.log('[AuthContext] No stored auth data found');
    }
    // Mark initialization as complete (allow ProtectedRoute to render)
    setIsInitialized(true);
  }, []);

  const sendOTP = useCallback(async (email) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAPI.sendOTP(email);
      return response.data;
    } catch (err) {
      const errorMsg = extractErrorMessage(err, 'Failed to send OTP');
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyOTP = useCallback(async (email, otp) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAPI.verifyOTP(email, otp);
      return response.data;
    } catch (err) {
      const errorMsg = extractErrorMessage(err, 'Invalid OTP');
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerStep1 = useCallback(async (name, email, password, confirmPassword) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAPI.registerStep1(name, email, password, confirmPassword);
      const { access_token, user: userData } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
      setIsAuthenticated(true);

      return response.data;
    } catch (err) {
      const errorMsg = extractErrorMessage(err, 'Registration failed');
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerStep2 = useCallback(async (genderPreference, photoFile) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('gender_preference', genderPreference);
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const response = await authAPI.registerStep2(formData);
      let userData = response.data;

      // Ensure is_fully_registered is set to true after Step 2 completion
      userData = {
        ...userData,
        is_fully_registered: true,
      };

      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      console.log('[Auth] Step 2 registration complete. User is now fully registered:', userData.is_fully_registered);
      return response.data;
    } catch (err) {
      const errorMsg = extractErrorMessage(err, 'Profile update failed');
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAPI.login(email, password);
      const { access_token, user: userData, admin: adminData, kind } = response.data;

      // Handle both user and admin logins
      const actualData = userData || adminData;
      
      if (!actualData) {
        throw new Error('No user or admin data in response');
      }

      // Ensure user object has is_fully_registered flag (null for admin)
      const processedUser = {
        ...actualData,
        is_fully_registered: actualData.is_fully_registered ?? false,
        kind: kind || 'user',
      };

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(processedUser));

      setToken(access_token);
      setUser(processedUser);
      setIsAuthenticated(true);

      const invalidated = response.data.invalidated_sessions || 0;

      console.log('[Auth] Login successful. Kind:', kind, 'Registered:', processedUser.is_fully_registered, 'invalidated_sessions:', invalidated);
      return { access_token, user: processedUser, kind, invalidated_sessions: invalidated };
    } catch (err) {
      const errorMsg = extractErrorMessage(err, 'Login failed');
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Attempt to invalidate session on backend
      await authAPI.logout();
    } catch (err) {
      // Log error but continue with client-side logout even if backend fails
      console.warn('Failed to invalidate session on backend:', err);
    } finally {
      // Always clear client-side auth data
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('token_type');
      localStorage.removeItem('kind');

      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    }
  }, []);

  const sendPasswordResetOTP = useCallback(async (email) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAPI.sendPasswordResetOTP(email);
      return response.data;
    } catch (err) {
      const errorMsg = extractErrorMessage(err, 'Failed to send reset OTP');
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyPasswordResetOTP = useCallback(async (email, otp) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAPI.verifyPasswordResetOTP(email, otp);
      return response.data;
    } catch (err) {
      const errorMsg = extractErrorMessage(err, 'Failed to verify OTP');
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (resetToken, newPassword, confirmPassword) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAPI.resetPassword(resetToken, newPassword, confirmPassword);
      return response.data;
    } catch (err) {
      const errorMsg = extractErrorMessage(err, 'Failed to reset password');
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await userAPI.getCurrentUser();
      const userData = response.data;
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Failed to refresh user:', err);
      // If token is invalid, logout
      if (err.response?.status === 401) {
        logout();
      }
    }
  }, [isAuthenticated, logout]);

  const value = {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    isInitialized,
    sendOTP,
    verifyOTP,
    registerStep1,
    registerStep2,
    login,
    logout,
    sendPasswordResetOTP,
    verifyPasswordResetOTP,
    resetPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
