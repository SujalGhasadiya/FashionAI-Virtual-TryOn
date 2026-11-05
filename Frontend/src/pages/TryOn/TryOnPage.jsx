import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Upload,
  Download,
  Share2,
  ChevronUp,
  ChevronDown,
  Settings,
  RefreshCcw,
  Maximize2,
  ImageOff,
  AlertCircle,
  Crown,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';
import { useTryOn, useWardrobe, useNotification, useUser } from '@/hooks';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTryOnLock } from '@/contexts/TryOnLockContext';
import { validateImageFile } from '@/utils/validators';
import { normalizeImageUrl, onImageLoad, onImageError } from '@/utils/imageLoader';
import { AnimatedButton } from '@/components/common/MicroInteractions';
import { useConfettiBlast } from '@/components/common/Confetti';
import { extractImageFromUrl, saveTempToWardrobe } from '@/services/api/wardrobe';

export default function TryOnPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    createTryOn, 
    currentJob, 
    isProcessing, 
    processingProgress, 
    saveTryOn, 
    history, 
    fetchHistory,
    cancelTryOn,
    resetTryOn 
  } = useTryOn();
  const { fetchItems, items, getTops, getBottoms, getOnePieces } = useWardrobe();
  const { profile, fetchProfile } = useUser();
  const { showSuccess, showError, showInfo } = useNotification();
  const { trigger: triggerConfetti } = useConfettiBlast();
  const { startTryOn, updateProgress, completeTryOn, abortTryOn } = useTryOnLock();

  const preselectedTryOn = location.state?.garmentId
    ? {
      garmentId: location.state.garmentId,
      garmentType:
        location.state.garmentType === 'top' ||
          location.state.garmentType === 'bottom' ||
          location.state.garmentType === 'one-piece'
          ? location.state.garmentType
          : 'top',
      garmentItem: location.state.garmentItem || null,
    }
    : null;
  const preselectedTryOnRef = useRef(preselectedTryOn);

  const [step, setStep] = useState('select');
  const [garmentType, setGarmentType] = useState(preselectedTryOn?.garmentType || 'top'); // 'top' or 'bottom'
  const [selectedGarment, setSelectedGarment] = useState(preselectedTryOn?.garmentItem || null);
  const [userPhoto, setUserPhoto] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [garments, setGarments] = useState([]);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isSliderDragging, setIsSliderDragging] = useState(false);
  const [imageLoadState, setImageLoadState] = useState({}); // Track image loading
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalType, setUpgradeModalType] = useState('tryon'); // 'tryon' or 'wardrobe'
  const [garmentPhotoType, setGarmentPhotoType] = useState('flat-lay');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [numTimesteps, setNumTimesteps] = useState(30);
  const [guidanceScale, setGuidanceScale] = useState(2.0);
  const [segmentationFree, setSegmentationFree] = useState(true);
  const [dataSource, setDataSource] = useState('wardrobe'); // 'wardrobe' or 'url'
  const [extractionUrl, setExtractionUrl] = useState('');
  const [extractedImage, setExtractedImage] = useState(null); // { image_url, temp_url, filename }
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSavingTemp, setIsSavingTemp] = useState(false);
  const [lastExtractedUrl, setLastExtractedUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Subscription checks
  const isSubscriptionExpired = profile?.is_subscription_expired;
  const planCode = profile?.subscription_plan || 'free';
  const remainingTryons = profile?.remaining_tryons_today;

  useEffect(() => {
    fetchItems();
    fetchHistory();
    if (fetchProfile) {
      fetchProfile().catch(err => console.error("Failed to load profile:", err));
    }
  }, [fetchItems, fetchHistory, fetchProfile]);

  const hasShownExpiredRef = React.useRef(false);

  useEffect(() => {
    if (isSubscriptionExpired && !hasShownExpiredRef.current) {
      showInfo('Your subscription has expired. Please renew to continue using virtual try-on.');
      hasShownExpiredRef.current = true;
    }
  }, [isSubscriptionExpired, showInfo]);


  // Update garments list based on selected garment type
  useEffect(() => {
    let newGarments = [];
    if (garmentType === 'top') newGarments = getTops();
    else if (garmentType === 'bottom') newGarments = getBottoms();
    else if (garmentType === 'one-piece') newGarments = getOnePieces();
    setGarments(newGarments);
    const shouldKeepPreselected =
      preselectedTryOnRef.current &&
      preselectedTryOnRef.current.garmentType === garmentType;
    if (!shouldKeepPreselected) {
      setSelectedGarment(null); // Reset selection when changing type manually
    }
    setCurrentPage(1);
  }, [items, getTops, getBottoms, getOnePieces, garmentType]);


  const hasTriggeredConfettiRef = useRef(false);

  // Trigger confetti when try-on results are ready
  useEffect(() => {
    if (step === 'results' && (currentJob?.output_url || currentJob?.result_image_url)) {
      if (!hasTriggeredConfettiRef.current) {
        console.log('[TryOnPage] Results step active, triggering confetti');
        triggerConfetti();
        hasTriggeredConfettiRef.current = true;
      }
    } else {
      // Reset if we leave the results step so it can fire for the next job
      hasTriggeredConfettiRef.current = false;
    }
  }, [step, currentJob?.output_url, currentJob?.result_image_url, triggerConfetti]);

  // Keep global overlay progress in sync with try-on context progress.
  useEffect(() => {
    if (isProcessing) {
      updateProgress(processingProgress);
      if (step !== 'process') {
        setStep('process');
        startTryOn();
      }
    } else if (step === 'process' && currentJob?.status !== 'completed') {
      // If we are on the process step but no longer processing (and not completed), it must have failed/cancelled.
      abortTryOn();
      setStep('select');
    }
  }, [isProcessing, processingProgress, updateProgress, step, startTryOn, abortTryOn, currentJob?.status]);

  // Monitor job completion and transition to results
  useEffect(() => {
    if (currentJob && currentJob.status === 'completed') {
      console.log('[TryOnPage] Job completed, transitioning to results:', currentJob.id);
      setStep('results');
      completeTryOn('Your try-on is ready! Check the results below.');
    } else if (currentJob && currentJob.status === 'failed') {
      console.error('[TryOnPage] Job failed:', currentJob.error_message);
      showError(currentJob.error_message || 'Try-on generation failed');
      abortTryOn();
      setStep('select');
    }
  }, [currentJob, completeTryOn, abortTryOn, showError]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) await processFile(files[0]);
  };

  const processFile = async (file) => {
    try {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        showError(validation.error);
        return;
      }
      setUserPhoto(file);
    } catch (error) {
      showError('File validation failed');
    }
  };

  const handleStartTryOn = async () => {
    if (dataSource === 'wardrobe' && !selectedGarment) {
      const garmentName = garmentType === 'top' ? 'top' : garmentType === 'bottom' ? 'bottom' : 'one-piece';
      showError(`Please select a ${garmentName} item`);
      return;
    }
    if (dataSource === 'url' && !extractedImage) {
      showError('Please extract an image from a URL first');
      return;
    }
    
    if (!userPhoto && !profile?.profile_photo_url) {
      showError('Please upload your photo or add a profile photo in settings');
      return;
    }

    // Block if subscription expired
    if (isSubscriptionExpired) {
      setUpgradeModalType('tryon');
      setShowUpgradeModal(true);
      return;
    }

    // Block if daily limit reached
    const hasRemainingTryons = profile?.tryon_daily_limit === null || remainingTryons === null || remainingTryons === undefined || remainingTryons > 0;
    if (!hasRemainingTryons) {
      setUpgradeModalType('tryon');
      setShowUpgradeModal(true);
      return;
    }

    setStep('process');
    startTryOn(); // Lock UI globally
    try {
      const advancedOpts = showAdvanced ? {
          num_timesteps: numTimesteps,
          guidance_scale: guidanceScale,
          segmentation_free: segmentationFree
      } : {};

      if (dataSource === 'url' && extractedImage) {
         await createTryOn(
           null, 
           userPhoto,
           garmentPhotoType,
           advancedOpts,
           extractedImage.filename,
           garmentType === 'one-piece' ? 'one-pieces' : garmentType + 's'
         );
      } else {
         await createTryOn(
           selectedGarment.id, 
           userPhoto, 
           garmentPhotoType, 
           advancedOpts
         );
      }
      showSuccess('Try-on started!');
    } catch (error) {
      showError(error.message || 'Try-on failed');
      abortTryOn();
      setStep('select');
    }
  };

  const handleExtractUrl = async () => {
    if (!extractionUrl) return showError('Please enter a URL');

    try {
      new URL(extractionUrl);
    } catch (_) {
      showError('Please enter a valid URL formatting (e.g. https://...)');
      return;
    }

    const supportedPattern = /^https:\/\/(?:www\.)?(?:amazon\.(?:com|in|co\.uk|de|fr|it|es|ca|com\.mx|com\.au|com\.br|sg|ae|jp)|flipkart\.com)(?:\/.*)?$/i;
    if (!supportedPattern.test(extractionUrl)) {
      showError('Only valid product links from Amazon and Flipkart are allowed');
      return;
    }

    try {
      setIsExtracting(true);
      const res = await extractImageFromUrl(extractionUrl);
      if (res.data?.success) {
        setExtractedImage(res.data);
        setLastExtractedUrl(extractionUrl);
        setIsSaved(false);
        showSuccess('Image extracted successfully!');
      } else {
        showError('Failed to extract image. Please try using a different product link.');
        setExtractionUrl('');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string' && detail.includes('Amazon and Flipkart')) {
        showError(detail);
      } else {
        showError('Failed to extract image. Please try using a different product link.');
      }
      setExtractionUrl('');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveTempToWardrobe = async () => {
    if (!extractedImage) return;
    try {
      setIsSavingTemp(true);
      const res = await saveTempToWardrobe(extractedImage.filename, garmentType);
      showSuccess('Saved to wardrobe!');
      
      // Smart handling:
      // Since the backend MOVED the file to wardrobe, the temp file no longer exists.
      // We switch to wardrobe mode and select the newly created item automatically.
      await fetchItems();
      setSelectedGarment(res.data);
      setDataSource('wardrobe');
      setExtractedImage(null);
      setExtractionUrl('');
      setIsSaved(false);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to save to wardrobe';
      showError(msg);
      if (msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('upgrade')) {
        setUpgradeModalType('wardrobe');
        setShowUpgradeModal(true);
      }
    } finally {
      setIsSavingTemp(false);
    }
  };

  const handleImageLoad = (id) => {
    setImageLoadState((prev) => ({
      ...prev,
      [id]: 'loaded',
    }));
  };

  const handleImageError = (id, imageUrl) => {
    onImageError(imageUrl);
    setImageLoadState((prev) => ({
      ...prev,
      [id]: 'error',
    }));
  };

  const getImageUrl = (item) => {
    return normalizeImageUrl(item.image_url) || '/placeholder-wardrobe.svg';
  };

  const resultImageUrl =
    normalizeImageUrl(currentJob?.output_url || currentJob?.result_image_url) ||
    currentJob?.output_url ||
    currentJob?.result_image_url ||
    null;

  const handleSliderMove = (e) => {
    if (!isSliderDragging) return;
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  const topContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
  };

  const topItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    hover: { y: -8, transition: { duration: 0.2 } },
  };

  return (
    <div className="min-h-screen bg-cream pb-8">
      {/* HEADER */}
      <motion.header
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-white border-b border-warm-gray/30 px-4 sm:px-8 py-4"
      >
        <div className="container-luxury flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-ivory rounded-lg transition-colors"
            >
              <ArrowLeft size={22} className="text-charcoal" />
            </motion.button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-charcoal">
                Virtual Try-On
              </h1>
              <p className="text-warm-taupe text-sm">
                See how items look on you with AI
              </p>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container-luxury py-6">
        <AnimatePresence mode="wait">
          {/* STEP 1: SELECT */}
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {/* 1. GARMENT CATEGORY SELECTOR */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-warm-gray/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-bold text-charcoal mb-1">Choose Category</h2>
                    <p className="text-sm text-warm-taupe">What would you like to try on today?</p>
                  </div>
                  <div className="flex p-1 bg-ivory rounded-xl border border-warm-gray/20 w-full md:w-auto min-w-[300px]">
                    {['top', 'bottom', 'one-piece'].map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setGarmentType(type);
                          setCurrentPage(1);
                        }}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
                          garmentType === type
                            ? 'bg-white text-terracotta shadow-sm ring-1 ring-terracotta/10'
                            : 'text-warm-taupe hover:text-charcoal'
                        }`}
                      >
                        {type.replace('-', ' ')}s
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* 2. GARMENT SELECTION GRID */}
              <section>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-charcoal mb-2">
                      Select Your Garment
                    </h2>
                    <p className="text-warm-taupe">Pick an item from your {garmentType.replace('-', ' ')} collection or extract from URL</p>
                  </div>
                  <div className="flex p-1 bg-ivory rounded-xl border border-warm-gray/20">
                    <button
                      onClick={() => setDataSource('wardrobe')}
                      className={`flex-1 px-6 py-2 rounded-lg text-xs font-bold transition-all ${
                        dataSource === 'wardrobe'
                          ? 'bg-white text-terracotta shadow-sm ring-1 ring-terracotta/10'
                          : 'text-warm-taupe hover:text-charcoal'
                      }`}
                    >
                      Wardrobe
                    </button>
                    <button
                      onClick={() => setDataSource('url')}
                      className={`flex-1 px-6 py-2 rounded-lg text-xs font-bold transition-all ${
                        dataSource === 'url'
                          ? 'bg-white text-terracotta shadow-sm ring-1 ring-terracotta/10'
                          : 'text-warm-taupe hover:text-charcoal'
                      }`}
                    >
                      URL Link
                    </button>
                  </div>
                </div>

                {dataSource === 'wardrobe' ? (
                  <>
                    {garments.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="card-luxury text-center py-16"
                      >
                        <ImageOff size={48} className="mx-auto text-warm-gray mb-4" />
                        <h3 className="text-xl font-bold text-charcoal mb-2">
                          No garments yet
                        </h3>
                        <p className="text-warm-taupe mb-6">
                          Build your wardrobe first to start trying on
                        </p>
                        <AnimatedButton
                          variant="primary"
                          onClick={() => navigate('/wardrobe')}
                        >
                          Go to Wardrobe
                        </AnimatedButton>
                      </motion.div>
                    ) : (
                      <div className="space-y-6">
                        <motion.div
                          variants={topContainerVariants}
                          initial="hidden"
                          animate="visible"
                          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                        >
                          {garments
                            .slice((currentPage - 1) * 10, currentPage * 10)
                            .map((item) => (
                              <motion.button
                                key={item.id}
                                variants={topItemVariants}
                                whileHover="hover"
                                onClick={() => setSelectedGarment(item)}
                                className={`card-garment relative overflow-hidden group cursor-pointer transition-all ${selectedGarment?.id === item.id
                                    ? 'ring-2 ring-terracotta'
                                    : 'hover:ring-1 hover:ring-terracotta'
                                  }`}
                              >
                                {/* Image */}
                                <div className="aspect-[4/5] overflow-hidden rounded-md bg-white">
                                  {imageLoadState[item.id] !== 'error' ? (
                                    <>
                                      {imageLoadState[item.id] !== 'loaded' && (
                                        <motion.div
                                          animate={{ opacity: [0.5, 1, 0.5] }}
                                          transition={{ duration: 1.5, repeat: Infinity }}
                                          className="absolute inset-0 bg-warm-gray/20"
                                        />
                                      )}
                                      <motion.img
                                        whileHover={{ scale: 1.05 }}
                                        src={normalizeImageUrl(item.image_url) || item.image_url}
                                        alt="Garment"
                                        className="w-full h-full object-contain p-2"
                                        onLoad={() =>
                                          setImageLoadState((prev) => ({ ...prev, [item.id]: 'loaded' }))
                                        }
                                        onError={() => {
                                          onImageError(item.image_url);
                                          setImageLoadState((prev) => ({ ...prev, [item.id]: 'error' }));
                                        }}
                                      />
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <ImageOff size={24} className="text-warm-gray" />
                                    </div>
                                  )}
                                </div>

                                {/* Selection Badge */}
                                <AnimatePresence>
                                  {selectedGarment?.id === item.id && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      exit={{ scale: 0 }}
                                      className="absolute top-2 right-2 w-6 h-6 bg-terracotta rounded-full flex items-center justify-center text-cream"
                                    >
                                      ✓
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.button>
                            ))}
                        </motion.div>

                        {Math.ceil(garments.length / 10) > 1 && (
                          <div className="flex justify-center items-center gap-4">
                            <button
                              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                              disabled={currentPage === 1}
                              className="px-4 py-2 rounded-lg border border-warm-gray/30 text-charcoal font-semibold disabled:opacity-50 hover:bg-warm-gray/10 transition-colors"
                            >
                              Previous
                            </button>
                            <span className="text-sm font-semibold text-charcoal">
                              Page {currentPage} of {Math.ceil(garments.length / 10)}
                            </span>
                            <button
                              onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(garments.length / 10)))}
                              disabled={currentPage === Math.ceil(garments.length / 10)}
                              className="px-4 py-2 rounded-lg border border-warm-gray/30 text-charcoal font-semibold disabled:opacity-50 hover:bg-warm-gray/10 transition-colors"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-warm-gray/10 relative">
                    {/* Loader Overlay */}
                    {isExtracting && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 rounded-2xl flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-terracotta animate-spin mb-4" />
                        <p className="text-charcoal font-bold">Extracting image, please wait...</p>
                      </div>
                    )}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                      <div className="flex-1">
                        <input 
                          type="url"
                          placeholder="Paste Amazon or Flipkart product URL here..."
                          value={extractionUrl}
                          onChange={(e) => setExtractionUrl(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-warm-gray/30 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-charcoal placeholder-warm-taupe"
                          disabled={isExtracting}
                        />
                        <p className="text-xs text-warm-taupe mt-2 ml-1 font-medium">
                          * Currently only supporting product links from Amazon and Flipkart.
                        </p>
                      </div>
                      <AnimatedButton 
                        variant="primary" 
                        onClick={handleExtractUrl} 
                        disabled={isExtracting || !extractionUrl || extractionUrl === lastExtractedUrl}
                        className="h-[50px]"
                      >
                        {isExtracting ? 'Extracting...' : 'Extract Image'}
                      </AnimatedButton>
                    </div>

                    {extractedImage && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center p-6 border border-warm-gray/20 rounded-xl bg-ivory">
                        <img src={normalizeImageUrl(extractedImage.temp_url)} alt="Extracted" className="w-64 h-64 object-contain rounded-xl shadow-luxury-sm bg-white mb-6" />
                        <div className="flex gap-4">
                          <AnimatedButton 
                            variant="outline" 
                            onClick={handleSaveTempToWardrobe} 
                            disabled={isSavingTemp || isSaved}
                            className={isSaved ? "bg-sage/10 border-sage text-sage" : ""}
                          >
                            {isSavingTemp ? 'Saving...' : isSaved ? '✓ Saved to Wardrobe' : 'Save to Wardrobe'}
                          </AnimatedButton>
                        </div>
                        <p className="text-xs text-warm-taupe mt-4">
                          Or click "Start Try-On" below to use it instantly without saving.
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}
              </section>

              {/* 3. PHOTO PERSPECTIVE TOGGLE */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-warm-gray/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-bold text-charcoal mb-1">Photo Perspective</h2>
                    <p className="text-sm text-warm-taupe italic">
                      * <span className="font-bold">Flat-Lay</span>: Garment on a flat surface. 
                      <br />
                      * <span className="font-bold">On-Model</span>: Garment being worn.
                    </p>
                  </div>
                  <div className="flex p-1 bg-ivory rounded-xl border border-warm-gray/20 w-full md:w-auto min-w-[300px]">
                    {[
                      { id: 'flat-lay', label: 'Flat-Lay' },
                      { id: 'on-model', label: 'On-Model' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setGarmentPhotoType(opt.id)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                          garmentPhotoType === opt.id
                            ? 'bg-white text-terracotta shadow-sm ring-1 ring-terracotta/10'
                            : 'text-warm-taupe hover:text-charcoal'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* 4. PHOTO UPLOAD */}
              <section className="flex flex-col lg:flex-row gap-8 items-stretch pt-4">
                {/* Left Side: Photo Upload */}
                <div className="flex-[1.5] flex flex-col">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-charcoal mb-2">Your Photo (Optional)</h2>
                    <p className="text-warm-taupe">
                      If left empty, we'll use your 
                      <span className="text-terracotta font-semibold px-1">profile photo</span>.
                    </p>
                  </div>

                  <motion.div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    animate={dragActive ? { scale: 1.02 } : { scale: 1 }}
                    className={`flex-1 relative rounded-2xl border-2 border-dashed p-6 sm:p-8 transition-all cursor-pointer flex flex-col items-center justify-center ${dragActive
                        ? 'border-terracotta bg-terracotta/5'
                        : 'border-warm-gray/50 bg-ivory hover:border-terracotta hover:bg-terracotta/5'
                      }`}
                  >
                    {userPhoto ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4 w-full"
                      >
                        <div className="relative aspect-square max-w-[160px] mx-auto rounded-xl overflow-hidden shadow-luxury">
                          <img
                            src={URL.createObjectURL(userPhoto)}
                            alt="Your photo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-center space-y-2">
                          <p className="text-xs font-medium text-charcoal truncate px-4">{userPhoto.name}</p>
                          <AnimatedButton
                            variant="secondary"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setUserPhoto(null);
                            }}
                            className="px-4 py-1.5 text-xs inline-block"
                          >
                            Change Photo
                          </AnimatedButton>
                        </div>
                      </motion.div>
                    ) : (
                      <label className="cursor-pointer w-full h-full flex items-center justify-center">
                        <div className="flex flex-col items-center justify-center py-4">
                          <motion.div
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity }}
                            className="mb-4"
                          >
                            <Upload size={40} className="text-terracotta" />
                          </motion.div>
                          <h3 className="text-xl font-bold text-charcoal mb-1 text-center">
                            Drag your photo here
                          </h3>
                          <p className="text-sm text-warm-taupe text-center mb-4">
                            or click to browse
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) processFile(e.target.files[0]);
                            }}
                            className="hidden"
                          />
                          <div className="text-xs text-warm-taupe">JPG, PNG • Up to 10MB</div>
                        </div>
                      </label>
                    )}
                  </motion.div>
                </div>
                
                {/* Right Side: Action Buttons */}
                <div className="flex-1 flex flex-col justify-start gap-4 mt-6 lg:mt-0 lg:pb-1 relative">
                  {/* Invisible spacer to align perfectly with the box on desktop */}
                  <div className="mb-4 hidden lg:block invisible pointer-events-none" aria-hidden="true">
                    <h2 className="text-2xl font-bold mb-2">Spacer</h2>
                    <p className="text-base">Spacer line</p>
                  </div>
                  {/* Cancel & Generate Row */}
                  <div className="flex gap-4">
                    <AnimatedButton
                      variant="secondary"
                      onClick={() => navigate('/dashboard')}
                      className="flex-[0.8] py-4"
                    >
                      Cancel
                    </AnimatedButton>
                    <AnimatedButton
                      variant="primary"
                      onClick={() => {
                        if (isProcessing) {
                          setStep('process');
                        } else if (currentJob?.status === 'completed') {
                          setStep('results');
                        } else {
                          handleStartTryOn();
                        }
                      }}
                      disabled={isProcessing}
                      className={`flex-[1.2] flex items-center justify-center gap-2 font-semibold transition-all py-4 ${
                        isProcessing ? 'bg-terracotta/80 shadow-inner ring-2 ring-terracotta/20 cursor-not-allowed opacity-80' : ''
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCcw size={20} className="animate-spin" />
                          <span className="animate-pulse">Processing...</span>
                        </>
                      ) : (
                        <>
                          <Play size={20} />
                          Generate Try-On
                        </>
                      )}
                    </AnimatedButton>
                  </div>
                  
                  {/* Advanced Toggle & Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className={`flex items-center justify-between w-full px-5 py-4 rounded-xl transition-all border-2 ${
                        showAdvanced 
                          ? 'bg-terracotta border-terracotta text-white shadow-luxury' 
                          : 'bg-ivory border-warm-gray/30 text-charcoal hover:border-terracotta'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Settings size={18} className={showAdvanced ? 'animate-spin-slow' : ''} />
                        <span className="font-bold text-sm whitespace-nowrap">Advanced Options</span>
                      </div>
                      <ChevronDown 
                        size={16} 
                        className={`transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} 
                      />
                    </button>

                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-[100%] left-0 right-0 mt-2 z-50 overflow-hidden" 
                        >
                        <div className="p-5 space-y-8 bg-white rounded-2xl border border-warm-gray/20 shadow-luxury">
                        {/* SAMPLING STEPS */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-charcoal tracking-wider">Sampling Steps</h3>
                              <p className="text-xs text-warm-taupe">Higher = better quality but slower. 30 is recommended.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-12 py-1 px-2 bg-ivory border border-warm-gray/30 rounded text-center text-xs font-black text-terracotta shadow-sm">
                                {numTimesteps}
                              </span>
                              <button 
                                onClick={() => setNumTimesteps(30)}
                                className="p-1 hover:bg-ivory rounded-full transition-all text-warm-taupe hover:text-terracotta hover:rotate-180 duration-500"
                                title="Reset to default"
                              >
                                <RefreshCcw size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="relative flex items-center gap-4">
                            <span className="text-[10px] font-black text-warm-taupe/30">08</span>
                            <input
                              type="range"
                              min="8"
                              max="50"
                              step="1"
                              value={numTimesteps}
                              onChange={(e) => setNumTimesteps(parseInt(e.target.value))}
                              className="flex-1 h-1 bg-warm-gray/20 rounded-full appearance-none cursor-pointer accent-[#c65d2c]"
                            />
                            <span className="text-[10px] font-black text-warm-taupe/30">50</span>
                          </div>
                        </div>

                        {/* GUIDANCE SCALE */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-charcoal tracking-wider">Guidance Scale</h3>
                              <p className="text-xs text-warm-taupe">How closely to follow garment details. 2.0 recommended.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-12 py-1 px-2 bg-ivory border border-warm-gray/30 rounded text-center text-xs font-black text-terracotta shadow-sm">
                                {guidanceScale.toFixed(1)}
                              </span>
                              <button 
                                onClick={() => setGuidanceScale(2.0)}
                                className="p-1 hover:bg-ivory rounded-full transition-all text-warm-taupe hover:text-terracotta hover:rotate-180 duration-500"
                                title="Reset to default"
                              >
                                <RefreshCcw size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="relative flex items-center gap-4">
                            <span className="text-[10px] font-black text-warm-taupe/30">1.0</span>
                            <input
                              type="range"
                              min="1"
                              max="5"
                              step="0.1"
                              value={guidanceScale}
                              onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                              className="flex-1 h-1 bg-warm-gray/20 rounded-full appearance-none cursor-pointer accent-[#c65d2c]"
                            />
                            <span className="text-[10px] font-black text-warm-taupe/30">5.0</span>
                          </div>
                        </div>

                        {/* SEGMENTATION FREE */}
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-ivory border border-warm-gray/20 shadow-soft">
                          <div className="pt-1">
                            <input
                              type="checkbox"
                              id="seg-free"
                              checked={segmentationFree}
                              onChange={(e) => setSegmentationFree(e.target.checked)}
                              className="w-5 h-5 rounded-md border-warm-gray text-terracotta focus:ring-terracotta cursor-pointer transition-all"
                            />
                          </div>
                          <label htmlFor="seg-free" className="cursor-pointer space-y-1">
                            <h3 className="text-sm font-bold text-charcoal tracking-wider">Segmentation-Free</h3>
                            <p className="text-xs text-warm-taupe leading-relaxed">Preserves body features and allows unconstrained garment volume. <span className="text-terracotta font-black">(Recommended)</span></p>
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
                </div>
              </section>
              {isSubscriptionExpired && (
                <div className="mt-4 p-3 bg-rose-dust/10 rounded-lg border border-rose-dust/20 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-rose-dust" />
                  <p className="text-xs text-rose-dust font-medium">
                    Your subscription has expired. Please renew to continue using virtual try-on.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: PROCESSING */}
          {step === 'process' && (
            <motion.div
              key="process"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-20 space-y-6"
            >
              {/* Animated Loader */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="relative w-40 h-40"
              >
                <div className="absolute inset-0 bg-gradient-sage/20 rounded-full blur-2xl" />
                <div className="absolute inset-4 border-2 border-warm-gray/30 rounded-full" />
                <div className="absolute inset-8 border-2 border-sage rounded-full border-t-terracotta border-r-powder-blue" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-4xl font-bold text-gradient-gold">✨</div>
                </div>
              </motion.div>

              {/* Text */}
              <div className="text-center max-w-md">
                <h2 className="text-3xl font-bold text-charcoal mb-3">
                  Generating Your Try-On
                </h2>
                <p className="text-warm-taupe mb-2">
                  Our AI is analyzing your photo and applying the garment with precise accuracy...
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-charcoal">Progress</span>
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-sm font-bold text-terracotta"
                  >
                    {processingProgress}%
                  </motion.span>
                </div>
                <div className="h-3 bg-warm-gray/20 rounded-full overflow-hidden relative">
                  <motion.div
                    className="h-full gradient-gold relative overflow-hidden"
                    initial={{ width: '0%' }}
                    animate={{ width: `${processingProgress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    {/* Animated Shimmer / Glare Effect */}
                    <motion.div 
                      className="absolute top-0 bottom-0 w-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                      initial={{ left: '-100%' }}
                      animate={{ left: '200%' }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    />
                  </motion.div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 mt-4">
                <p className="text-sm text-warm-taupe">
                  ⏱️ It takes few minutes to generate the try-on.
                </p>
                
                    <AnimatedButton
                      variant="secondary"
                      onClick={async () => {
                        if (currentJob?.id) {
                          try {
                            await cancelTryOn(currentJob.id);
                            setStep('select');
                            showSuccess('Try-on cancelled');
                          } catch (err) {
                            showError('Failed to cancel job');
                            setStep('select');
                          }
                        } else {
                          setStep('select');
                          resetTryOn();
                        }
                      }}
                      className="px-8 py-2 text-xs font-bold border-rose-dust/30 text-rose-dust hover:bg-rose-dust hover:text-white"
                    >
                      Cancel Process
                    </AnimatedButton>
              </div>
            </motion.div>
          )}

          {/* STEP 3: RESULTS */}
          {step === 'results' && currentJob && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-10"
            >
              {/* RESULT DISPLAY */}
              <section className="max-w-xs mx-auto">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-charcoal mb-1">Your New Look</h2>
                  <p className="text-[11px] text-warm-taupe tracking-widest font-black opacity-60">Try-on Complete</p>
                </div>

                <div className="card-luxury p-2 overflow-hidden bg-white shadow-luxury-lg rounded-[2rem] border border-beige/40">
                  <div className="relative aspect-[3/4] bg-ivory rounded-[1.75rem] overflow-hidden shadow-inner">
                    {resultImageUrl && imageLoadState['result'] !== 'error' ? (
                      <>
                        {imageLoadState['result'] !== 'loaded' && (
                          <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-0 bg-warm-gray/10 z-10"
                          />
                        )}
                        {/* WATERMARK OVERLAY */}
                        <div 
                          className="absolute inset-0 pointer-events-none z-10 select-none"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg transform='rotate(-35 60 30)'%3E%3Ctext x='50%25' y='50%25' fill='rgba(255,255,255,0.4)' font-size='11' font-family='system-ui, sans-serif' font-weight='900' text-anchor='middle' dominant-baseline='middle' style='text-shadow: 0px 1px 2px rgba(0,0,0,0.7)'%3ETry on preview%3C/text%3E%3C/g%3E%3C/svg%3E")`,
                            backgroundRepeat: 'repeat',
                            backgroundSize: '120px 60px'
                          }}
                        />

                        <img
                          src={resultImageUrl}
                          alt="Try-on Result"
                          className="w-full h-full object-cover select-none"
                          onLoad={() => handleImageLoad('result')}
                          onError={() => handleImageError('result', resultImageUrl)}
                          onContextMenu={(e) => e.preventDefault()}
                          onDragStart={(e) => e.preventDefault()}
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-ivory/50">
                        <ImageOff size={48} className="text-warm-gray mb-4 opacity-50" />
                        <p className="text-sm font-medium text-warm-taupe">Result image unavailable</p>
                      </div>
                    )}
                    
                    {/* PREMIUM LABEL */}
                    <div className="absolute top-4 left-4 z-20 flex gap-2">
                      <div className="px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-terracotta/20 text-terracotta shadow-luxury">
                        <p className="text-[10px] font-black tracking-[0.2em]">VIRTUAL RESULT</p>
                      </div>
                    </div>

                    {/* MAXIMIZE BUTTON */}
                    <button
                      onClick={() => setSelectedImage(resultImageUrl)}
                      className="absolute top-4 right-4 p-2.5 rounded-full bg-white/80 backdrop-blur-md border border-terracotta/20 text-terracotta shadow-luxury hover:bg-terracotta hover:text-white transition-all z-20"
                      title="View Fullscreen"
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </div>
              </section>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
                <AnimatedButton
                  variant="secondary"
                  onClick={() => {
                    resetTryOn();
                    navigate('/dashboard');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold"
                >
                  ← Dashboard
                </AnimatedButton>
                <AnimatedButton
                  variant="primary"
                  onClick={async () => {
                    try {
                      await saveTryOn(currentJob.id);
                      showSuccess('Try-on saved!');
                    } catch (error) {
                      if (error.response?.status === 403 || error.response?.status === 429) {
                        setShowUpgradeModal(true);
                      } else {
                        showError(error.response?.data?.detail || 'Failed to save');
                      }
                    }
                  }}
                  disabled={currentJob.is_saved}
                  className="w-full sm:w-auto px-6 py-2.5 flex items-center justify-center gap-2 text-xs font-bold"
                >
                  <Download size={14} />
                  {currentJob.is_saved ? 'Saved' : 'Save Look'}
                </AnimatedButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* FULL SCREEN IMAGE MODAL */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-10"
          >
            <div 
              className="absolute inset-0 bg-charcoal/95 backdrop-blur-md" 
              onClick={() => setSelectedImage(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl max-h-[90vh] flex items-center justify-center"
            >
              <div className="relative inline-block max-w-full max-h-full">
                {/* FULLSCREEN WATERMARK OVERLAY */}
                <div 
                  className="absolute inset-0 pointer-events-none z-10 select-none rounded-2xl overflow-hidden"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='160' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg transform='rotate(-35 80 40)'%3E%3Ctext x='50%25' y='50%25' fill='rgba(255,255,255,0.4)' font-size='16' font-family='system-ui, sans-serif' font-weight='900' text-anchor='middle' dominant-baseline='middle' style='text-shadow: 0px 2px 3px rgba(0,0,0,0.7)'%3ETry on preview%3C/text%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '160px 80px'
                  }}
                />

                <img
                  src={selectedImage}
                  alt="Large View"
                  className="max-w-full max-h-[85vh] sm:max-h-[90vh] object-contain rounded-2xl shadow-luxury-lg select-none"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 sm:top-0 sm:-right-12 p-4 text-white/50 hover:text-white transition-colors"
              >
                <X size={32} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPGRADE MODAL */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpgradeModal(false)}
              className="absolute inset-0 bg-charcoal/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-cream rounded-2xl shadow-luxury overflow-hidden"
            >
              <div className="h-2 bg-gradient-gold" />
              <div className="p-8">
                <div className="w-16 h-16 bg-terracotta/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <Crown size={32} className="text-terracotta" />
                </div>

                <h3 className="text-2xl font-bold text-charcoal text-center mb-3">
                  {isSubscriptionExpired 
                    ? 'Subscription Expired' 
                    : upgradeModalType === 'wardrobe' 
                      ? 'Wardrobe Full' 
                      : 'Daily Limit Reached'}
                </h3>

                <p className="text-warm-taupe text-center mb-8">
                  {isSubscriptionExpired
                    ? "Your premium access has expired. Renew your subscription to continue creating stunning virtual looks."
                    : upgradeModalType === 'wardrobe'
                      ? `You've reached the wardrobe storage limit for the ${planCode} plan. Upgrade to a higher plan to add more items to your collection.`
                      : planCode === 'free'
                        ? "You've used all your free credits for today. Upgrade to a premium plan to continue your style journey."
                        : `You've reached your daily try-on limit for the ${planCode} plan. Upgrade for more creations or try again tomorrow.`}
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <AnimatedButton
                    variant="secondary"
                    onClick={() => setShowUpgradeModal(false)}
                    className="flex-1"
                  >
                    Maybe Later
                  </AnimatedButton>
                  <AnimatedButton
                    variant="primary"
                    onClick={() => navigate('/subscription')}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    View Plans
                    <Play size={16} className="rotate-0" />
                  </AnimatedButton>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


