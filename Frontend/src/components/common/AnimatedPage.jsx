/**
 * AnimatedPage Wrapper
 * Provides page transition animations
 */
import { motion } from 'framer-motion';
import { pageVariants } from '@/utils/animations';
import { usePrefersReducedMotion } from '@/hooks/useAnimation';

export const AnimatedPage = ({ children, variant = 'default' }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const variants = {
    default: pageVariants,
    fade: {
      initial: { opacity: 0 },
      enter: { opacity: 1, transition: { duration: 0.4 } },
      exit: { opacity: 0, transition: { duration: 0.2 } },
    },
    scale: {
      initial: { opacity: 0, scale: 0.95 },
      enter: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
      exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
    },
  };

  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={variants[variant]}
    >
      {children}
    </motion.div>
  );
};
