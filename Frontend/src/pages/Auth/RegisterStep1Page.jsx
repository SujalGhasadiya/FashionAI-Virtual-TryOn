import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, useNotification } from '@/hooks';
import { isValidEmail, isValidPassword, isValidOTP } from '@/utils/validators';
import { Mail, Lock, CheckCircle, Key, ArrowRight, RotateCcw, Eye, EyeOff } from 'lucide-react';

const STEP_FLOW = { EMAIL: 1, OTP: 2, PASSWORD: 3 };

export default function RegisterStep1Page() {
  const navigate = useNavigate();
  const { sendOTP, verifyOTP, registerStep1, isLoading } = useAuth();
  const { showError, showSuccess } = useNotification();

  const [step, setStep] = useState(STEP_FLOW.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    e.preventDefault();
    setFormError('');

    if (!email) {
      setFormError('Email is required');
      return;
    }

    if (!isValidEmail(email)) {
      const errorMsg = 'Please enter a valid email address';
      setFormError(errorMsg);
      showError(errorMsg);
      return;
    }

    try {
      await sendOTP(email);
      setStep(STEP_FLOW.OTP);
      setOtpResendCountdown(60);
      showSuccess('OTP sent to your email');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'object' ? detail.message : (detail || 'Failed to send OTP. Please try again.');
      setFormError(errorMsg);
      showError(errorMsg);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!otp || !isValidOTP(otp)) {
      setFormError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      await verifyOTP(email, otp);
      setStep(STEP_FLOW.PASSWORD);
      showSuccess('Email verified successfully');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'object' ? detail.message : (detail || 'Invalid OTP. Please try again.');
      setFormError(errorMsg);
      showError(errorMsg);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name || !password || !confirmPassword) {
      setFormError('Please fill in all fields');
      return;
    }

    if (name.length < 2 || name.length > 120) {
      const errorMsg = 'Name must be between 2 and 120 characters';
      setFormError(errorMsg);
      showError(errorMsg);
      return;
    }

    if (!isValidPassword(password)) {
      const errorMsg = 'Password must be at least 6 characters and include one uppercase letter and one special character (!@#$%^&*)';
      setFormError(errorMsg);
      showError(errorMsg);
      return;
    }

    if (password !== confirmPassword) {
      const errorMsg = 'Passwords do not match';
      setFormError(errorMsg);
      showError(errorMsg);
      return;
    }

    try {
      await registerStep1(name, email, password, confirmPassword);
      showSuccess('Account created successfully');
      navigate('/register/step-2');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'object' ? detail.message : (detail || 'Registration failed. Please try again.');
      setFormError(errorMsg);
      showError(errorMsg);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
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
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1 className="text-3xl font-bold text-charcoal mb-2">Join FashionAI</h1>
            <p className="text-warm-taupe text-sm">Create your AI styling account</p>
          </motion.div>

          {/* Progress Steps */}
          <motion.div variants={itemVariants} className="flex justify-between mb-8">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex flex-col items-center">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    step >= num
                      ? 'bg-gold-accent text-white shadow-md'
                      : 'bg-beige text-charcoal'
                  }`}
                >
                  {step > num ? <CheckCircle size={20} /> : num}
                </motion.div>
                <span className="text-xs text-warm-taupe mt-1">
                  {num === 1 ? 'Email' : num === 2 ? 'Verify' : 'Password'}
                </span>
              </div>
            ))}
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
            {/* Step 1: Email */}
            {step === STEP_FLOW.EMAIL && (
              <motion.form
                key="email"
                onSubmit={handleSendOTP}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
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
                      Send OTP
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>

                <p className="text-center text-warm-taupe text-sm">
                  Already have an account?{' '}
                  <Link to="/login" className="text-gold-accent hover:underline font-semibold">
                    Sign in
                  </Link>
                </p>
              </motion.form>
            )}

            {/* Step 2: OTP */}
            {step === STEP_FLOW.OTP && (
              <motion.form
                key="otp"
                onSubmit={handleVerifyOTP}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-2">Enter OTP</label>
                  <p className="text-xs text-warm-taupe mb-3">6-digit code sent to {email}</p>
                  <motion.div 
                    className="flex justify-between gap-2 sm:gap-3" 
                    onPaste={handleOtpPaste}
                    animate={formError && formError.toLowerCase().includes('otp') ? { x: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                  >
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
                        className={`w-full h-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-lg border-2 transition-all focus:outline-none ${
                          formError && formError.toLowerCase().includes('otp')
                            ? 'border-rose-dust bg-rose-dust/5 text-rose-dust'
                            : 'border-warm-gray focus:border-gold-accent bg-cream text-charcoal'
                        }`}
                        disabled={isLoading}
                      />
                    ))}
                  </motion.div>
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
                      Verify OTP
                      <CheckCircle size={18} />
                    </>
                  )}
                </motion.button>

                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => setStep(STEP_FLOW.EMAIL)}
                    className="btn-secondary text-sm"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={otpResendCountdown > 0}
                    className="btn-ghost text-sm text-gold-accent disabled:text-warm-gray"
                  >
                    {otpResendCountdown > 0 ? `Resend (${otpResendCountdown}s)` : 'Resend OTP'}
                  </button>
                </div>
              </motion.form>
            )}

            {/* Step 3: Password */}
            {step === STEP_FLOW.PASSWORD && (
              <motion.form
                key="password"
                onSubmit={handleRegister}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-2">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

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
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>

                <button
                  type="button"
                  onClick={() => setStep(STEP_FLOW.OTP)}
                  className="w-full btn-secondary text-sm font-semibold"
                >
                  Back to OTP
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-warm-taupe text-xs mt-6"
        >
          By creating an account, you agree to our Terms and Privacy Policy
        </motion.p>
      </motion.div>
    </div>
  );
}
