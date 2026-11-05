import API from '../axios';

// Upload wardrobe item
export const uploadWardrobeItem = (formData) => {
  return API.post('/wardrobe/items', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Get all wardrobe items
export const getWardrobeItems = (includeInactive = false) => {
  return API.get('/wardrobe/items', {
    params: { include_inactive: includeInactive },
  });
};

// Update wardrobe item status (active/inactive)
export const updateWardrobeItemStatus = (itemId, activeStatus) => {
  return API.patch(`/wardrobe/items/${itemId}/status`, {
    active_status: activeStatus,
  });
};

// Delete wardrobe item
export const deleteWardrobeItem = (itemId) => {
  return API.delete(`/wardrobe/items/${itemId}`);
};

// Sync wardrobe embeddings
export const syncWardrobeEmbeddings = () => {
  return API.post('/wardrobe/embeddings/sync');
};

// Helper: Get filtered wardrobe items
export const getWardrobeByType = (items, type) => {
  return items.filter((item) => item.type === type);
};

// Extract image from URL
export const extractImageFromUrl = (url) => {
  return API.post('/wardrobe/extract-url', { url });
};

// Save temp image to wardrobe
export const saveTempToWardrobe = (filename, type) => {
  return API.post('/wardrobe/items/from-temp', { filename, type });
};
