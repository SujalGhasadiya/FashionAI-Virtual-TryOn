import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserProvider } from '@/contexts/UserContext';
import { WardrobeProvider } from '@/contexts/WardrobeContext';
import { TryOnProvider } from '@/contexts/TryOnContext';
import { TryOnLockProvider } from '@/contexts/TryOnLockContext';
import { RecommendationProvider } from '@/contexts/RecommendationContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { AdminProvider } from '@/contexts/AdminContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import '@/styles/globals.css';

// Layout components (to be built)
import ProtectedRoute from '@/components/ProtectedRoute';
import NotificationContainer from '@/components/NotificationContainer';
import TryOnLockOverlay from '@/components/TryOnLockOverlay';
import { AnimatedPage } from '@/components/common/AnimatedPage';

// Pages (to be built)
import LoginPage from '@/pages/Auth/LoginPage';
import RegisterStep1Page from '@/pages/Auth/RegisterStep1Page';
import RegisterStep2Page from '@/pages/Auth/RegisterStep2Page';
import ForgotPasswordPage from '@/pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/Auth/ResetPasswordPage';

import DashboardPage from '@/pages/Dashboard/DashboardPage';
import WardrobeManagementPage from '@/pages/Wardrobe/WardrobeManagementPage';
import TryOnPage from '@/pages/TryOn/TryOnPage';
import RecommendationsPage from '@/pages/Recommendations/RecommendationsPage';
import SubscriptionPage from '@/pages/Subscription/SubscriptionPage';
import SavedTryOnsPage from '@/pages/TryOn/SavedTryOnsPage';
import CheckoutPage from '@/pages/Subscription/CheckoutPage';
import SettingsPage from '@/pages/Settings/SettingsPage';
import AdminDashboardPage from '@/pages/Admin/AdminDashboardPage';
import AdminSubscriptionsPage from '@/pages/Admin/AdminSubscriptionsPage';

// Page transition wrapper
function RouteWithTransition({ element }) {
  return <AnimatedPage>{element}</AnimatedPage>;
}

function AppContent() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Auth Routes */}
        <Route path="/login" element={<RouteWithTransition element={<LoginPage />} />} />
        <Route path="/register/step-1" element={<RouteWithTransition element={<RegisterStep1Page />} />} />
        <Route path="/register/step-2" element={<RouteWithTransition element={<RegisterStep2Page />} />} />
        <Route path="/forgot-password" element={<RouteWithTransition element={<ForgotPasswordPage />} />} />
        <Route path="/reset-password" element={<RouteWithTransition element={<ResetPasswordPage />} />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route
          path="/admin/dashboard"
          element={
            <RouteWithTransition
              element={
                <ProtectedRoute isAdmin={true}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
          }
        />
        <Route
          path="/admin/subscriptions"
          element={
            <RouteWithTransition
              element={
                <ProtectedRoute isAdmin={true}>
                  <AdminSubscriptionsPage />
                </ProtectedRoute>
              }
            />
          }
        />

        {/* Protected User Routes */}
        <Route
          path="/dashboard"
          element={
            <RouteWithTransition
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
          }
        />
        <Route
          path="/wardrobe"
          element={
            <RouteWithTransition
              element={
                <ProtectedRoute>
                  <WardrobeManagementPage />
                </ProtectedRoute>
              }
            />
          }
        />
        <Route
          path="/tryon"
          element={
            <RouteWithTransition
              element={
                <ProtectedRoute>
                  <TryOnPage />
                </ProtectedRoute>
              }
            />
          }
        />
        <Route
          path="/saved-tryons"
          element={
            <RouteWithTransition
              element={
                <ProtectedRoute>
                  <SavedTryOnsPage />
                </ProtectedRoute>
              }
            />
          }
        />
        <Route
          path="/recommendations"
          element={
            <RouteWithTransition
              element={
                <ProtectedRoute>
                  <RecommendationsPage />
                </ProtectedRoute>
              }
            />
          }
        />
        <Route
          path="/subscription"
          element={
            <RouteWithTransition
              element={
                <ProtectedRoute>
                  <SubscriptionPage />
                </ProtectedRoute>
              }
            />
          }
        />
        <Route
          path="/checkout"
          element={
            <RouteWithTransition
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
          }
        />
        <Route
          path="/settings"
          element={
            <RouteWithTransition
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          }
        />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <UserProvider>
          <WardrobeProvider>
            <TryOnProvider>
              <TryOnLockProvider>
                <RecommendationProvider>
                  <SubscriptionProvider>
                    <AdminProvider>
                      <Router>
                        <NotificationContainer />
                        <TryOnLockOverlay />
                        <AppContent />
                      </Router>
                    </AdminProvider>
                  </SubscriptionProvider>
                </RecommendationProvider>
              </TryOnLockProvider>
            </TryOnProvider>
          </WardrobeProvider>
        </UserProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
