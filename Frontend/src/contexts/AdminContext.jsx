import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as adminAPI from '@/services/api/admin';
import { useAuth } from '@/hooks';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const { user: authUser, token: authTokens, logout: authLogout } = useAuth();
  
  // Derived state for immediate updates during render
  const isAuthByAuthContext = authUser && authUser.kind === 'admin';
  const tokenByAuthContext = isAuthByAuthContext ? authTokens : null;

  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [overview, setOverview] = useState(null);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Effective state used by the context
  const effectiveIsAuthenticated = isAuthByAuthContext || isAuthenticated;
  const effectiveToken = tokenByAuthContext || token;
  const effectiveAdmin = isAuthByAuthContext ? authUser : admin;

  // Sync with AuthContext and handle legacy sessions
  useEffect(() => {
    if (isAuthByAuthContext) {
      console.log('[AdminContext] Synchronized with active AuthContext admin session');
    } else {
      // Also check local storage for admin-only sessions (legacy/fallback)
      const adminToken = localStorage.getItem('admin_token');
      const adminData = localStorage.getItem('admin');
      
      if (adminToken && adminData) {
        try {
          const parsedAdmin = JSON.parse(adminData);
          setAdmin(parsedAdmin);
          setToken(adminToken);
          setIsAuthenticated(true);
        } catch (err) {
          setIsAuthenticated(false);
        }
      }
    }
  }, [isAuthByAuthContext]);

  const adminLogout = useCallback(() => {
    // Clear specialized storage
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin');
    
    // Also trigger main logout if this was an admin session from main login
    if (authUser && authUser.kind === 'admin') {
      authLogout();
    }

    setToken(null);
    setAdmin(null);
    setIsAuthenticated(false);
    setError(null);
  }, [authUser, authLogout]);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getAdminOverview();
      setOverview(response.data);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to fetch overview';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getAdminPlans();
      setPlans(response.data || []);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to fetch plans';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPlan = useCallback(async (planData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminAPI.createPlan(planData);
      setPlans((prev) => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to create plan';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePlan = useCallback(async (planCode, planData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminAPI.updatePlan(planCode, planData);
      setPlans((prev) =>
        prev.map((plan) => (plan.code === planCode ? response.data : plan))
      );
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to update plan';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    admin: effectiveAdmin,
    token: effectiveToken,
    isAuthenticated: effectiveIsAuthenticated,
    overview,
    plans,
    isLoading,
    error,
    adminLogout,
    fetchOverview,
    fetchPlans,
    createPlan,
    updatePlan,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};
