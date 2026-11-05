import { createContext, useContext, useState, useCallback, useRef } from 'react';
import * as tryonAPI from '@/services/api/tryon';
import { useNotification } from '@/hooks';

const TryOnContext = createContext();

const normalizeTryOnJob = (job) => {
  if (!job) return job;
  return {
    ...job,
    id: job.id || job._id?.toString() || job._id,
    // Backend uses output_url; keep result_image_url for frontend compatibility.
    result_image_url: job.result_image_url || job.output_url || null,
  };
};

export const TryOnProvider = ({ children }) => {
  const { showSuccess, showError: showGlobalError } = useNotification();
  const [currentJob, setCurrentJob] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const pollingRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const isPollingRef = useRef(false);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tryonAPI.getTryOnHistory({ include_unsaved: true });
      const normalizedHistory = (response.data || []).map(normalizeTryOnJob);
      setHistory(normalizedHistory);

      // Automatic Job Recovery: If we load the page and find a processing job, resume tracking it.
      const activeJob = normalizedHistory.find(job => job.status === 'processing');
      if (activeJob && !isPollingRef.current) {
        console.log('[TryOn] Found active processing job on load, resuming tracking:', activeJob.id);
        setCurrentJob(activeJob);
        setIsProcessing(true);
        if (activeJob.progress) setProcessingProgress(activeJob.progress);
        pollForCompletion(activeJob.id).catch(err => console.error("Resume polling failed:", err));
      }

      return normalizedHistory;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to fetch history';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTryOn = useCallback(async (garmentItemId, overridePhoto = null, garmentPhotoType = 'flat-lay', advancedOptions = {}, tempGarmentFilename = null, garmentCategory = null) => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      if (garmentItemId) {
        formData.append('top_item_id', garmentItemId);
      }
      if (tempGarmentFilename) {
        formData.append('temp_garment_filename', tempGarmentFilename);
      }
      if (garmentCategory) {
        formData.append('garment_category', garmentCategory);
      }

      if (overridePhoto) {
        formData.append('override_photo', overridePhoto);
      }

      // Normalize frontend values to backend-accepted values.
      // Backend expects 'model' or 'flat-lay'. Some UI code uses 'on-model'.
      const _gpt = (garmentPhotoType || 'flat-lay').toString().trim().toLowerCase();
      const normalizedGarmentPhotoType = _gpt === 'on-model' ? 'model' : _gpt;
      formData.append('garment_photo_type', normalizedGarmentPhotoType);
      
      if (advancedOptions.num_timesteps) {
        formData.append('vton_num_timesteps', advancedOptions.num_timesteps);
      }
      if (advancedOptions.guidance_scale) {
        formData.append('vton_guidance_scale', advancedOptions.guidance_scale);
      }
      if (advancedOptions.segmentation_free !== undefined) {
        formData.append('vton_segmentation_free', advancedOptions.segmentation_free);
      }

      console.log('[TryOn] Creating try-on job...');
      const response = await tryonAPI.createTryOn(formData);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      const normalizedJob = normalizeTryOnJob(response.data);
      setCurrentJob(normalizedJob);
      setProcessingProgress(0); // Start at 0% when job is created
      console.log('[TryOn] Job created:', normalizedJob.id, 'Status:', normalizedJob.status);

      // If job is created but still processing, start polling
      if (normalizedJob.status === 'processing') {
        console.log('[TryOn] Starting polling for job:', normalizedJob.id);
        const completedJob = await pollForCompletion(normalizedJob.id);
        if (completedJob) {
          const normalizedCompleted = normalizeTryOnJob(completedJob);
          setCurrentJob(normalizedCompleted);
          setProcessingProgress(100);
          setIsProcessing(false);
          console.log('[TryOn] Job completed:', normalizedCompleted.id);
          await fetchHistory();
        } else {
          console.log('[TryOn] Polling stopped (job likely cancelled)');
          setIsProcessing(false);
        }
      } else if (normalizedJob.status === 'completed') {
        console.log('[TryOn] Job already completed');
        setProcessingProgress(100);
        setIsProcessing(false);
        await fetchHistory();
      } else {
        console.warn('[TryOn] Unexpected job status:', normalizedJob.status);
        setIsProcessing(false);
      }

      return normalizedJob;
    } catch (err) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to create try-on';
      console.error('[TryOn] Error:', errorMsg);
      setError(errorMsg);
      setIsProcessing(false);
      throw err;
    }
  }, [fetchHistory]);

  const pollForCompletion = useCallback(async (jobId) => {
    isPollingRef.current = true;

    try {
      console.log('[TryOn] Polling started for job:', jobId);
      
      // Give the backend a moment to ensure the job is in the DB before first check
      await new Promise(r => setTimeout(r, 1000));
      
      // We manually poll here so we can check isPollingRef.current
      const pollInterval = 3000;
      let completedJob = null;
      
      while (isPollingRef.current) {
        try {
          const response = await tryonAPI.getTryOnHistory({ include_unsaved: true });
          const normalizedData = (response.data || []).map(normalizeTryOnJob);
          const job = normalizedData.find(j => j.id === jobId);
          
          if (job) {
            console.log(`[TryOn] Polling check for ${jobId}: Status is "${job.status}", Progress: ${job.progress || 0}%`);
            
            // Set real progress from DB
            if (job.progress !== undefined) {
              setProcessingProgress(job.progress);
            }

            if (job.status === 'completed') {
              completedJob = job;
              break;
            } else if (job.status === 'failed') {
              throw new Error(job.error_message || 'Try-on processing failed');
            } else if (job.status === 'cancelled') {
              throw new Error('Try-on was cancelled');
            }
          } else {
            console.warn(`[TryOn] Polling: Job ${jobId} not found in history`);
          }
        } catch (e) {
          console.error('[TryOn] Poll error:', e);
          // If the error is a definitive failure/cancellation, break out of the loop
          if (e.message.includes('failed') || e.message.includes('cancelled')) {
            throw e;
          }
          // Otherwise, it's likely a network error. We just log it and try again on the next tick.
        }
        await new Promise(r => setTimeout(r, pollInterval));
      }

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      isPollingRef.current = false;
      
      if (!completedJob) return null;
      
      console.log('[TryOn] Polling completed. Job status:', completedJob?.status);
      
      setProcessingProgress(100);
      setCurrentJob(normalizeTryOnJob(completedJob));
      setIsProcessing(false);

      showSuccess('Your virtual try-on has finished generating!', 6000);

      // Update history with completed job
      setHistory((prev) =>
        prev.map((job) => (job.id === jobId ? normalizeTryOnJob(completedJob) : job))
      );

      return completedJob;
    } catch (err) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      isPollingRef.current = false;
      const errorMsg = err.message || 'Try-on processing failed';
      console.error('[TryOn] Polling error:', errorMsg);
      setError(errorMsg);
      setIsProcessing(false);
      showGlobalError(`Try-on failed: ${errorMsg}`, 6000);
      throw err;
    }
  }, [fetchHistory, showSuccess, showGlobalError]);

  const cancelPolling = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    isPollingRef.current = false;
    setIsProcessing(false);
    setProcessingProgress(0);
  }, []);

  const cancelTryOn = useCallback(async (jobId) => {
    try {
      cancelPolling(); // Stop local intervals and polling loop first
      await tryonAPI.cancelTryOn(jobId);
      setIsProcessing(false);
      setProcessingProgress(0);
      setCurrentJob(null);
      await fetchHistory();
      console.log('[TryOn] Job cancelled:', jobId);
    } catch (err) {
      console.error('[TryOn] Cancellation failed:', err);
      // Even if API fails, we should stop local processing if user forced it
      setIsProcessing(false);
      setProcessingProgress(0);
      throw err;
    }
  }, [fetchHistory]);

  const saveTryOn = useCallback(async (jobId) => {
    try {
      const response = await tryonAPI.saveTryOnResult(jobId);
      const updatedJob = normalizeTryOnJob(response.data);
      
      setCurrentJob((prev) => (prev?.id === jobId ? updatedJob : prev));
      
      setHistory((prev) =>
        prev.map((job) => (job.id === jobId ? updatedJob : job))
      );
      return updatedJob;
    } catch (err) {
      console.error('Failed to save try-on:', err);
      throw err;
    }
  }, []);

  const resetTryOn = useCallback(() => {
    setCurrentJob(null);
    setIsProcessing(false);
    setProcessingProgress(0);
    setError(null);
  }, []);

  const value = {
    currentJob,
    history,
    isLoading,
    error,
    isProcessing,
    processingProgress,
    fetchHistory,
    createTryOn,
    pollForCompletion,
    cancelPolling,
    cancelTryOn,
    saveTryOn,
    resetTryOn,
  };

  return <TryOnContext.Provider value={value}>{children}</TryOnContext.Provider>;
};

export const useTryOn = () => {
  const context = useContext(TryOnContext);
  if (!context) {
    throw new Error('useTryOn must be used within TryOnProvider');
  }
  return context;
};
