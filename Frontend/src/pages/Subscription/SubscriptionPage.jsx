import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Check, ArrowLeft, Zap, Lock, ArrowRight, AlertCircle, AlertTriangle, Info, LayoutGrid } from 'lucide-react';
import { useSubscription, useNotification, useUser, useAuth } from '@/hooks';
import { useNavigate } from 'react-router-dom';
import { AnimatedButton, AnimatedCard } from '@/components/common/MicroInteractions';
import { AnimatedStaggerContainer, AnimatedStaggerItem } from '@/components/common/AnimationComponents';
import { useConfettiBlast } from '@/components/common/Confetti';

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { plans, fetchPlans, createPaymentOrder, verifyPayment, currentPlan, isLoading } = useSubscription();
  const { profile, fetchProfile } = useUser();
  const { refreshUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const { trigger: triggerConfetti, Confetti: ConfettiBurst } = useConfettiBlast();

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [targetPlan, setTargetPlan] = useState(null);

  useEffect(() => {
    console.log('[SubscriptionPage] Component mounted, fetching plans and profile...');
    Promise.all([fetchPlans(), fetchProfile()]).catch(err => {
      console.error('[SubscriptionPage] Failed to load subscription data:', err);
      showError('Failed to load subscription data');
    });
  }, []);

  const activePlanCode = (
    profile?.subscription_plan || currentPlan?.code || ''
  )
    .toString()
    .trim()
    .toLowerCase();

  const activePlan = plans?.find((p) => p.code?.toString().toLowerCase() === activePlanCode) || null;

  const handleUpgrade = async (plan) => {
    // Allow renewal if the current plan is expired
    if (processing || (activePlanCode === plan.code && !profile?.is_subscription_expired)) return;

    // Check for wardrobe capacity before downgrading
    if (profile?.wardrobe_used > plan.wardrobe_limit) {
      setTargetPlan(plan);
      setShowDowngradeModal(true);
      return;
    }

    setProcessing(true);
    setPaymentError(null);

    try {
      console.log('[SubscriptionPage] Starting payment flow for plan:', plan.code);

      // Step 1: Create payment order on backend
      console.log('[SubscriptionPage] Creating payment order...');
      const orderData = await createPaymentOrder(plan.code);
      console.log('[SubscriptionPage] Payment order created:', orderData);

      // Step 2: Set up Razorpay options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount_paise,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: orderData.merchant_name,
        description: orderData.description,
        prefill: {
          email: profile?.email || '',
          name: profile?.name || '',
        },
        theme: {
          color: '#c4a962',
        },
        handler: async (response) => {
          try {
            console.log('[SubscriptionPage] Payment successful, verifying...', response);

            // Step 3: Verify payment on backend
            const verifyResult = await verifyPayment(
              plan.code,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            console.log('[SubscriptionPage] Payment verified, user updated:', verifyResult);

            // Sync both user contexts so refresh/route guards stay consistent.
            await Promise.all([refreshUser(), fetchProfile()]);

            // Keep UI celebration errors from being treated as payment verification failures.
            try {
              if (typeof triggerConfetti === 'function') {
                triggerConfetti();
              }
            } catch (confettiError) {
              console.warn('[SubscriptionPage] Confetti trigger failed:', confettiError);
            }

            // Refresh plans/profile in-place and stay on this page.
            await Promise.all([fetchPlans(), fetchProfile()]);
            showSuccess(`🎉 Successfully upgraded to ${plan.name} Plan!`);
            setProcessing(false);
          } catch (verifyErr) {
            console.error('[SubscriptionPage] Payment verification failed:', verifyErr);
            const errorMsg = verifyErr.response?.data?.detail || verifyErr.message || 'Payment verification failed';
            setPaymentError(errorMsg);
            showError(`❌ Payment verification failed: ${errorMsg}`);
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            console.log('[SubscriptionPage] Payment modal dismissed by user');
            setProcessing(false);
            showError('Payment cancelled');
          },
        },
      };

      // Step 5: Open Razorpay checkout
      console.log('[SubscriptionPage] Opening Razorpay checkout...');
      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response) => {
        console.error('[SubscriptionPage] Payment failed:', response);
        const errorMsg = response.error?.description || 'Payment failed';
        setPaymentError(errorMsg);
        showError(`❌ Payment failed: ${errorMsg}`);
        setProcessing(false);
      });

      razorpay.open();
    } catch (error) {
      console.error('[SubscriptionPage] Payment setup error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Payment setup failed';
      setPaymentError(errorMsg);
      showError(`❌ ${errorMsg}`);
      setProcessing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.15 },
    },
  };

  const planVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    hover: { y: -12, transition: { duration: 0.3 } },
  };

  const featureVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.4 },
    }),
  };

  const planFeatures = {
    free: [
      'Up to 20 wardrobe items',
      '5 try-ons per day',
      '3 recommendations per day',
      '480p image quality',
      'Community support',
    ],
    premium: [
      'Unlimited wardrobe items',
      '20 try-ons per day',
      '10 recommendations per day',
      '1080p image quality',
      'Priority support',
      'Save try-on results',
      'Monthly insights',
    ],
    pro: [
      'Everything in Premium',
      '50 try-ons per day',
      'Unlimited recommendations',
      '4K image quality',
      '24/7 dedicated support',
      'Advanced analytics',
      'API access',
      'Custom integrations',
    ],
  };

  return (
    <div className="min-h-screen bg-cream pb-20">
      <ConfettiBurst />
      {/* HEADER */}
      <motion.header
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-white border-b border-warm-gray/30 px-4 sm:px-8 py-6"
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
                Plans & Pricing
              </h1>
              <p className="text-warm-taupe text-sm">
                Find the perfect plan for your style
              </p>
            </div>
          </div>
          <div className="p-3 bg-ivory rounded-lg">
            <Crown size={24} className="text-terracotta" />
          </div>
        </div>
      </motion.header>

      <div className="container-luxury py-6 sm:py-10">

        <AnimatePresence mode="sync">
          {/* EXPIRATION NOTICE */}
          {profile?.is_subscription_expired && (
            <motion.div
              key="expiration-notice"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-rose-dust/10 rounded-lg border border-rose-dust/30 flex items-start gap-3"
            >
              <AlertTriangle size={20} className="text-rose-dust flex-shrink-0 mt-0.5" />
              <div className="flex-grow">
                <p className="font-semibold text-rose-dust">Subscription Expired</p>
                <p className="text-sm text-warm-taupe">
                  Your {profile.subscription_plan} plan expired on {new Date(profile.subscription_cycle_end).toLocaleDateString()}.
                  Try-on and AI features are currently disabled. Upgrade now to continue using FashionAI!
                </p>
              </div>
            </motion.div>
          )}

          {/* PLANS GRID */}
          {isLoading ? (
            <div key="plans-loading" className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-96 rounded-2xl" />
              ))}
            </div>
          ) : (
            <motion.div
              key="plans-grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
            >
              {plans?.filter(plan => plan.price_inr > 0).map((plan, i) => (
                <motion.div
                  key={plan.code}
                  variants={planVariants}
                  whileHover="hover"
                  className={`card-luxury relative overflow-hidden group transition-all ${
                    activePlanCode === plan.code ? 'ring-2 ring-terracotta scale-105' : ''
                  } ${plan.name.toLowerCase() === 'premium' ? 'md:scale-105' : ''}`}
                >
                  {/* PREMIUM BADGE */}
                  {plan.name.toLowerCase() === 'premium' && (
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute top-4 right-4 px-4 py-1 gradient-terracotta text-white rounded-full text-xs font-bold shadow-sm"
                    >
                      Most Popular
                    </motion.div>
                  )}

                  {/* CURRENT PLAN BADGE + PLAN INFO */}
                  <div className="mb-8">
                    {/* Badge row — sits above the heading, no overlap */}
                    {activePlanCode === plan.code && (
                      <div className="mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          profile?.is_subscription_expired
                            ? 'bg-rose-dust/15 text-rose-dust'
                            : 'bg-sage/15 text-sage'
                        }`}>
                          {profile?.is_subscription_expired ? '⚠ Last Plan' : '✓ Current Plan'}
                        </span>
                      </div>
                    )}
                    <h3 className="text-2xl font-bold text-charcoal mb-2 capitalize">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-warm-taupe mb-4">{plan.description}</p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-4xl font-bold text-terracotta">
                          ₹{Math.round(plan.price_inr)}
                        </span>
                        <span className="text-warm-taupe ml-2 text-sm">/month</span>
                      </div>
                    </div>
                  </div>

                  {/* FEATURES */}
                  <div className="space-y-3 mb-8">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-1 bg-sage/10 rounded">
                        <Check size={16} className="text-sage" />
                      </div>
                      <span className="text-sm text-charcoal">
                        {plan.wardrobe_limit === null ? 'Unlimited wardrobe storage' : `${plan.wardrobe_limit} wardrobe items`}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-1 bg-sage/10 rounded">
                        <Check size={16} className="text-sage" />
                      </div>
                      <span className="text-sm text-charcoal">
                        {plan.tryon_daily_limit === null ? 'Unlimited try-ons' : `${plan.tryon_daily_limit} try-ons per day`}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-1 bg-sage/10 rounded">
                        <Check size={16} className="text-sage" />
                      </div>
                      <span className="text-sm text-charcoal">
                        {plan.recommendation_daily_limit === null ? 'Unlimited recommendations' : `${plan.recommendation_daily_limit} recommendations per day`}
                      </span>
                    </div>
                    {plan.saved_tryon_monthly_limit > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-1 bg-sage/10 rounded">
                          <Check size={16} className="text-sage" />
                        </div>
                        <span className="text-sm text-charcoal">
                          {plan.saved_tryon_monthly_limit === null ? 'Unlimited saved try-ons' : `${plan.saved_tryon_monthly_limit} saved try-ons per month`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* EXPIRATION WARNING (if current plan is expired) */}
                  {activePlanCode === plan.code && profile?.is_subscription_expired && (
                    <div className="mb-6 p-3 bg-rose-dust/10 rounded border border-rose-dust/20">
                      <div className="flex gap-2">
                        <AlertTriangle size={16} className="text-rose-dust flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-rose-dust">
                          <p className="font-semibold mb-1">This subscription has expired!</p>
                          <ul className="space-y-1 text-xs">
                            <li>❌ Try-ons disabled (limit: 0/day)</li>
                            <li>❌ Recommendations disabled (limit: 0/day)</li>
                            <li>❌ Wardrobe is read-only</li>
                            <li>✅ Your data is safe • Upgrade anytime to restore</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CTA BUTTON */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleUpgrade(plan)}
                    disabled={
                      processing ||
                      (activePlanCode === plan.code && !profile?.is_subscription_expired)
                    }
                    className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${activePlanCode === plan.code && !profile?.is_subscription_expired
                        ? 'bg-warm-gray/20 text-warm-taupe cursor-default'
                        : 'btn-primary hover:shadow-luxury'
                      }`}
                  >
                    {activePlanCode === plan.code ? (
                      <>
                        <Check size={18} />
                        {profile?.is_subscription_expired ? 'Renew Last Plan' : 'Current Plan'}
                      </>
                    ) : processing ? (
                      'Processing...'
                    ) : (
                      <>
                        Upgrade Now
                        <ArrowRight size={18} />
                      </>
                    )}
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* FAQ */}
          <motion.section
            key="faq-section"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-charcoal mb-8 text-center">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {[
                {
                  q: 'Can I cancel anytime?',
                  a: 'Yes, you can cancel your subscription at any time. No questions asked.',
                },
                {
                  q: 'Do you offer refunds?',
                  a: 'We offer a 30-day money-back guarantee for new subscriptions.',
                },
                {
                  q: 'Can I upgrade or downgrade?',
                  a: 'Of course! Change your plan at any time from your account settings.',
                },
                {
                  q: 'Do you store my photos?',
                  a: 'We securely store your try-on results. You can delete them anytime.',
                },
              ].map((item, i) => (
                <motion.details
                  key={i}
                  className="group card-luxury cursor-pointer"
                >
                  <motion.summary className="flex items-center justify-between font-semibold text-charcoal">
                    {item.q}
                    <motion.span
                      animate={{ rotate: 0 }}
                      className="group-open:rotate-180 transition-transform"
                    >
                      ↓
                    </motion.span>
                  </motion.summary>
                  <p className="text-warm-taupe text-sm mt-4">{item.a}</p>
                </motion.details>
              ))}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>

      {/* DOWNGRADE MODAL */}
      <AnimatePresence>
        {showDowngradeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDowngradeModal(false)}
              className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-cream rounded-2xl shadow-luxury overflow-hidden"
            >
              <div className="h-2 bg-rose-dust" />
              <div className="p-8">
                <div className="w-16 h-16 bg-rose-dust/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <AlertTriangle size={32} className="text-rose-dust" />
                </div>

                <h3 className="text-2xl font-bold text-charcoal text-center mb-3">
                  Wardrobe Limit Exceeded
                </h3>

                <p className="text-warm-taupe text-center mb-8">
                  You currently have <span className="font-bold text-charcoal">{profile?.wardrobe_used} items</span> in your wardrobe.
                  The <span className="font-bold text-charcoal">{targetPlan?.name} plan</span> only allows <span className="font-bold text-charcoal">{targetPlan?.wardrobe_limit} items</span>.
                  Please remove or deactivate <span className="font-bold text-rose-dust">{profile?.wardrobe_used - targetPlan?.wardrobe_limit} item(s)</span> before downgrading.
                </p>

                <div className="bg-ivory rounded-xl p-4 border border-warm-gray/30 mb-8 flex gap-4 items-start">
                  <div className="p-2 bg-terracotta/10 rounded-lg shrink-0">
                    <Info size={20} className="text-terracotta" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-charcoal mb-1">Quick Tip</p>
                    <p className="text-xs text-warm-taupe">
                      You don't need to delete items! You can simply "deactivate" them in your wardrobe to keep your history while freeing up slots.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <AnimatedButton
                    variant="secondary"
                    onClick={() => setShowDowngradeModal(false)}
                    className="flex-1"
                  >
                    Close
                  </AnimatedButton>
                  <AnimatedButton
                    variant="primary"
                    onClick={() => navigate('/wardrobe')}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <LayoutGrid size={18} />
                    Manage Wardrobe
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
