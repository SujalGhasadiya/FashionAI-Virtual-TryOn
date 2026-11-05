/**
 * Confetti Component
 * Displays celebratory confetti animation
 */
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/useAnimation';

export const Confetti = ({ active = true, particleCount = 50, duration = 2000 }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!active || prefersReducedMotion) return null;

  const confetti = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 2 + Math.random() * 1,
    angle: Math.random() * 360,
    swingAmount: Math.random() * 100,
  }));

  const colors = ['#c4a962', '#8b9e7a', '#a5b8d1', '#b896a8', '#faf8f6', '#e8e4df'];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {confetti.map((item) => (
        <motion.div
          key={item.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: `${item.left}%`,
            top: '-10px',
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
          }}
          initial={{ 
            y: 0, 
            opacity: 1, 
            rotate: 0,
            x: 0,
          }}
          animate={{
            y: window.innerHeight + 20,
            opacity: 0,
            rotate: Math.random() * 720,
            x: (Math.random() - 0.5) * item.swingAmount,
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
 * Confetti Hook
 * Hook to control confetti display
 */
import { useState, useCallback } from 'react';

export const useConfettiBlast = () => {
  const [showConfetti, setShowConfetti] = useState(false);

  const trigger = useCallback((duration = 2000) => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), duration);
  }, []);

  return { showConfetti, trigger, Confetti: () => <Confetti active={showConfetti} /> };
};
