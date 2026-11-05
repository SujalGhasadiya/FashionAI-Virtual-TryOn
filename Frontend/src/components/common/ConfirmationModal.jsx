import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { AnimatedButton } from './MicroInteractions';

export const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you sure?", 
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning" // "warning", "danger", "info"
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <div className="p-3 bg-rose-dust/10 rounded-full text-rose-dust"><AlertCircle size={28} /></div>;
      case 'info':
        return <div className="p-3 bg-powder-blue/10 rounded-full text-powder-blue"><AlertCircle size={28} /></div>;
      default:
        return <div className="p-3 bg-gold-accent/10 rounded-full text-gold-accent"><AlertCircle size={28} /></div>;
    }
  };

  const getConfirmButtonVariant = () => {
    switch (type) {
      case 'danger':
        return 'danger';
      default:
        return 'primary';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-charcoal/60"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-luxury overflow-hidden"
          >
            {/* Top accent line */}
            <div className={`h-1.5 w-full ${
              type === 'danger' ? 'bg-rose-dust' : type === 'info' ? 'bg-powder-blue' : 'bg-gold-accent'
            }`} />

            <div className="p-6">
              {/* Close button */}
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-1 text-warm-taupe hover:text-charcoal transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  {getIcon()}
                </div>
                
                <h3 className="text-xl font-bold text-charcoal mb-2">
                  {title}
                </h3>
                
                <p className="text-warm-taupe text-sm mb-8">
                  {message}
                </p>

                <div className="flex w-full gap-3">
                  <AnimatedButton
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1"
                  >
                    {cancelText}
                  </AnimatedButton>
                  <AnimatedButton
                    variant={getConfirmButtonVariant()}
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                    className="flex-1"
                  >
                    {confirmText}
                  </AnimatedButton>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
