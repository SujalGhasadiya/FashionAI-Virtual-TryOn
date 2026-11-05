import React from 'react';
import { AlertCircle, X } from 'lucide-react';

/**
 * Component to display session conflict notifications.
 * Shows when a user is logged in from another device.
 */
export const SessionConflictNotification = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top fade-in">
      <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-red-800 mb-1">
              Session Ended
            </h3>
            <p className="text-red-700 text-sm">
              {message.includes('another device') 
                ? 'Your previous session was ended because you logged in from another device. Only one active session per account is allowed.'
                : message}
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-red-600 hover:text-red-700 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionConflictNotification;
