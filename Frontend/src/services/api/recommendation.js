import API from '../axios';

// Get outfit recommendations based on bottom item
export const getRecommendations = (bottomItemId, occasion = '', suggestionCount = 3) => {
  return API.post('/recommend', {
    bottom_item_id: bottomItemId,
    occasion,
    suggestion_count: suggestionCount,
  });
};

// Get bottom recommendations based on top item
export const getBottomRecommendations = (topItemId, occasion = '', suggestionCount = 3) => {
  return API.post('/recommend/bottoms', {
    bottom_item_id: topItemId,
    occasion,
    suggestion_count: suggestionCount,
  });
};

// Get recommendation history
export const getRecommendationHistory = () => {
  return API.get('/recommend/history');
};

// Occasion options available
export const OCCASION_OPTIONS = [
  'casual',
  'formal',
  'office',
  'party',
  'sports',
  'beach',
  'outdoor',
  'date',
  'business',
  'semi-formal',
  'evening',
];
