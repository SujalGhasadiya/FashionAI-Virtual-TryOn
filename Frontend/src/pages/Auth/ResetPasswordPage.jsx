import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, useNotification } from '@/hooks';
import { isValidPassword } from '@/utils/validators';
import { Lock, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword, isLoading } = useAuth();
  const { showError, showSuccess } = useNotification();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (!resetToken) {
      setFormError('Invalid reset link');
      setTimeout(() => navigate('/forgot-password'), 3000);
    } else {
      setToken(resetToken);
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!password || !confirmPassword) {
      setFormError('Please fill in all fields');
      return;
    }

    if (!isValidPassword(password)) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    try {
      await resetPassword(token, password, confirmPassword);
      setIsSubmitted(true);
      showSuccess('Password reset successfully');

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'object' ? detail.message : (detail || 'Failed to reset password');
      setFormError(errorMsg);
      showError(errorMsg);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative backgrounds */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-powder opacity-5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-sage opacity-5 rounded-full blur-3xl" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="card-luxury">
          {!isSubmitted ? (
            <>
              {/* Header */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-8"
              >
                <h1 className="text-3xl font-bold text-charcoal mb-2">Create New Password</h1>
                <p className="text-warm-taupe text-sm">
                  Enter a strong password to secure your account
                </p>
              </motion.div>

              {/* Error Message */}
              {formError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0, x: [-5, 5, -5, 5, 0] }}
                  transition={{ duration: 0.4 }}
                  className="mb-6 p-4 bg-rose-dust/10 border border-rose-dust/30 rounded-lg text-rose-dust text-sm"
                >
                  {formError}
                </motion.div>
              )}

              {/* Form */}
              {token && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Password Input */}
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-warm-gray" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field !pl-14 pr-12"
                        disabled={isLoading}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-warm-gray hover:text-charcoal transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-xs text-warm-taupe mt-1">Minimum 6 characters</p>
                  </div>

                  {/* Confirm Password Input */}
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-warm-gray" size={18} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-field !pl-14 pr-12"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-warm-gray hover:text-charcoal transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Password Match Indicator */}
                  {password && confirmPassword && (
                    <div
                      className={`p-3 rounded-lg text-sm font-semibold transition-all ${
                        password === confirmPassword
                          ? 'bg-sage/10 text-sage border border-sage/30'
                          : 'bg-rose-dust/10 text-rose-dust border border-rose-dust/30'
                      }`}
                    >
                      {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </div>
                  )}

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
                    className="w-full btn-primary font-semibold flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        Reset Password
                        <ArrowRight size={18} />
                      </>
                    )}
                  </motion.button>
                </form>
              )}

              {/* Back to Login */}
              <div className="mt-6 text-center">
                <Link to="/login" className="text-warm-taupe hover:text-gold-accent transition-colors text-sm">
                  Back to Login
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Success State */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-sage/20 mb-6"
                >
                  <CheckCircle size={32} className="text-sage" />
                </motion.div>

                <h2 className="text-2xl font-bold text-charcoal mb-2">Password Reset!</h2>
                <p className="text-warm-taupe text-sm mb-6">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>

                <p className="text-warm-taupe text-xs">
                  Redirecting to login in <span className="font-semibold">3 seconds</span>...
                </p>

                <motion.button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full btn-primary font-semibold mt-6 flex items-center justify-center gap-2"
                >
                  Go to Login
                  <ArrowRight size={18} />
                </motion.button>
              </motion.div>
            </>
          )}
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-warm-taupe text-xs mt-6"
        >
          Having trouble? <Link to="/contact" className="text-gold-accent hover:underline font-semibold">
            Contact support
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
