import API from '../axios';

// Send OTP to email
export const sendOTP = (email) => {
  return API.post('/auth/send-otp', { email });
};

// Verify OTP code
export const verifyOTP = (email, otp_code) => {
  return API.post('/auth/verify-otp', { email, otp_code });
};

// Register Step 1 - Create account
export const registerStep1 = (name, email, password, confirm_password) => {
  return API.post('/auth/register/step-1', {
    name,
    email,
    password,
    confirm_password,
  });
};

// Register Step 2 - Complete profile
export const registerStep2 = (formData) => {
  return API.post('/auth/register/step-2', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Login
export const login = (email, password) => {
  return API.post('/auth/login', { email, password });
};

// Send password reset OTP
export const sendPasswordResetOTP = (email) => {
  return API.post('/auth/password-reset/send', { email });
};

// Verify password reset OTP
export const verifyPasswordResetOTP = (email, otp_code) => {
  return API.post('/auth/password-reset/verify', { email, otp_code });
};

// Reset password
export const resetPassword = (reset_token, new_password, confirm_new_password) => {
  return API.post('/auth/password-reset/reset', {
    reset_token,
    new_password,
    confirm_password: confirm_new_password,
  });
};

// Logout - Invalidate current session on backend
export const logout = () => {
  return API.post('/auth/logout');
};
