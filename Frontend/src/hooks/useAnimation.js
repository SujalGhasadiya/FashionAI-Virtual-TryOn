/**
 * useScrollAnimation Hook
 * Detects when elements enter viewport and triggers animations
 */
import { useEffect, useRef, useState } from 'react';

export const useScrollAnimation = (options = {}) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
  } = options;

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(entry.target);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
};

/**
 * useGestureHandler Hook
 * Handles swipe, tap, and other touch gestures
 */
export const useGestureHandler = (onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown) => {
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });

  const handleTouchStart = (e) => {
    const touch = e.touches?.[0];
    if (touch) {
      setTouchStart({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches?.[0];
    if (touch) {
      setTouchEnd({ x: touch.clientX, y: touch.clientY });
      detectSwipe({ x: touch.clientX, y: touch.clientY });
    }
  };

  const detectSwipe = (endPos) => {
    const SWIPE_THRESHOLD = 50; // minimum distance for swipe

    const deltaX = Math.abs(endPos.x - touchStart.x);
    const deltaY = Math.abs(endPos.y - touchStart.y);

    // Horizontal swipe
    if (deltaX > SWIPE_THRESHOLD && deltaX > deltaY) {
      if (endPos.x < touchStart.x && onSwipeLeft) {
        onSwipeLeft();
      } else if (endPos.x > touchStart.x && onSwipeRight) {
        onSwipeRight();
      }
    }

    // Vertical swipe
    if (deltaY > SWIPE_THRESHOLD && deltaY > deltaX) {
      if (endPos.y < touchStart.y && onSwipeUp) {
        onSwipeUp();
      } else if (endPos.y > touchStart.y && onSwipeDown) {
        onSwipeDown();
      }
    }
  };

  return { handleTouchStart, handleTouchEnd };
};

/**
 * useConfetti Hook
 * Triggers confetti animation on demand
 */
export const useConfetti = () => {
  const [showConfetti, setShowConfetti] = useState(false);

  const trigger = (duration = 2000) => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), duration);
  };

  return { showConfetti, trigger };
};

/**
 * useScrollProgress Hook
 * Tracks scroll progress as value between 0-1
 */
export const useScrollProgress = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const progress = windowHeight > 0 ? scrolled / windowHeight : 0;
      setScrollProgress(Math.min(progress, 1));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollProgress;
};

/**
 * useMousePosition Hook
 * Tracks mouse position for interactive effects
 */
export const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return mousePosition;
};

/**
 * usePrefersReducedMotion Hook
 * Respects user's motion preferences for accessibility
 */
export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

/**
 * useDebounce Hook
 * Debounces a value for animations and effects
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * usePageTransitionDelay Hook
 * Adds delays to prevent animation overload on page load
 */
export const usePageTransitionDelay = (baseDelay = 0) => {
  return { delay: baseDelay };
};
