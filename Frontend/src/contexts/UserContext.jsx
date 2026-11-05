import { createContext, useContext, useState, useCallback } from 'react';
import * as userAPI from '@/services/api/user';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userAPI.getCurrentUser();
      setProfile(response.data);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to fetch profile';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[UserContext] Updating profile with data:', data);
      const response = await userAPI.updateProfile(data);
      console.log('[UserContext] Profile updated successfully:', response.data);
      setProfile(response.data);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to update profile';
      console.error('[UserContext] Profile update error:', errorMsg, err.response?.data);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadProfilePhoto = useCallback(async (file) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await userAPI.uploadProfilePhoto(formData);
      setProfile(response.data);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to upload photo';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword, confirmPassword) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userAPI.changePassword(currentPassword, newPassword, confirmPassword);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to change password';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    profile,
    isLoading,
    error,
    fetchProfile,
    updateProfile,
    uploadProfilePhoto,
    changePassword,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
