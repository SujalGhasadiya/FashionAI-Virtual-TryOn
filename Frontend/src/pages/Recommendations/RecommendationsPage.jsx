import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, ArrowLeft, Sparkles, TrendingUp, ImageOff, Crown, AlertTriangle, AlertCircle, ChevronDown } from 'lucide-react';
import { useRecommendation, useWardrobe, useNotification, useUser } from '@/hooks';
import { useNavigate } from 'react-router-dom';
import { normalizeImageUrl, onImageError } from '@/utils/imageLoader';
import { AnimatedButton } from '@/components/common/MicroInteractions';
import { useConfettiBlast } from '@/components/common/Confetti';
// useRecommendation now exposes fetchBottomRecommendations

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const { fetchRecommendations, fetchBottomRecommendations, recommendations, remainingRecommendations, isLoading } = useRecommendation();
  const { getBottoms, getTops, fetchItems, items } = useWardrobe();
  const { profile, fetchProfile } = useUser();
  const { showSuccess, showError, showInfo } = useNotification();
  const { trigger: triggerConfetti } = useConfettiBlast();

  const [mode, setMode] = useState('bottom'); // 'bottom' for BOTTOM→TOP, 'top' for TOP→BOTTOM
  const [occasion, setOccasion] = useState('casual');
  const [suggestionCount, setSuggestionCount] = useState(3);
  const [selectedItem, setSelectedItem] = useState(null);
  const [bottoms, setBottoms] = useState([]);
  const [tops, setTops] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageLoadState, setImageLoadState] = useState({});
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Subscription checks
  const isSubscriptionExpired = profile?.is_subscription_expired;
  const planCode = profile?.subscription_plan || 'free';
  const occasionFilterAvailable = ['standard', 'premium', 'pro'].includes(planCode);

  // Use profile data for remaining recommendations (already populated from backend)
  // Fall back to context data after first fetch
  const remainingRecs = profile?.remaining_recommendations_today ?? remainingRecommendations;
  const hasRemainingRecommendations =
    profile?.recommendation_daily_limit === null ||
    remainingRecs === null ||
    remainingRecs === undefined ||
    remainingRecs > 0;

  const hasShownExpiredRef = React.useRef(false);

  useEffect(() => {
    if (isSubscriptionExpired && !hasShownExpiredRef.current) {
      showInfo('Your subscription has expired. Please renew to use recommendations.');
      hasShownExpiredRef.current = true;
    }
  }, [isSubscriptionExpired, showInfo]);

  const hasShownOccasionWarningRef = React.useRef(false);

  useEffect(() => {
    if (!profile) return; // Wait for profile to load before showing warnings
    
    if (occasionFilterAvailable) {
      hasShownOccasionWarningRef.current = false;
      return;
    }

    if (!hasShownOccasionWarningRef.current) {
      showInfo('Occasion filtering is available only on Standard and Premium plans.');
      hasShownOccasionWarningRef.current = true;
    }
  }, [occasionFilterAvailable, showInfo, profile]);

  useEffect(() => {
    // Fetch profile to ensure subscription status is up-to-date
    fetchProfile();
    fetchItems();
  }, []);

  useEffect(() => {
    setBottoms(getBottoms());
    setTops(getTops());
  }, [items, getBottoms, getTops]);


  // Trigger confetti when recommendations are successfully fetched
  useEffect(() => {
    if (showResults && recommendations.length > 0) {
      triggerConfetti();
    }
  }, [showResults, recommendations.length, triggerConfetti]);

  const occasionOptions = [
    { value: 'casual', label: 'Casual', icon: '👕' },
    { value: 'formal', label: 'Formal', icon: '🎩' },
    { value: 'business', label: 'Business', icon: '💼' },
    { value: 'party', label: 'Party', icon: '🎉' },
    { value: 'date', label: 'Date Night', icon: '💕' },
    { value: 'sports', label: 'Sports', icon: '⚽' },
    { value: 'beach', label: 'Beach', icon: '🏖️' },
    { value: 'vacation', label: 'Vacation', icon: '✈️' },
    { value: 'work', label: 'Work', icon: '🏢' },
    { value: 'outdoor', label: 'Outdoor', icon: '🏔️' },
  ];

  const handleGetRecommendations = async () => {
    // Loading guard — just return silently
    if (loading) return;

    // Profile not loaded yet
    if (!profile) {
      showError('Please wait while your profile loads.');
      return;
    }

    // No item selected
    if (!selectedItem) {
      const itemType = mode === 'bottom' ? 'bottom' : 'top';
      showError(`Please select a ${itemType} item first to get recommendations.`);
      return;
    }

    // Block if subscription expired
    if (isSubscriptionExpired) {
      setShowUpgradeModal(true);
      return;
    }

    // Block if daily limit reached
    if (!hasRemainingRecommendations) {
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'bottom') {
        // BOTTOM→TOP: Use existing function
        await fetchRecommendations(selectedItem.id, occasion, suggestionCount);
      } else {
        // TOP→BOTTOM: Use context-backed function that updates recommendations state
        await fetchBottomRecommendations(selectedItem.id, occasion, suggestionCount);
      }
      setShowResults(true);
      showSuccess('Recommendations generated!');
    } catch (error) {
      // Handle 403 Forbidden - likely due to expired subscription or permission issue
      if (error.response?.status === 403) {
        const errorDetail = error.response?.data?.detail || '';
        // Check if it's a subscription-related error
        if (errorDetail.toLowerCase().includes('subscription') ||
          errorDetail.toLowerCase().includes('expired') ||
          errorDetail.toLowerCase().includes('not registered')) {
          setShowUpgradeModal(true);
          return;
        }
      }
      showError(error.response?.data?.detail || error.message || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getCompatibilityColor = (score) => {
    if (!score) return 'text-warm-taupe';
    if (score >= 0.8) return 'text-sage';
    if (score >= 0.6) return 'text-powder-blue';
    return 'text-rose-dust';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    hover: { y: -8 },
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
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-ivory rounded-lg transition-colors"
            >
              <ArrowLeft size={22} className="text-charcoal" />
            </motion.button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-charcoal">
                AI Stylist
              </h1>
              <p className="text-warm-taupe text-sm">
                Get personalized outfit recommendations
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="p-3 bg-ivory rounded-lg"
          >
            <Sparkles size={24} className="text-terracotta" />
          </motion.div>
        </div>
      </motion.header>

      <div className="container-luxury pt-3 ">
        <AnimatePresence mode="wait">
          {!showResults ? (
            // CONFIGURATION SCREEN
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {/* TOP CONFIGURATION ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 max-w-5xl">
                {/* MODE SELECTION */}
                <section>
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-charcoal mb-1">What are you styling?</h2>
                    <p className="text-warm-taupe text-sm">Choose what you already have and get suggestions for the rest</p>
                  </div>

                  <div className="flex gap-3 max-w-sm">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setMode('bottom');
                        setSelectedItem(null);
                        setCurrentPage(1);
                      }}
                      className={`card-luxury p-2 w-28 text-center space-y-1 relative overflow-hidden transition-all ${mode === 'bottom'
                        ? 'ring-2 ring-terracotta'
                        : 'hover:ring-1 hover:ring-warm-gray'
                        }`}
                    >
                      <div className="text-3xl">👖</div>
                      <p className={`font-semibold text-xs transition-colors ${mode === 'bottom' ? 'text-gold-accent' : 'text-charcoal'
                        }`}>
                        Bottoms
                      </p>
                      <p className="text-[9px] text-warm-taupe leading-none">(Find Tops)</p>
                      <AnimatePresence>
                        {mode === 'bottom' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute top-2 right-2 w-5 h-5 bg-terracotta rounded-full"
                          />
                        )}
                      </AnimatePresence>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setMode('top');
                        setSelectedItem(null);
                        setCurrentPage(1);
                      }}
                      className={`card-luxury p-2 w-28 text-center space-y-1 relative overflow-hidden transition-all ${mode === 'top'
                        ? 'ring-2 ring-gold-accent'
                        : 'hover:ring-1 hover:ring-warm-gray'
                        }`}
                    >
                      <div className="text-3xl">👔</div>
                      <p className={`font-semibold text-xs transition-colors ${mode === 'top' ? 'text-gold-accent' : 'text-charcoal'
                        }`}>
                        Tops
                      </p>
                      <p className="text-[9px] text-warm-taupe leading-none">(Find Bottoms)</p>
                      <AnimatePresence>
                        {mode === 'top' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute top-2 right-2 w-5 h-5 bg-terracotta rounded-full"
                          />
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </section>

                {/* OCCASION SELECTION */}
                <section>
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-charcoal mb-1">What's the occasion?</h2>
                    <p className="text-warm-taupe text-sm">Choose the vibe you're going for</p>
                  </div>

                  <div className="relative">
                    {/* Custom Dropdown Trigger */}
                    <motion.button
                      whileHover={occasionFilterAvailable ? { scale: 1.02 } : {}}
                      whileTap={occasionFilterAvailable ? { scale: 0.98 } : {}}
                      onClick={() => occasionFilterAvailable && setIsDropdownOpen(!isDropdownOpen)}
                      className={`w-full py-4 px-5 rounded-xl font-semibold border-2 bg-ivory transition-all flex items-center justify-between shadow-sm focus:outline-none focus:ring-2 focus:ring-terracotta/20 ${occasionFilterAvailable
                          ? 'border-warm-gray/50 text-charcoal hover:border-terracotta'
                          : 'border-warm-gray/30 text-warm-taupe opacity-60 bg-warm-gray/10'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{occasionOptions.find(o => o.value === occasion)?.icon}</span>
                        <span>{occasionOptions.find(o => o.value === occasion)?.label}</span>
                      </div>
                      <ChevronDown
                        size={20}
                        className={`text-warm-gray transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </motion.button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {isDropdownOpen && occasionFilterAvailable && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-xl shadow-luxury border border-warm-gray/20 max-h-64 overflow-y-auto"
                        >
                          {occasionOptions.map((occ) => (
                            <button
                              key={occ.value}
                              onClick={() => {
                                setOccasion(occ.value);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full px-5 py-3 flex items-center gap-3 hover:bg-ivory transition-colors text-left font-medium ${occasion === occ.value ? 'bg-terracotta/10 text-terracotta' : 'text-charcoal'
                                }`}
                            >
                              <span className="text-xl">{occ.icon}</span>
                              <span>{occ.label}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Premium Upgrade Overlay */}
                    {!occasionFilterAvailable && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[2px] rounded-xl border border-warm-gray/20">
                        <div className="bg-white p-3 rounded-xl border border-terracotta/30 shadow-luxury text-center flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2 text-terracotta">
                            <Crown size={16} />
                            <span className="font-bold text-sm">Premium Feature</span>
                          </div>
                          <AnimatedButton
                            variant="secondary"
                            onClick={() => navigate('/subscription')}
                            className="text-xs py-1.5 px-3"
                          >
                            Upgrade Plan
                          </AnimatedButton>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RECOMMENDATION COUNT - Integrated here */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h2 className="text-xl font-bold text-charcoal mb-0.5">How many recommendations?</h2>
                        <p className="text-warm-taupe text-xs tracking-tight">Choose 1 to 5 style suggestions</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-terracotta bg-terracotta/10 px-2 py-0.5 rounded">
                          {suggestionCount  }
                        </span>
                        {suggestionCount === 3 && (
                          <span className="text-[10px] font-black bg-terracotta text-white px-2 py-0.5 rounded uppercase tracking-tighter">
                            Recommended
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="card-luxury p-2 bg-white/50 border-warm-gray/20">
                      <div className="relative  flex items-center group">
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={suggestionCount}
                          onChange={(e) => setSuggestionCount(parseInt(e.target.value))}
                          className="w-full h-1 bg-warm-gray/20 rounded-full appearance-none cursor-pointer accent-terracotta group-hover:bg-warm-gray/30 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* ITEM SELECTION */}
              <section>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-charcoal mb-1">
                    Select a {mode === 'bottom' ? 'bottom' : 'top'} item
                  </h2>
                  <p className="text-warm-taupe">
                    Pick the {mode === 'bottom' ? 'bottoms' : 'top'} you want to style
                  </p>
                </div>

                {(mode === 'bottom' ? bottoms.length : tops.length) === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="card-luxury text-center py-16"
                  >
                    <ImageOff size={48} className="mx-auto text-warm-gray mb-4" />
                    <h3 className="text-xl font-bold text-charcoal mb-2">No {mode === 'bottom' ? 'bottoms' : 'tops'} yet</h3>
                    <p className="text-warm-taupe mb-6">Add {mode === 'bottom' ? 'bottoms' : 'tops'} to your wardrobe first</p>
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
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                    >
                      {(mode === 'bottom' ? bottoms : tops)
                        .slice((currentPage - 1) * 10, currentPage * 10)
                        .map((item) => (
                          <motion.button
                            key={item.id}
                            variants={itemVariants}
                            whileHover="hover"
                            onClick={() => setSelectedItem(item)}
                            className={`card-garment relative overflow-hidden group transition-all ${selectedItem?.id === item.id
                              ? 'ring-2 ring-terracotta'
                              : 'hover:ring-1 hover:ring-terracotta'
                              }`}
                          >
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
                                    alt="Item"
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
                            <AnimatePresence>
                              {selectedItem?.id === item.id && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  className="absolute top-2 right-2 w-6 h-6 bg-terracotta rounded-full flex items-center justify-center text-cream text-sm"
                                >
                                  ✓
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        ))}
                    </motion.div>

                    {Math.ceil((mode === 'bottom' ? bottoms : tops).length / 10) > 1 && (
                      <div className="flex justify-center items-center gap-4">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 rounded-lg border border-warm-gray/30 text-charcoal font-semibold disabled:opacity-50 hover:bg-warm-gray/10 transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-sm font-semibold text-charcoal">
                          Page {currentPage} of {Math.ceil((mode === 'bottom' ? bottoms : tops).length / 10)}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil((mode === 'bottom' ? bottoms : tops).length / 10)))}
                          disabled={currentPage === Math.ceil((mode === 'bottom' ? bottoms : tops).length / 10)}
                          className="px-4 py-2 rounded-lg border border-warm-gray/30 text-charcoal font-semibold disabled:opacity-50 hover:bg-warm-gray/10 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-warm-gray/50">
                <AnimatedButton
                  variant="secondary"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </AnimatedButton>
                <AnimatedButton
                  variant="primary"
                  onClick={handleGetRecommendations}
                  className="flex-1 flex items-center justify-center gap-2 font-semibold"
                >
                  <Wand2 size={20} />
                  {loading ? 'Generating...' : 'Get Recommendations'}
                </AnimatedButton>
              </div>
            </motion.div>
          ) : (
            // RESULTS SCREEN
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-charcoal mb-1">
                    {mode === 'bottom'
                      ? `Top Picks for ${occasion.charAt(0).toUpperCase() + occasion.slice(1)}`
                      : `${occasion.charAt(0).toUpperCase() + occasion.slice(1)} Bottoms`
                    }
                  </h2>
                  <p className="text-warm-taupe">
                    {recommendations.length} stylish options recommended
                  </p>
                </div>
                <AnimatedButton
                  variant="ghost"
                  onClick={() => setShowResults(false)}
                  className="text-sm"
                >
                  ← Start Over
                </AnimatedButton>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton h-96 rounded-xl" />
                  ))}
                </div>
              ) : recommendations.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card-luxury text-center py-16"
                >
                  <h3 className="text-xl font-bold text-charcoal mb-2">No recommendations found</h3>
                  <p className="text-warm-taupe">Try a different combination</p>
                </motion.div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                >
                  {recommendations.map((outfit, i) => (
                    <motion.div
                      key={outfit.top_item_id || i}
                      variants={itemVariants}
                      whileHover="hover"
                      className="card-garment overflow-hidden p-3 transition-all hover:ring-2 hover:ring-terracotta/30 group"
                    >
                      {/* OUTFIT IMAGE */}
                      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white mb-4 border border-warm-gray/10 shadow-inner">
                        {imageLoadState[`outfit-${outfit.top_item_id}`] !== 'error' ? (
                          <>
                            {imageLoadState[`outfit-${outfit.top_item_id}`] !== 'loaded' && (
                              <motion.div
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute inset-0 bg-warm-gray/20"
                              />
                            )}
                            <motion.img
                              whileHover={{ scale: 1.05 }}
                              src={normalizeImageUrl(outfit.top_item?.image_url) || outfit.top_item?.image_url}
                              alt="Outfit recommendation"
                              className="w-full h-full object-contain p-2"
                              onLoad={() =>
                                setImageLoadState((prev) => ({
                                  ...prev,
                                  [`outfit-${outfit.top_item_id}`]: 'loaded',
                                }))
                              }
                              onError={() => {
                                onImageError(outfit.top_item?.image_url);
                                setImageLoadState((prev) => ({
                                  ...prev,
                                  [`outfit-${outfit.top_item_id}`]: 'error',
                                }));
                              }}
                            />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white">
                            <ImageOff size={40} className="text-warm-gray" />
                          </div>
                        )}
                      </div>

                      {/* INFO */}
                      <div className="px-2 space-y-4">
                        {/* COMPATIBILITY SCORE */}
                        {outfit.score && (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-charcoal">Compatibility</span>
                              <span className={`text-sm font-bold ${getCompatibilityColor(outfit.score / 10)}`}>
                                {(outfit.score * 10).toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-warm-gray/20 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full ${outfit.score >= 0.8
                                  ? 'gradient-sage'
                                  : 'gradient-powder'
                                  }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${outfit.score * 10}%` }}
                                transition={{ duration: 0.8, delay: 0.1 }}
                              />
                            </div>
                          </div>
                        )}

                        {/* TRY ON BUTTON */}
                        <motion.button
                          whileHover={{ scale: 1.02, backgroundColor: '#b68928' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() =>
                            navigate('/tryon', {
                              state: {
                                garmentId: outfit.top_item_id,
                                garmentType: mode === 'bottom' ? 'top' : 'bottom',
                                garmentItem: outfit.top_item,
                              },
                            })
                          }
                          className="w-full bg-terracotta text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-luxury hover:shadow-xl transition-all"
                        >
                          Try This On →
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
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
                <div className="h-2 bg-gradient-terracotta" />
                <div className="p-8">
                  <div className="w-16 h-16 bg-terracotta/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <Crown size={32} className="text-terracotta" />
                  </div>

                  <h3 className="text-2xl font-bold text-charcoal text-center mb-3">
                    {isSubscriptionExpired ? 'Subscription Expired' : 'Daily Limit Reached'}
                  </h3>

                  <p className="text-warm-taupe text-center mb-8">
                    {isSubscriptionExpired
                      ? "Your premium access has expired. Renew your subscription to continue getting personalized style recommendations."
                      : planCode === 'free'
                        ? "You've used your free recommendations for today. Upgrade to a premium plan to unlock more style suggestions."
                        : "You've reached your daily recommendation limit for the " + planCode + " plan. Upgrade for more suggestions or try again tomorrow."}
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
                      <Sparkles size={16} />
                    </AnimatedButton>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
