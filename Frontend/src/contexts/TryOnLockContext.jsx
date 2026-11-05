import { createContext, useContext, useState, useCallback } from 'react';

const TryOnLockContext = createContext();

export const TryOnLockProvider = ({ children }) => {
  const [isTryOnProcessing, setIsTryOnProcessing] = useState(false);
  const [tryOnProgress, setTryOnProgress] = useState(0);
  const [showCompletionNotification, setShowCompletionNotification] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('Try-on complete!');

  const startTryOn = useCallback(() => {
    setIsTryOnProcessing(true);
    setTryOnProgress(0);
    setShowCompletionNotification(false);
  }, []);

  const updateProgress = useCallback((progress) => {
    setTryOnProgress(Math.min(progress, 100));
  }, []);

  const completeTryOn = useCallback((message = 'Your try-on is ready!') => {
    setIsTryOnProcessing(false);
    setTryOnProgress(100);
    setCompletionMessage(message);
    setShowCompletionNotification(true);
  }, []);

  const abortTryOn = useCallback(() => {
    setIsTryOnProcessing(false);
    setTryOnProgress(0);
    setShowCompletionNotification(false);
  }, []);

  const dismissCompletion = useCallback(() => {
    setShowCompletionNotification(false);
  }, []);

  const value = {
    isTryOnProcessing,
    tryOnProgress,
    showCompletionNotification,
    completionMessage,
    startTryOn,
    updateProgress,
    completeTryOn,
    abortTryOn,
    dismissCompletion,
  };

  return (
    <TryOnLockContext.Provider value={value}>
      {children}
    </TryOnLockContext.Provider>
  );
};

export const useTryOnLock = () => {
  const context = useContext(TryOnLockContext);
  if (!context) {
    throw new Error('useTryOnLock must be used within TryOnLockProvider');
  }
  return context;
};
