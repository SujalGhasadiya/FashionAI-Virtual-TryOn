import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin, useNotification } from '@/hooks';
import {
  CreditCard,
  Plus,
  Edit2,
  Eye,
  EyeOff,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';

export default function AdminSubscriptionsPage() {
  const navigate = useNavigate();
  const {
    fetchPlans,
    createPlan,
    updatePlan,
    plans,
    isLoading,
  } = useAdmin();
  const { showSuccess, showError } = useNotification();

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [planToToggle, setPlanToToggle] = useState(null);
  
  const initialFormData = {
    name: '',
    code: '',
    price_inr: 0,
    description: '',
    wardrobe_limit: 10,
    tryon_daily_limit: 5,
    recommendation_daily_limit: 10,
    saved_tryon_monthly_limit: 5,
    is_default: false,
    active: true
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleAddPlan = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price_inr: parseFloat(formData.price_inr || 0),
        wardrobe_limit: formData.wardrobe_limit === '' || formData.wardrobe_limit === null ? null : parseInt(formData.wardrobe_limit),
        tryon_daily_limit: formData.tryon_daily_limit === '' || formData.tryon_daily_limit === null ? null : parseInt(formData.tryon_daily_limit),
        recommendation_daily_limit: formData.recommendation_daily_limit === '' || formData.recommendation_daily_limit === null ? null : parseInt(formData.recommendation_daily_limit),
        saved_tryon_monthly_limit: formData.saved_tryon_monthly_limit === '' || formData.saved_tryon_monthly_limit === null ? null : parseInt(formData.saved_tryon_monthly_limit),
      };

      if (payload.price_inr < 0 || 
          (payload.wardrobe_limit !== null && payload.wardrobe_limit < 0) ||
          (payload.tryon_daily_limit !== null && payload.tryon_daily_limit < 0) ||
          (payload.recommendation_daily_limit !== null && payload.recommendation_daily_limit < 0) ||
          (payload.saved_tryon_monthly_limit !== null && payload.saved_tryon_monthly_limit < 0)
      ) {
        showError('Negative values are not allowed for limits or price');
        return;
      }

      if (editingPlan) {
        await updatePlan(editingPlan.code, payload);
        showSuccess('Plan updated successfully');
      } else {
        await createPlan(payload);
        showSuccess('Plan created successfully');
      }

      setFormData(initialFormData);
      setEditingPlan(null);
      setShowPlanForm(false);
      await fetchPlans();
    } catch (error) {
      showError(error.response?.data?.detail || error.message || 'Operation failed');
    }
  };

  const handleTogglePlanStatus = (plan) => {
    setPlanToToggle(plan);
    setShowToggleModal(true);
  };

  const confirmToggleStatus = async () => {
    if (!planToToggle) return;
    const action = planToToggle.active ? 'deactivate' : 'activate';
    try {
      await updatePlan(planToToggle.code, { active: !planToToggle.active });
      showSuccess(`Plan ${action}d successfully`);
      await fetchPlans();
    } catch (error) {
      showError(`Failed to ${action} plan`);
    } finally {
      setPlanToToggle(null);
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || '',
      code: plan.code || '',
      price_inr: plan.price_inr || 0,
      description: plan.description || '',
      wardrobe_limit: plan.wardrobe_limit ?? null,
      tryon_daily_limit: plan.tryon_daily_limit ?? null,
      recommendation_daily_limit: plan.recommendation_daily_limit ?? null,
      saved_tryon_monthly_limit: plan.saved_tryon_monthly_limit ?? null,
      is_default: !!plan.is_default,
      active: !!plan.active
    });
    setShowPlanForm(true);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-cream pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-cream border-b border-warm-gray/20">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="p-2 hover:bg-ivory rounded-lg transition-colors"
              >
                <ArrowLeft size={22} className="text-charcoal" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-charcoal">Manage Plans</h1>
                <p className="text-xs text-warm-taupe">Subscription & Quota Management</p>
              </div>
            </div>

            <motion.button
              onClick={() => {
                setShowPlanForm(!showPlanForm);
                setEditingPlan(null);
                setFormData(initialFormData);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-gradient-sage text-cream rounded-lg hover:opacity-90 transition-all font-semibold flex items-center gap-2"
            >
              <Plus size={18} />
              New Plan
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="space-y-8">
          {/* Plan Form Modal Overlay */}
          <AnimatePresence>
            {showPlanForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="card-luxury mb-8"
              >
                <h3 className="text-lg font-bold text-charcoal mb-6">
                  {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                </h3>

                <form onSubmit={handleAddPlan} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-charcoal mb-2">Plan Name</label>
                      <input
                        type="text"
                        placeholder="Premium"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-charcoal mb-2">Plan Code</label>
                      <input
                        type="text"
                        placeholder="premium_monthly"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-charcoal mb-2">Price (INR)</label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={formData.price_inr}
                        onChange={(e) => setFormData({ ...formData, price_inr: e.target.value })}
                        className="input-field"
                      />
                    </div>

                    <div className="flex items-center gap-4 h-full pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_default}
                          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                          className="rounded border-warm-gray/30 text-sage focus:ring-sage"
                        />
                        <span className="text-sm font-semibold text-charcoal">Default Plan</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.active}
                          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                          className="rounded border-warm-gray/30 text-sage focus:ring-sage"
                        />
                        <span className="text-sm font-semibold text-charcoal">Active</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-charcoal">Wardrobe Limit</label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.wardrobe_limit === null}
                            onChange={(e) => setFormData({ ...formData, wardrobe_limit: e.target.checked ? null : 10 })}
                            className="rounded border-warm-gray/30 text-terracotta focus:ring-terracotta w-3 h-3"
                          />
                          <span className="text-[10px] font-bold text-warm-taupe uppercase">Unlimited</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        min="0"
                        disabled={formData.wardrobe_limit === null}
                        value={formData.wardrobe_limit === null ? '' : formData.wardrobe_limit}
                        onChange={(e) => setFormData({ ...formData, wardrobe_limit: e.target.value })}
                        className={`input-field ${formData.wardrobe_limit === null ? 'bg-warm-gray/5 opacity-50' : ''}`}
                        placeholder="∞"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-charcoal">Daily Try-on</label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.tryon_daily_limit === null}
                            onChange={(e) => setFormData({ ...formData, tryon_daily_limit: e.target.checked ? null : 5 })}
                            className="rounded border-warm-gray/30 text-terracotta focus:ring-terracotta w-3 h-3"
                          />
                          <span className="text-[10px] font-bold text-warm-taupe uppercase">Unlimited</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        disabled={formData.tryon_daily_limit === null}
                        value={formData.tryon_daily_limit === null ? '' : formData.tryon_daily_limit}
                        onChange={(e) => setFormData({ ...formData, tryon_daily_limit: e.target.value })}
                        className={`input-field ${formData.tryon_daily_limit === null ? 'bg-warm-gray/5 opacity-50' : ''}`}
                        placeholder="∞"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-charcoal">Daily Recs</label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.recommendation_daily_limit === null}
                            onChange={(e) => setFormData({ ...formData, recommendation_daily_limit: e.target.checked ? null : 10 })}
                            className="rounded border-warm-gray/30 text-terracotta focus:ring-terracotta w-3 h-3"
                          />
                          <span className="text-[10px] font-bold text-warm-taupe uppercase">Unlimited</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        disabled={formData.recommendation_daily_limit === null}
                        value={formData.recommendation_daily_limit === null ? '' : formData.recommendation_daily_limit}
                        onChange={(e) => setFormData({ ...formData, recommendation_daily_limit: e.target.value })}
                        className={`input-field ${formData.recommendation_daily_limit === null ? 'bg-warm-gray/5 opacity-50' : ''}`}
                        placeholder="∞"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-charcoal">Saved Try-ons/Mo</label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.saved_tryon_monthly_limit === null}
                            onChange={(e) => setFormData({ ...formData, saved_tryon_monthly_limit: e.target.checked ? null : 5 })}
                            className="rounded border-warm-gray/30 text-terracotta focus:ring-terracotta w-3 h-3"
                          />
                          <span className="text-[10px] font-bold text-warm-taupe uppercase">Unlimited</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        disabled={formData.saved_tryon_monthly_limit === null}
                        value={formData.saved_tryon_monthly_limit === null ? '' : formData.saved_tryon_monthly_limit}
                        onChange={(e) => setFormData({ ...formData, saved_tryon_monthly_limit: e.target.value })}
                        className={`input-field ${formData.saved_tryon_monthly_limit === null ? 'bg-warm-gray/5 opacity-50' : ''}`}
                        placeholder="∞"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">Description</label>
                    <textarea
                      placeholder="Plan description..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="textarea-field"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlanForm(false);
                        setEditingPlan(null);
                      }}
                      className="px-6 py-2 bg-warm-gray/10 text-charcoal rounded-lg font-semibold hover:bg-warm-gray/20 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2 bg-gradient-sage text-cream rounded-lg font-semibold hover:opacity-90 transition-all"
                    >
                      {editingPlan ? 'Update Plan' : 'Create Plan'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Plans List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans?.map((plan) => (
              <motion.div 
                key={plan.code} 
                variants={itemVariants} 
                className={`card-luxury flex flex-col transition-all duration-300 ${
                  !plan.active ? 'opacity-60 grayscale-[0.5] border-warm-gray/10' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold text-charcoal">{plan.name}</h4>
                      {plan.is_default && (
                        <span className="px-2 py-0.5 bg-sage/10 text-sage text-[10px] font-bold rounded-full">DEFAULT</span>
                      )}
                    </div>
                    <p className="text-[10px] text-warm-taupe font-mono uppercase">{plan.code}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditPlan(plan)}
                      disabled={!plan.active}
                      className={`p-2 rounded-lg transition-colors ${
                        !plan.active 
                          ? 'text-warm-taupe cursor-not-allowed opacity-50' 
                          : 'hover:bg-powder-blue/10 text-powder-blue'
                      }`}
                      title={!plan.active ? 'Enable plan to edit' : 'Edit Plan'}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleTogglePlanStatus(plan)}
                      className={`p-2 rounded-lg transition-colors ${
                        plan.active 
                          ? 'hover:bg-rose-dust/10 text-rose-dust' 
                          : 'hover:bg-sage/10 text-sage'
                      }`}
                      title={plan.active ? 'Deactivate Plan' : 'Activate Plan'}
                    >
                      {plan.active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <p className="text-charcoal text-sm mb-6 flex-1">{plan.description || 'No description provided.'}</p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-cream/50 p-2 rounded-lg border border-warm-gray/10">
                    <p className="text-[10px] text-warm-taupe uppercase font-semibold">Wardrobe</p>
                    <p className="text-sm font-bold text-charcoal">{plan.wardrobe_limit === null ? '∞' : plan.wardrobe_limit}</p>
                  </div>
                  <div className="bg-cream/50 p-2 rounded-lg border border-warm-gray/10">
                    <p className="text-[10px] text-warm-taupe uppercase font-semibold">Daily Try-on</p>
                    <p className="text-sm font-bold text-charcoal">{plan.tryon_daily_limit === null ? '∞' : plan.tryon_daily_limit}</p>
                  </div>
                  <div className="bg-cream/50 p-2 rounded-lg border border-warm-gray/10">
                    <p className="text-[10px] text-warm-taupe uppercase font-semibold">Daily Rec</p>
                    <p className="text-sm font-bold text-charcoal">{plan.recommendation_daily_limit === null ? '∞' : plan.recommendation_daily_limit}</p>
                  </div>
                  <div className="bg-cream/50 p-2 rounded-lg border border-warm-gray/10">
                    <p className="text-[10px] text-warm-taupe uppercase font-semibold">Saved/Mo</p>
                    <p className="text-sm font-bold text-charcoal">{plan.saved_tryon_monthly_limit === null ? '∞' : plan.saved_tryon_monthly_limit}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-warm-gray/20 flex justify-between items-end">
                  <div>
                    <p className="text-2xl font-bold text-charcoal">
                      ₹{plan.price_inr}
                    </p>
                    <p className="text-[10px] text-warm-taupe">one-time/recurring</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                    plan.active ? 'bg-sage/10 text-sage' : 'bg-rose-dust/10 text-rose-dust'
                  }`}>
                    {plan.active ? 'ACTIVE' : 'INACTIVE'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <ConfirmationModal
        isOpen={showToggleModal}
        onClose={() => {
          setShowToggleModal(false);
          setPlanToToggle(null);
        }}
        onConfirm={confirmToggleStatus}
        title={planToToggle?.active ? "Deactivate Plan" : "Activate Plan"}
        message={`Are you sure you want to ${planToToggle?.active ? 'deactivate' : 'activate'} the "${planToToggle?.name}" plan?`}
        confirmText={planToToggle?.active ? "Deactivate" : "Activate"}
        type={planToToggle?.active ? "danger" : "info"}
      />
    </div>
  );
}
