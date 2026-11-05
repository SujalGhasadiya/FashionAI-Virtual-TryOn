import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '@/hooks';
import { X } from 'lucide-react';

export default function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  const getBackgroundColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-white border-green-200 shadow-lg';
      case 'error':
        return 'bg-white border-red-200 shadow-lg';
      case 'warning':
        return 'bg-white border-yellow-200 shadow-lg';
      default:
        return 'bg-white border-blue-200 shadow-lg';
    }
  };

  const getTextColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            className="mb-3 pointer-events-auto"
          >
            <div
              className={`border rounded-xl px-5 py-4 flex items-center justify-between gap-4 min-w-[320px] ${getBackgroundColor(
                notif.type
              )}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${notif.type === 'success' ? 'bg-green-500' : notif.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
                <p className={`${getTextColor(notif.type)} font-semibold text-sm`}>
                  {notif.message}
                </p>
              </div>
              <button
                onClick={() => removeNotification(notif.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
