import API from '../axios';

// Get current user profile
export const getCurrentUser = () => {
  return API.get('/me');
};

// Update user profile (name, gender_preference)
export const updateProfile = (data) => {
  return API.patch('/me', data);
};

// Upload profile photo
export const uploadProfilePhoto = (formData) => {
  return API.post('/me/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      return progressEvent;
    },
  });
};

// Change password
export const changePassword = (current_password, new_password, confirm_new_password) => {
  return API.patch('/me/password', {
    current_password,
    new_password,
    confirm_new_password,
  });
};
