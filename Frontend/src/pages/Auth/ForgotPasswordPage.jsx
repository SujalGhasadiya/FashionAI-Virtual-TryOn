import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, useNotification } from '@/hooks';
import { isValidEmail, isValidOTP, isValidPassword } from '@/utils/validators';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, CheckCircle, Key } from 'lucide-react';

const STEP_FLOW = { EMAIL: 1, OTP: 2, PASSWORD: 3, SUCCESS: 4 };

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { sendPasswordResetOTP, verifyPasswordResetOTP, resetPassword, isLoading } = useAuth();
  const { showError, showSuccess } = useNotification();

  const [step, setStep] = useState(STEP_FLOW.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [formError, setFormError] = useState('');
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const otpInputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  // OTP Resend Countdown
  useEffect(() => {
    if (otpResendCountdown > 0) {
      const timer = setTimeout(() => setOtpResendCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendCountdown]);

  // Auto-focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === STEP_FLOW.OTP) {
      const timer = setTimeout(() => {
        if (otpInputRefs[0].current) {
          otpInputRefs[0].current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleOtpChange = (index, value) => {
    const newOtp = otp.split('');
    // Only allow numbers
    const cleanValue = value.replace(/\D/g, '').slice(-1);
    
    if (cleanValue) {
      newOtp[index] = cleanValue;
      setOtp(newOtp.join(''));
      
      // Focus next
      if (index < 5) {
        otpInputRefs[index + 1].current.focus();
      }
    } else if (value === '') {
      // Handle deletion 
      newOtp[index] = '';
      setOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Focus previous on backspace if current is empty
      otpInputRefs[index - 1].current.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasteData) {
      setOtp(pasteData);
      // Fill inputs and focus last
      const lastIndex = Math.min(pasteData.length - 1, 5);
      if (otpInputRefs[lastIndex].current) {
        otpInputRefs[lastIndex].current.focus();
      }
    }
  };

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    setFormError('');

    if (!email) {
      setFormError('Email is required');
      return;
    }

    if (!isValidEmail(email)) {
      setFormError('Invalid email address');
      return;
    }

    try {
      const response = await sendPasswordResetOTP(email);
      setStep(STEP_FLOW.OTP);
      setOtpResendCountdown(60);
      showSuccess('Password reset code sent to your email');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'object' ? detail.message : (detail || 'Failed to send reset code');
      setFormError(errorMsg);
      showError(errorMsg);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!otp || !isValidOTP(otp)) {
      setFormError('Please enter a valid 6-digit code');
      return;
    }

    try {
      const data = await verifyPasswordResetOTP(email, otp);
      setResetToken(data.reset_token);
      setStep(STEP_FLOW.PASSWORD);
      showSuccess('Code verified successfully');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'object' ? detail.message : (detail || 'Invalid code. Please try again.');
      setFormError(errorMsg);
      showError(errorMsg);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!password || !confirmPassword) {
      setFormError('Please fill in all fields');
      return;
    }

    if (!isValidPassword(password)) {
      setFormError('Password must be at least 6 characters and include one uppercase letter and one special character (!@#$%^&*)');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    try {
      await resetPassword(resetToken, password, confirmPassword);
      setStep(STEP_FLOW.SUCCESS);
      showSuccess('Password reset successfully');
      
      // Redirect after 5 seconds
      setTimeout(() => {
        navigate('/login');
      }, 5000);
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
          {/* Header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold text-charcoal mb-2">
              {step === STEP_FLOW.SUCCESS ? 'Password Reset!' : 'Reset Password'}
            </h1>
            <p className="text-warm-taupe text-sm">
              {step === STEP_FLOW.EMAIL && 'Enter your email to receive password reset instructions'}
              {step === STEP_FLOW.OTP && `Enter the 6-digit code sent to ${email}`}
              {step === STEP_FLOW.PASSWORD && 'Create a new secure password for your account'}
              {step === STEP_FLOW.SUCCESS && 'Your password has been successfully updated'}
            </p>
          </motion.div>

          {/* Error Message */}
          <AnimatePresence>
            {formError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-rose-dust/10 border border-rose-dust/30 rounded-lg text-rose-dust text-sm"
              >
                {formError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Content */}
          <AnimatePresence mode="wait">
            {step === STEP_FLOW.EMAIL && (
              <motion.form
                key="email"
                onSubmit={handleSendOTP}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-2">Email Address</label>
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

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary font-semibold flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Code
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>

                <div className="mt-6 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-warm-taupe hover:text-gold-accent transition-colors text-sm"
                  >
                    <ArrowLeft size={16} />
                    Back to Login
                  </Link>
                </div>
              </motion.form>
            )}

            {step === STEP_FLOW.OTP && (
              <motion.form
                key="otp"
                onSubmit={handleVerifyOTP}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div onPaste={handleOtpPaste}>
                  <div className="flex justify-between gap-2 sm:gap-3">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        ref={otpInputRefs[index]}
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength="1"
                        value={otp[index] || ''}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        autoFocus={index === 0}
                        className="w-full h-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-lg border-2 border-warm-gray focus:border-gold-accent bg-cream text-charcoal focus:outline-none transition-all"
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="w-full btn-primary font-semibold flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Code
                      <CheckCircle size={18} />
                    </>
                  )}
                </motion.button>

                <div className="flex flex-col gap-3 items-center">
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={isLoading || otpResendCountdown > 0}
                    className="text-gold-accent hover:underline text-sm font-semibold disabled:text-warm-gray disabled:no-underline"
                  >
                    {otpResendCountdown > 0 ? `Resend code in ${otpResendCountdown}s` : 'Resend Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(STEP_FLOW.EMAIL)}
                    className="text-warm-taupe hover:text-charcoal text-sm flex items-center gap-1"
                    disabled={isLoading}
                  >
                    <ArrowLeft size={14} />
                    Change Email
                  </button>
                </div>
              </motion.form>
            )}

            {step === STEP_FLOW.PASSWORD && (
              <motion.form
                key="password"
                onSubmit={handleResetPassword}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
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
                </div>

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

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary font-semibold flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>
              </motion.form>
            )}

            {step === STEP_FLOW.SUCCESS && (
              <motion.div
                key="success"
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

                <div className="bg-powder-blue/10 border border-powder-blue/30 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-charcoal">
                    Your password has been successfully reset. You can now use your new password to sign in to your account.
                  </p>
                </div>

                <p className="text-warm-taupe text-xs">
                  Redirecting to login in <span className="font-semibold">5 seconds</span>...
                </p>

                <motion.button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full btn-primary font-semibold mt-6 flex items-center justify-center gap-2"
                >
                  Go to Login
                  <ArrowLeft size={18} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step !== STEP_FLOW.SUCCESS && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-warm-taupe text-xs mt-6"
          >
            Don't have an account?{' '}
            <Link to="/register/step-1" className="text-gold-accent hover:underline font-semibold">
              Sign up
            </Link>
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
