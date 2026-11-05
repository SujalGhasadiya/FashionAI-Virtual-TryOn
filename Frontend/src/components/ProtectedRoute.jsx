import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { useAdmin } from '@/hooks';

export default function ProtectedRoute({ children, isAdmin = false, requireFullRegistration = true }) {
  if (isAdmin) {
    const { isAuthenticated: adminAuthenticated } = useAdmin();

    if (!adminAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    return children;
  }

  const { isAuthenticated, user, isInitialized } = useAuth();

  // Don't render anything until initialization is complete
  if (!isInitialized) {
    console.log('[ProtectedRoute] Waiting for auth initialization...');
    return null;
  }

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] User not authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // Check if user is fully registered (only for specific routes)
  if (requireFullRegistration && !user?.is_fully_registered) {
    console.log('[ProtectedRoute] User not fully registered:', {
      user,
      is_fully_registered: user?.is_fully_registered,
    });
    return <Navigate to="/register/step-2" replace />;
  }

  return children;
}
