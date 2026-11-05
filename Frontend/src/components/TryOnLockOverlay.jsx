import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTryOnLock } from '@/contexts/TryOnLockContext';

const TryOnLockOverlay = () => {
  const { isTryOnProcessing, tryOnProgress, showCompletionNotification, completionMessage, dismissCompletion } = useTryOnLock();

  // Auto-dismiss logic
  useEffect(() => {
    let timer;
    if (showCompletionNotification) {
      timer = setTimeout(() => {
        dismissCompletion();
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [showCompletionNotification, dismissCompletion]);

  return (
    <AnimatePresence>
      {/* Completion Notification */}
      {showCompletionNotification && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 right-4 z-50 pointer-events-auto"
        >
          <div className="bg-white border border-green-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 min-w-[320px] shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <p className="text-green-600 font-semibold text-sm">
                {completionMessage}
              </p>
            </div>
            <button
              onClick={dismissCompletion}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* Auto-dismiss timer visual */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 5, ease: 'linear' }}
            onAnimationComplete={dismissCompletion}
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 origin-left rounded-b-xl"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TryOnLockOverlay;
