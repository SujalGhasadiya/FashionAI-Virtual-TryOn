/**
 * Animation Variants & Utilities
 * Centralized Framer Motion animation definitions
 */

// PAGE TRANSITIONS
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  },
};

// FADE TRANSITIONS
export const fadeVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// SLIDE TRANSITIONS
export const slideLeftVariants = {
  initial: { opacity: 0, x: 100 },
  enter: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, x: -100, transition: { duration: 0.3 } },
};

export const slideRightVariants = {
  initial: { opacity: 0, x: -100 },
  enter: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, x: 100, transition: { duration: 0.3 } },
};

// SCALE TRANSITIONS
export const scaleVariants = {
  initial: { opacity: 0, scale: 0.9 },
  enter: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};

// STAGGER CONTAINERS
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

// HOVER ANIMATIONS
export const buttonHover = {
  scale: 1.05,
  transition: { type: 'spring', stiffness: 400, damping: 10 },
};

export const buttonTap = {
  scale: 0.95,
  transition: { type: 'spring', stiffness: 400, damping: 10 },
};

// CARD ANIMATIONS
export const cardHover = {
  y: -8,
  boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
  transition: { duration: 0.3 },
};

// SUCCESS ANIMATIONS
export const successPulse = {
  scale: [1, 1.1, 1],
  transition: {
    duration: 0.6,
    ease: 'easeInOut',
  },
};

export const checkmarkVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
      delay: 0.2,
    },
  },
};

// ERROR ANIMATIONS
export const errorShake = {
  x: [-10, 10, -10, 10, 0],
  transition: {
    duration: 0.4,
  },
};

// LOADING ANIMATIONS
export const spinVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const pulseVariants = {
  animate: {
    opacity: [0.3, 1, 0.3],
    transition: {
      duration: 2,
      repeat: Infinity,
    },
  },
};

export const shimmerVariants = {
  animate: {
    backgroundPosition: ['0% 0%', '100% 0%'],
    transition: {
      duration: 2,
      repeat: Infinity,
    },
  },
};

// SCROLL ANIMATIONS
export const scrollFadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

export const scrollFadeInDown = {
  hidden: { opacity: 0, y: -40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

// PARALLAX EFFECT
export const parallaxVariants = (offset = 50) => ({
  animate: (scrollYProgress) => ({
    y: scrollYProgress * offset,
  }),
});

// MODAL ANIMATIONS
export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

// TOOLTIP ANIMATIONS
export const tooltipVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2 },
  },
  exit: { opacity: 0, y: 8, transition: { duration: 0.15 } },
};

// ROTATION ANIMATIONS
export const rotateVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: 'easeInOut',
    },
  },
};

// BOUNCE ANIMATIONS
export const bounceVariants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// FLOAT ANIMATIONS
export const floatVariants = {
  animate: {
    y: [0, -20, 0],
    x: [0, 10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// GLOW ANIMATIONS (pulse with scale)
export const glowVariants = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(196, 169, 98, 0.7)',
      '0 0 0 20px rgba(196, 169, 98, 0)',
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
    },
  },
};
