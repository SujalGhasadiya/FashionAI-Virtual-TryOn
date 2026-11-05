import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useWardrobe } from '@/contexts/WardrobeContext';
import { useTryOn } from '@/contexts/TryOnContext';
import { useRecommendation } from '@/contexts/RecommendationContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useSessionConflict } from './useSessionConflict';

// Re-export all hooks for convenience
export {
  useAuth,
  useUser,
  useWardrobe,
  useTryOn,
  useRecommendation,
  useSubscription,
  useAdmin,
  useNotification,
  useSessionConflict,
};

// Combined hook for main app state
export const useAppState = () => {
  return {
    auth: useAuth(),
    user: useUser(),
    wardrobe: useWardrobe(),
    tryon: useTryOn(),
    recommendation: useRecommendation(),
    subscription: useSubscription(),
    notification: useNotification(),
  };
};
