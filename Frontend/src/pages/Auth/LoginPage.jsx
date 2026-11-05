import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, useNotification, useSessionConflict } from '@/hooks';
import { isValidEmail } from '@/utils/validators';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { SessionConflictNotification } from '@/components/SessionConflictNotification';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const sessionConflictMessage = useSessionConflict();
  const [dismissedSessionAlert, setDismissedSessionAlert] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('[LoginPage] Already authenticated, redirecting...', {
        isAuthenticated,
        kind: user.kind,
        is_fully_registered: user.is_fully_registered,
      });
      // If a login is in progress, avoid auto-redirect so the page
      // that initiated the login can show the invalidation modal first.
      const loginInProgress = sessionStorage.getItem('login_in_progress');
      if (loginInProgress) {
        console.log('[LoginPage] Login in progress, deferring auto-redirect');
        return;
      }

      // Route admins to admin dashboard
      if (user.kind === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.is_fully_registered) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/register/step-2', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [showInvalidationModal, setShowInvalidationModal] = useState(false);
  const [invalidationMessage, setInvalidationMessage] = useState('');

  const validateForm = () => {
    if (!email || !password) {
      setFormError('Please fill in all fields');
      return false;
    }
    if (!isValidEmail(email)) {
      setFormError('Invalid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) return;

    // Mark that a login attempt is in progress so auto-redirects
    // from other effects are suppressed until we finish handling.
    sessionStorage.setItem('login_in_progress', '1');

    try {
      const result = await login(email, password);

      // If previous sessions were invalidated, show immediate popup before navigation
      const invalidated = result.invalidated_sessions || result.invalidated_sessions === 0 ? result.invalidated_sessions : 0;
      if (invalidated > 0) {
        // Use a neutral message (no numeric count) per request
        setInvalidationMessage('You were logged out from your previous session.');
        setShowInvalidationModal(true);
        // Wait for user to dismiss modal before showing welcome and redirecting
        return;
      }

      // No invalidation happened — proceed and show welcome toast
      // Clear the login_in_progress marker first
      sessionStorage.removeItem('login_in_progress');
      showSuccess('Welcome back!');

      // Handle both user and admin logins (no previous session conflicts)
      const kind = result.kind || 'user';

      if (kind === 'admin') {
        navigate('/admin/dashboard');
      } else if (result.user.is_fully_registered) {
        navigate('/dashboard');
      } else {
        navigate('/register/step-2');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'object' ? detail.message : (detail || 'Login failed. Please try again.');
      setFormError(errorMsg);
      showError(errorMsg);
    }
  };

  const handleContinueAfterInvalidation = () => {
    setShowInvalidationModal(false);
    // After dismissing, navigate as usual based on auth state
    // Clear login_in_progress marker so other effects may redirect normally
    sessionStorage.removeItem('login_in_progress');
    if (isAuthenticated && user) {
      // Show welcome toast after user acknowledges invalidation
      showSuccess('Welcome back!');
      if (user.kind === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.is_fully_registered) {
        navigate('/dashboard');
      } else {
        navigate('/register/step-2');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 relative overflow-hidden">
      {/* Session Conflict Notification */}
      <SessionConflictNotification 
        message={!dismissedSessionAlert ? sessionConflictMessage : null}
        onDismiss={() => setDismissedSessionAlert(true)}
      />

      {/* Decorative backgrounds */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-powder opacity-5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-sage opacity-5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Invalidation Modal */}
        {showInvalidationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-2">Previous Session Ended</h3>
              <p className="text-sm text-gray-700 mb-4">{invalidationMessage}</p>
              <div className="flex justify-end">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={async () => {
                      // Cancel: invalidate the newly created session on backend and clear client auth
                      try {
                        await logout();
                      } catch (e) {
                        console.warn('Logout during cancel failed', e);
                      } finally {
                        sessionStorage.removeItem('login_in_progress');
                        setShowInvalidationModal(false);
                        navigate('/login');
                      }
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContinueAfterInvalidation}
                    className="btn-primary"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Card */}
        <div className="card-luxury">
          {/* Logo/Brand */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-10"
          >

            <h1 className="text-3xl font-bold text-charcoal mb-1">FashionAI</h1>
            <p className="text-warm-taupe text-sm">Your personal AI stylist</p>
          </motion.div>

          {/* Error Message */}
          {(formError || error) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-rose-dust/10 border border-rose-dust/30 rounded-lg text-rose-dust text-sm"
            >
              {formError || error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-warm-gray" size={18} />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field !pl-14"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-warm-gray" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field !pl-14 pr-12"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-warm-gray hover:text-charcoal transition-colors"
                  title="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-warm-taupe hover:text-gold-accent transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary font-semibold flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="my-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-warm-gray/30" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-cream text-warm-taupe text-xs font-medium">New to FashionAI?</span>
            </div>
          </div>

          {/* Register Button */}
          <Link to="/register/step-1" className="btn-secondary w-full text-center font-semibold">
            Create Account
          </Link>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-warm-taupe text-xs mt-6"
        >
          By signing in, you agree to our{' '}
          <a href="#" className="text-gold-accent hover:underline">
            Terms
          </a>{' '}
          and{' '}
          <a href="#" className="text-gold-accent hover:underline">
            Privacy Policy
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}
