/**
 * Micro-Interactions Library
 * Reusable components with enhanced animations
 */
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/useAnimation';

/**
 * AnimatedButton - Button with hover/tap animations
 */
export const AnimatedButton = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  disabled = false,
  ...props
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const variants = {
    primary: 'btn btn-primary',
    secondary: 'btn btn-secondary',
    ghost: 'btn btn-ghost',
  };

  return (
    <motion.button
      className={`${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.button>
  );
};

/**
 * AnimatedCard - Card with hover/scroll animations
 */
export const AnimatedCard = ({
  children,
  className = '',
  onClick = null,
  variant = 'default',
  ...props
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const variants = {
    default: 'card',
    luxury: 'card-luxury',
    glass: 'card-glass',
  };

  return (
    <motion.div
      className={`${variants[variant]} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      whileHover={
        !prefersReducedMotion
          ? {
              y: -8,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
            }
          : {}
      }
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * AnimatedInput - Input with focus animations
 */
export const AnimatedInput = ({
  className = '',
  ...props
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.input
      className={`w-full px-4 py-2 border-2 border-warm-gray rounded-lg focus:outline-none focus:border-gold-accent transition-colors ${className}`}
      initial={{ borderColor: 'rgba(212, 205, 198, 1)' }}
      whileFocus={
        !prefersReducedMotion
          ? {
              boxShadow: '0 0 0 3px rgba(196, 169, 98, 0.1)',
              borderColor: 'rgba(196, 169, 98, 1)',
            }
          : {}
      }
      transition={{ duration: 0.2 }}
      {...props}
    />
  );
};

/**
 * AnimatedCheckbox - Checkbox with check animation
 */
export const AnimatedCheckbox = ({
  checked = false,
  onChange,
  label = '',
  className = '',
  ...props
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <motion.div
        className={`w-5 h-5 border-2 rounded transition-colors ${
          checked
            ? 'bg-gold-accent border-gold-accent'
            : 'border-warm-gray hover:border-gold-accent'
        }`}
        whileTap={!prefersReducedMotion ? { scale: 0.9 } : {}}
      >
        {checked && !prefersReducedMotion && (
          <motion.svg
            className="w-full h-full text-charcoal"
            fill="currentColor"
            viewBox="0 0 20 20"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 15,
            }}
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </motion.svg>
        )}
      </motion.div>
      {label && <span className="text-charcoal font-medium">{label}</span>}
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="hidden"
        {...props}
      />
    </label>
  );
};

/**
 * AnimatedSelect - Select with dropdown animation
 */
export const AnimatedSelect = ({
  options = [],
  value = '',
  onChange,
  className = '',
  ...props
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.select
      className={`w-full px-4 py-2 border-2 border-warm-gray rounded-lg focus:outline-none focus:border-gold-accent focus:ring-2 focus:ring-gold-accent/10 transition-all ${className}`}
      value={value}
      onChange={onChange}
      initial={!prefersReducedMotion ? { opacity: 0.5 } : {}}
      animate={!prefersReducedMotion ? { opacity: 1 } : {}}
      whileFocus={
        !prefersReducedMotion
          ? { boxShadow: '0 0 0 3px rgba(196, 169, 98, 0.1)' }
          : {}
      }
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </motion.select>
  );
};

/**
 * AnimatedToggle - Toggle switch with animation
 */
export const AnimatedToggle = ({
  enabled = false,
  onChange,
  className = '',
  ...props
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className={`relative inline-flex items-center cursor-pointer ${className}`}
      onClick={() => onChange(!enabled)}
    >
      <motion.div
        className={`w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-gold-accent' : 'bg-warm-gray'
        }`}
        animate={!prefersReducedMotion ? { boxShadow: enabled ? '0 0 10px rgba(196, 169, 98, 0.3)' : 'none' } : {}}
      >
        <motion.div
          className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"
          animate={
            !prefersReducedMotion
              ? {
                  x: enabled ? 24 : 0,
                }
              : {}
          }
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
        />
      </motion.div>
      <input
        type="checkbox"
        checked={enabled}
        onChange={() => onChange(!enabled)}
        className="hidden"
        {...props}
      />
    </motion.div>
  );
};

/**
 * AnimatedBadge - Badge with entrance animation
 */
export const AnimatedBadge = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const variantClasses = {
    primary: 'bg-gold-accent text-charcoal',
    secondary: 'bg-sage text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-charcoal',
    error: 'bg-rose-500 text-white',
  };

  return (
    <motion.span
      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${variantClasses[variant]} ${className}`}
      initial={!prefersReducedMotion ? { scale: 0, opacity: 0 } : {}}
      animate={!prefersReducedMotion ? { scale: 1, opacity: 1 } : {}}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      {...props}
    >
      {children}
    </motion.span>
  );
};

/**
 * AnimatedProgressBar - Progress bar with animated fill
 */
export const AnimatedProgressBar = ({
  progress = 0,
  height = 6,
  className = '',
  animated = true,
  ...props
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div
      className={`w-full bg-warm-gray rounded-full overflow-hidden ${className}`}
      style={{ height: `${height}px` }}
    >
      <motion.div
        className="h-full bg-gradient-to-r from-gold-accent to-gold-accent/80"
        initial={!prefersReducedMotion && animated ? { width: 0 } : { width: `${progress}%` }}
        animate={!prefersReducedMotion && animated ? { width: `${progress}%` } : {}}
        transition={{
          duration: 0.6,
          ease: 'easeOut',
        }}
        {...props}
      />
    </div>
  );
};

/**
 * AnimatedLoadingSpinner - Rotating loading spinner
 */
export const AnimatedLoadingSpinner = ({
  size = 24,
  color = '#c4a962',
  className = '',
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.svg
      className={`${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      animate={!prefersReducedMotion ? { rotate: 360 } : {}}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <circle cx="12" cy="12" r="10" />
    </motion.svg>
  );
};

/**
 * AnimatedSuccessCheckmark - Success animation
 */
export const AnimatedSuccessCheckmark = ({
  size = 48,
  className = '',
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.svg
      className={`text-green-500 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      initial={!prefersReducedMotion ? { scale: 0, rotate: -180 } : {}}
      animate={!prefersReducedMotion ? { scale: 1, rotate: 0 } : {}}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
      }}
    >
      <polyline points="20 6 9 17 4 12" />
    </motion.svg>
  );
};

/**
 * AnimatedErrorIcon - Error animation
 */
export const AnimatedErrorIcon = ({
  size = 48,
  className = '',
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.svg
      className={`text-rose-500 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      initial={!prefersReducedMotion ? { scale: 0.5, opacity: 0 } : {}}
      animate={!prefersReducedMotion ? { scale: 1, opacity: 1 } : {}}
      transition={{
        duration: 0.3,
      }}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </motion.svg>
  );
};
