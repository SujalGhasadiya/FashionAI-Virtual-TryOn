import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, useUser, useNotification } from '@/hooks';
import { Settings, ShoppingBag, Zap, Wand2, TrendingUp, Calendar, Crown, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/utils/validators';
import { normalizeImageUrl, getFallbackImage } from '@/utils/imageLoader';
import { AnimatedButton } from '@/components/common/MicroInteractions';
import { AnimatedStaggerContainer, AnimatedStaggerItem, ScrollAnimationWrapper } from '@/components/common/AnimationComponents';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const { profile, fetchProfile, isLoading } = useUser();
  const { showSuccess, showError } = useNotification();
  const [animateCards, setAnimateCards] = useState(false);
  const [imageLoadState, setImageLoadState] = useState({});
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleImageLoad = (id) => {
    setImageLoadState(prev => ({ ...prev, [id]: 'loaded' }));
  };

  const handleImageError = (id) => {
    setImageLoadState(prev => ({ ...prev, [id]: 'error' }));
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        await fetchProfile();
        setAnimateCards(true);
      } catch (err) {
        showError('Failed to load profile');
      }
    };

    if (authUser?.id) {
      loadProfile();
    }
  }, [authUser?.id, fetchProfile, showError]);

  const handleLogout = () => {
    logout();
    showSuccess('Logged out successfully');
    navigate('/login');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const quotaCards = profile
    ? [
      {
        label: 'Wardrobe Items',
        current: profile.wardrobe_used || 0,
        total: profile.wardrobe_limit,
        icon: ShoppingBag,
        color: 'bg-powder-blue',
        gradient: 'gradient-powder',
      },
      {
        label: 'Try-Ons Today',
        current: profile.tryons_used_today || 0,
        total: profile.tryon_daily_limit,
        icon: Zap,
        color: 'bg-sage',
        gradient: 'gradient-sage',
      },
      {
        label: 'AI Recommendations',
        current: profile.recommendations_used_today || 0,
        total: profile.recommendation_daily_limit,
        icon: Wand2,
        color: 'bg-rose-dust',
        gradient: 'gradient-rose',
      },
      {
        label: 'Saved Try-Ons',
        current: profile.saved_tryons_used_this_month || 0,
        total: profile.saved_tryon_monthly_limit,
        icon: TrendingUp,
        color: 'bg-terracotta',
        gradient: 'gradient-terracotta',
      },
    ]
    : [];

  const actionButtons = [
    { label: 'My Wardrobe', path: '/wardrobe', icon: ShoppingBag, bg: 'gradient-powder' },
    { label: 'Try-On Now', path: '/tryon', icon: Zap, bg: 'gradient-sage' },
    { label: 'Get Recommendations', path: '/recommendations', icon: Wand2, bg: 'gradient-rose' },
    { label: 'Saved Collection', path: '/saved-tryons', icon: TrendingUp, bg: 'gradient-terracotta' },
  ];

  return (
    <div className="min-h-screen bg-cream pb-0 overflow-x-hidden">
      {/* HEADER */}
      <motion.header
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-white border-b border-warm-gray/30 px-4 sm:px-8 py-4"
      >
        <div className="container-luxury flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile?.profile_photo_url ? (
              imageLoadState['profile'] === 'error' ? (
                <div className="w-12 h-12 rounded-full border-2 border-terracotta bg-ivory flex items-center justify-center">
                  <span className="text-xl">👤</span>
                </div>
              ) : (
                <motion.img
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  src={normalizeImageUrl(profile.profile_photo_url)}
                  alt="Profile"
                  className="w-12 h-12 rounded-full border-2 border-terracotta object-cover"
                  onLoad={() => handleImageLoad('profile')}
                  onError={() => handleImageError('profile')}
                />
              )
            ) : (
              <div className="w-12 h-12 rounded-full border-2 border-terracotta bg-ivory flex items-center justify-center">
                <span className="text-xl">👤</span>
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-charcoal">
                Welcome back, {profile?.name || authUser?.name?.split(' ')[0]}
              </h1>
              <p className="text-warm-taupe text-xs sm:text-sm">
                Manage your style & wardrobe
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/subscription')}
              className="px-3 py-2 rounded-lg bg-terracotta text-cream font-semibold hover:shadow-lg transition-all flex items-center gap-2"
              title="Subscription"
            >
              <Crown size={18} />
              <span className="hidden sm:inline">
                {profile?.subscription_plan === 'premium' ? 'Premium' : 'Upgrade'}
              </span>
            </motion.button>

            <motion.button
              onClick={() => navigate('/settings')}
              className="p-2.5 hover:bg-ivory rounded-lg transition-colors"
              title="Settings"
            >
              <Settings size={20} className="text-charcoal" />
            </motion.button>
            {/* Logout button removed per request */}
          </div>
        </div>
      </motion.header>

      <div className="container-luxury px-4 sm:px-8 py-1">
        {/* SUBSCRIPTION STATUS CARD */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5 mb-3"
          >
            <div className="card-luxury relative overflow-hidden p-3">
              <div className="absolute top-0 right-0 w-20 h-20 bg-terracotta/10 rounded-full -mr-10 -mt-10" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-semibold text-warm-taupe uppercase tracking-wider mb-0.5">
                      {profile.is_subscription_expired ? 'Last Plan' : 'Current Plan'}
                    </h3>
                    <p className="text-xl font-bold text-charcoal capitalize leading-none">
                      {profile.subscription_plan || 'Free'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {profile.is_subscription_expired ? (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-dust/10">
                        <AlertTriangle size={16} className="text-rose-dust" />
                        <span className="text-xs font-medium text-rose-dust">Plan Expired</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sage/10">
                        <Calendar size={16} className="text-sage" />
                        <span className="text-xs font-medium text-sage">Active</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-warm-taupe">
                  <p>
                    Start: <span className="font-medium text-charcoal">{formatDate(profile.subscription_cycle_start)}</span>
                  </p>
                  <p>
                    End: <span className={`font-medium ${profile.is_subscription_expired ? 'text-rose-dust' : 'text-charcoal'}`}>
                      {formatDate(profile.subscription_cycle_end)}
                    </span>
                  </p>
                </div>
                {profile.is_subscription_expired && (
                  <div className="mt-3 p-2 bg-rose-dust/5 rounded border border-rose-dust/20">
                    <p className="text-xs text-rose-dust font-medium">
                      ⚠️ Your subscription has expired. Try-on and recommendation features are limited.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* QUOTAS SECTION */}
        {animateCards && quotaCards.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-2"
          >
            <div className="mb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-charcoal mb-1">
                Your Usage
              </h2>
              <p className="text-xs sm:text-sm text-warm-taupe">Track your daily activity and limits</p>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 md:grid-cols-4 gap-2"
            >
              {quotaCards.map((quota, i) => {
                const Icon = quota.icon;
                const percentage = quota.total > 0 ? (quota.current / quota.total) * 100 : 0;
                const isExpiring = percentage > 75;
                const isMaxed = percentage >= 100;

                return (
                  <motion.div
                    key={i}
                    variants={itemVariants}
                    className="card-luxury relative overflow-hidden group p-3"
                  >
                    {/* Background accent */}
                    <div className={`absolute top-0 right-0 w-16 h-16 ${quota.gradient} opacity-10 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500`} />

                    <div className="relative">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-semibold text-warm-taupe uppercase tracking-wider">
                          {quota.label}
                        </h3>
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className={`p-2 rounded-lg text-cream ${quota.gradient}`}
                        >
                          <Icon size={18} />
                        </motion.div>
                      </div>

                      {/* Usage Numbers */}
                      <div className="mb-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-2xl font-bold text-charcoal">
                            {quota.current}
                          </span>
                          <span className="text-warm-taupe text-sm">
                            of {quota.total === null || quota.total === undefined ? '∞' : quota.total}
                          </span>
                        </div>
                        <p className="text-[11px] text-warm-taupe">
                          {quota.total === null || quota.total === undefined ? 'Unlimited access' : `${Math.round(percentage)}% used`}
                          {isMaxed && <span className="ml-2 text-rose-dust font-semibold">Maxed</span>}
                          {profile?.is_subscription_expired && <span className="ml-2 text-rose-dust font-semibold">🔒 Expired</span>}
                          {isExpiring && !isMaxed && <span className="ml-2 text-terracotta font-semibold">Expiring Soon</span>}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      {quota.total !== null && quota.total !== undefined && (
                        <div className="h-1.5 bg-warm-gray/30 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(percentage, 100)}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                            className={`h-full ${isMaxed
                                ? 'bg-rose-dust'
                                : isExpiring
                                  ? `${quota.gradient}`
                                  : `${quota.gradient}`
                              }`}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.section>
        )}

        {/* QUICK ACTIONS */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <div className="mb-2">
            <h2 className="text-xl sm:text-2xl font-bold text-charcoal mb-1">
              Quick Actions
            </h2>
            <p className="text-xs sm:text-sm text-warm-taupe">Get started with your next fashion moment</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {actionButtons.map((btn, i) => {
              const Icon = btn.icon;
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  whileHover={{ y: -8 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(btn.path)}
                  className={`card-luxury relative overflow-hidden group cursor-pointer text-left p-3`}
                >
                  <div className={`absolute inset-0 ${btn.bg} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
                  <div className="relative flex flex-col h-full">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className={`w-10 h-10 rounded-lg ${btn.bg} text-cream flex items-center justify-center mb-2`}
                    >
                      <Icon size={20} />
                    </motion.div>
                    <h3 className="text-sm font-bold text-charcoal group-hover:text-terracotta transition-colors">
                      {btn.label}
                    </h3>
                    <p className="text-[11px] text-warm-taupe mt-auto">
                      Click to get started →
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.section>
      </div>

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        type="danger"
      />
    </div>
  );
}
