import API from '../axios';

// Admin bootstrap - create first admin
export const adminBootstrap = (email, password, secret, name) => {
  return API.post('/admin/bootstrap', {
    email,
    password,
    secret,
    name,
  });
};

// Admin login
export const adminLogin = (email, password) => {
  return API.post('/admin/login', { email, password });
};

// Get admin overview/dashboard stats
export const getAdminOverview = () => {
  return API.get('/admin/overview');
};

// Get all subscription plans (admin view)
export const getAdminPlans = () => {
  return API.get('/admin/plans');
};

// Create new subscription plan
export const createPlan = (planData) => {
  return API.post('/admin/plans', planData);
};

// Update subscription plan
export const updatePlan = (planCode, planData) => {
  return API.put(`/admin/plans/${planCode}`, planData);
};
