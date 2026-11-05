import { useTryOnLock } from '@/contexts/TryOnLockContext';

export const useIsTryOnLocked = () => {
  const { isTryOnProcessing } = useTryOnLock();
  return isTryOnProcessing;
};
