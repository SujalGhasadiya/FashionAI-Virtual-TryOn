import { useEffect, useState } from 'react';

/**
 * Custom hook to detect and handle session conflict messages.
 * Shows a message when user is logged in from another device.
 */
export const useSessionConflict = () => {
  const [sessionConflictMessage, setSessionConflictMessage] = useState(null);

  useEffect(() => {
    const message = sessionStorage.getItem('sessionConflictMessage');
    if (message) {
      setSessionConflictMessage(message);
      // Clear the message after showing it
      sessionStorage.removeItem('sessionConflictMessage');
      
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setSessionConflictMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return sessionConflictMessage;
};

export default useSessionConflict;
