import { createContext, useContext, useState, useCallback } from 'react';
import * as recommendationAPI from '@/services/api/recommendation';

const RecommendationContext = createContext();

export const RecommendationProvider = ({ children }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [remainingRecommendations, setRemainingRecommendations] = useState(0);

  const fetchRecommendations = useCallback(
    async (bottomItemId, occasion = '', suggestionCount = 3) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await recommendationAPI.getRecommendations(
          bottomItemId,
          occasion,
          suggestionCount
        );

        setRecommendations(response.data.results || []);
        setRemainingRecommendations(response.data.remaining_recommendations_today || 0);
        return response.data;
      } catch (err) {
        const errorMsg = err.response?.data?.detail || 'Failed to fetch recommendations';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchBottomRecommendations = useCallback(
    async (topItemId, occasion = '', suggestionCount = 3) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await recommendationAPI.getBottomRecommendations(
          topItemId,
          occasion,
          suggestionCount
        );

        setRecommendations(response.data.results || []);
        setRemainingRecommendations(response.data.remaining_recommendations_today || 0);
        return response.data;
      } catch (err) {
        const errorMsg = err.response?.data?.detail || 'Failed to fetch recommendations';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await recommendationAPI.getRecommendationHistory();
      setHistory(response.data || []);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to fetch recommendation history';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearRecommendations = useCallback(() => {
    setRecommendations([]);
    setError(null);
  }, []);

  const value = {
    recommendations,
    history,
    isLoading,
    error,
    remainingRecommendations,
    fetchRecommendations,
    fetchBottomRecommendations,
    fetchHistory,
    clearRecommendations,
    occasionOptions: recommendationAPI.OCCASION_OPTIONS,
  };

  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  );
};

export const useRecommendation = () => {
  const context = useContext(RecommendationContext);
  if (!context) {
    throw new Error('useRecommendation must be used within RecommendationProvider');
  }
  return context;
};
