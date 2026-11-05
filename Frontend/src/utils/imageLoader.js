/**
 * Image Loading Utilities
 * Handles image validation, caching, fallbacks, and error recovery
 */

// Default placeholder/fallback images
export const PLACEHOLDER_IMAGES = {
  wardrobe: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect fill="%23e8e4df" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="48" fill="%239d938b"%3E👔%3C/text%3E%3C/svg%3E',
  profile: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect fill="%23f5f3f0" width="400" height="400"/%3E%3Ccircle cx="200" cy="150" r="60" fill="%23d4cdc6"/%3E%3Cellipse cx="200" cy="300" rx="100" ry="80" fill="%23d4cdc6"/%3E%3C/svg%3E',
  banner: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300"%3E%3Crect fill="%23faf8f6" width="1200" height="300"/%3E%3Crect fill="%23e8e4df" width="1200" height="300" opacity="0.5"/%3E%3C/svg%3E',
};

// Image URL validation
export const isValidImageUrl = (url) => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return ['http', 'https', 'data'].includes(urlObj.protocol.replace(':', ''));
  } catch {
    return url.startsWith('data:image/');
  }
};

// Image URL normalization
export const normalizeImageUrl = (url, baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001') => {
  if (!url) return null;

  // Already valid absolute URL
  if (isValidImageUrl(url)) {
    return url;
  }

  // Relative path - prepend base URL
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }

  // No protocol - assume relative and prepend base
  if (!url.includes('://')) {
    return `${baseUrl}/${url}`;
  }

  return url;
};

// Image cache for loaded images
const imageCache = new Map();

export const cacheImage = (url, status) => {
  if (url) {
    imageCache.set(url, status); // 'loading', 'success', 'error'
  }
};

export const getImageCacheStatus = (url) => {
  return imageCache.get(url);
};

export const clearImageCache = () => {
  imageCache.clear();
};

/**
 * Image loading hook-like function for tracking loading state
 * Returns object with {isLoading, hasError, url}
 */
export const createImageLoader = (initialUrl) => {
  const normalizedUrl = normalizeImageUrl(initialUrl);
  const cachedStatus = getImageCacheStatus(normalizedUrl);

  return {
    url: normalizedUrl || PLACEHOLDER_IMAGES.wardrobe,
    isLoading: cachedStatus === 'loading',
    hasError: cachedStatus === 'error',
    isCached: cachedStatus === 'success',
  };
};

/**
 * Track image loading event
 */
export const onImageLoad = (url) => {
  cacheImage(url, 'success');
};

/**
 * Track image error event
 */
export const onImageError = (url) => {
  cacheImage(url, 'error');
  console.warn(`[Image Loading Error] Failed to load: ${url}`);
};

/**
 * Get appropriate fallback image based on context
 */
export const getFallbackImage = (context = 'wardrobe') => {
  const fallbacks = {
    wardrobe: PLACEHOLDER_IMAGES.wardrobe,
    profile: PLACEHOLDER_IMAGES.profile,
    banner: PLACEHOLDER_IMAGES.banner,
  };
  return fallbacks[context] || PLACEHOLDER_IMAGES.wardrobe;
};

/**
 * Batch preload images (optional optimization)
 */
export const preloadImages = (urls) => {
  urls.forEach((url) => {
    const normalizedUrl = normalizeImageUrl(url);
    if (normalizedUrl) {
      const img = new Image();
      img.onload = () => cacheImage(normalizedUrl, 'success');
      img.onerror = () => cacheImage(normalizedUrl, 'error');
      img.src = normalizedUrl;
    }
  });
};

/**
 * Retry image loading with exponential backoff
 */
export const retryImageLoad = async (url, maxRetries = 3, delayMs = 1000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return url;
      }
    } catch (err) {
      lastError = err;
    }
    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
  throw lastError;
};
