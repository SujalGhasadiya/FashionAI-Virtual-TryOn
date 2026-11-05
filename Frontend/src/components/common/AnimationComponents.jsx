/**
 * ScrollAnimationWrapper
 * Wraps components to trigger animations on scroll
 */
import { motion } from 'framer-motion';
import { scrollFadeInUp, scrollFadeInDown, staggerContainer, staggerItem } from '@/utils/animations';
import { useScrollAnimation, usePrefersReducedMotion } from '@/hooks/useAnimation';

export const ScrollAnimationWrapper = ({
  children,
  variant = 'fadeUp',
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = true,
  delay = 0,
}) => {
  const { ref, isVisible } = useScrollAnimation({ threshold, rootMargin, triggerOnce });
  const prefersReducedMotion = usePrefersReducedMotion();

  const variants = {
    fadeUp: scrollFadeInUp,
    fadeDown: scrollFadeInDown,
  };

  if (prefersReducedMotion) {
    return <div ref={ref}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={variants[variant]}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
};

/**
 * PageTransitionLayout
 * Wraps entire page with transition animations
 */
export const PageTransitionLayout = ({ children, variant = 'fade' }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.5 },
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration: 0.5 },
    },
    slideDown: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
      transition: { duration: 0.5 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      transition: { duration: 0.4 },
    },
  };

  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }

  const config = variants[variant];

  return (
    <motion.div
      initial={config.initial}
      animate={config.animate}
      exit={config.exit}
      transition={config.transition}
    >
      {children}
    </motion.div>
  );
};

/**
 * StaggerContainer
 * Automatically stagger child animations
 */
export const AnimatedStaggerContainer = ({ children, delay = 0.1 }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: delay,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * AnimatedStaggerItem
 * Individual item in stagger animation
 */
export const AnimatedStaggerItem = ({ children }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Confetti Component
 * Displays confetti animation
 */
export const ConfettiExplosion = ({ active = true, duration = 2000 }) => {
  if (!active) return null;

  const confetti = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 1,
    angle: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {confetti.map((item) => (
        <motion.div
          key={item.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: `${item.left}%`,
            top: '-10px',
            backgroundColor: [
              '#c4a962',
              '#8b9e7a',
              '#a5b8d1',
              '#b896a8',
              '#faf8f6',
            ][Math.floor(Math.random() * 5)],
          }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{
            y: window.innerHeight + 20,
            opacity: 0,
            rotate: Math.random() * 360,
            x: (Math.random() - 0.5) * 200,
          }}
          transition={{
            duration: item.duration,
            delay: item.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  );
};

/**
 * GlowButton
 * Button with glow micro-interaction
 */
export const GlowButton = ({ children, ...props }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.button
      {...props}
      whileHover={
        !prefersReducedMotion
          ? {
              scale: 1.05,
              boxShadow: '0 0 20px rgba(196, 169, 98, 0.5)',
            }
          : {}
      }
      whileTap={!prefersReducedMotion ? { scale: 0.95 } : {}}
    >
      {children}
    </motion.button>
  );
};

/**
 * PulseCard
 * Card with pulse animation on hover
 */
export const PulseCard = ({ children, className = '', ...props }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={
        !prefersReducedMotion
          ? { y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }
          : {}
      }
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * FloatingElement
 * Element with floating animation
 */
export const FloatingElement = ({ children, duration = 3 }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      animate={{
        y: [0, -20, 0],
        x: [0, 10, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * ShimmerLoader
 * Loading skeleton with shimmer effect
 */
export const ShimmerLoader = ({ width = '100%', height = '20px', className = '' }) => {
  return (
    <motion.div
      className={`bg-gradient-to-r from-warm-gray/20 via-warm-gray/10 to-warm-gray/20 rounded ${className}`}
      style={{ width, height }}
      animate={{
        backgroundPosition: ['0% 0%', '100% 0%'],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
      }}
    />
  );
};

/**
 * CountUp
 * Animated number counter
 */
export const CountUp = ({ end = 100, duration = 2, prefix = '', suffix = '' }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {prefersReducedMotion ? (
        <>
          {prefix}
          {end}
          {suffix}
        </>
      ) : (
        <motion.span>
          {({ value }) => {
            const current = Math.floor(value);
            return (
              <>
                {prefix}
                {current}
                {suffix}
              </>
            );
          }}
          <motion.span
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0, animationPlayState: 'running' }}
            transition={{ duration }}
          />
        </motion.span>
      )}
    </motion.span>
  );
};
