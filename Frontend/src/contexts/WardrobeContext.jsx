import { createContext, useContext, useState, useCallback } from 'react';
import * as wardrobeAPI from '@/services/api/wardrobe';

const WardrobeContext = createContext();

export const WardrobeProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'top', 'bottom'

  const fetchItems = useCallback(async (includeInactive = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await wardrobeAPI.getWardrobeItems(includeInactive);
      setItems(response.data || []);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to fetch wardrobe items';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadItem = useCallback(async (type, file) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('file', file);

      const response = await wardrobeAPI.uploadWardrobeItem(formData);
      setItems((prev) => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to upload item';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateItemStatus = useCallback(async (itemId, status) => {
    setError(null);
    try {
      const response = await wardrobeAPI.updateWardrobeItemStatus(itemId, status);
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? response.data : item))
      );
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to update item status';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const deleteItem = useCallback(async (itemId) => {
    setError(null);
    try {
      await wardrobeAPI.deleteWardrobeItem(itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to delete item';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const syncEmbeddings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await wardrobeAPI.syncWardrobeEmbeddings();
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to sync embeddings';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getFilteredItems = useCallback(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.type === filter && item.active_status === 'active');
  }, [items, filter]);

  const getTops = useCallback(() => {
    return items.filter((item) => item.type === 'top' && item.active_status === 'active');
  }, [items]);

  const getBottoms = useCallback(() => {
    return items.filter((item) => item.type === 'bottom' && item.active_status === 'active');
  }, [items]);

  const getOnePieces = useCallback(() => {
    return items.filter((item) => item.type === 'one-piece' && item.active_status === 'active');
  }, [items]);

  const value = {
    items,
    isLoading,
    error,
    filter,
    setFilter,
    fetchItems,
    uploadItem,
    updateItemStatus,
    deleteItem,
    syncEmbeddings,
    getFilteredItems,
    getTops,
    getBottoms,
    getOnePieces,
  };

  return (
    <WardrobeContext.Provider value={value}>{children}</WardrobeContext.Provider>
  );
};

export const useWardrobe = () => {
  const context = useContext(WardrobeContext);
  if (!context) {
    throw new Error('useWardrobe must be used within WardrobeProvider');
  }
  return context;
};
