import API from '../axios';

// Create try-on job
export const createTryOn = (formData) => {
  return API.post('/tryon', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Get try-on history
export const getTryOnHistory = (params = {}) => {
  return API.get('/tryon/history', { params });
};

// Save a try-on result
export const saveTryOnResult = (jobId) => {
  return API.post(`/tryon/${jobId}/save`);
};

// Cancel an ongoing try-on job
export const cancelTryOn = (jobId) => {
  return API.post(`/tryon/${jobId}/cancel`);
};

// Poll for try-on status
export const pollTryOnStatus = async (jobId, maxWait = 3600000) => {
  const pollInterval = parseInt(import.meta.env.VITE_TRYON_POLLING_INTERVAL || '2000');
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    try {
      const response = await getTryOnHistory();
      const job = response.data.find((j) => j.id === jobId);

      if (job?.status === 'completed') {
        return job;
      } else if (job?.status === 'failed') {
        throw new Error(job.error_message || 'Try-on processing failed');
      }
    } catch (err) {
      console.error('Polling error:', err);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Try-on processing timeout');
};

// Helper: Check if try-on is processing
export const isTryOnProcessing = (job) => {
  return job?.status === 'processing';
};

// Helper: Check if try-on is completed
export const isTryOnCompleted = (job) => {
  return job?.status === 'completed';
};

// Helper: Check if try-on failed
export const isTryOnFailed = (job) => {
  return job?.status === 'failed';
};
