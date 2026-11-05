import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Bell, Shield, ArrowLeft, Eye, EyeOff, Upload, LogOut } from 'lucide-react';
import { useUser, useAuth, useNotification } from '@/hooks';
import { useNavigate } from 'react-router-dom';
import { validateImageFile } from '@/utils/validators';
import { normalizeImageUrl } from '@/utils/imageLoader';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { profile, updateProfile, uploadProfilePhoto, changePassword, isLoading, fetchProfile } = useUser();
  const { logout } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({ name: '', email: '', gender_preference: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const photoInputRef = useRef(null);

  // Fetch profile on component mount
  useEffect(() => {
    console.log('[SettingsPage] Component mounted, fetching profile...');
    if (fetchProfile) {
      fetchProfile().catch(err => {
        console.error('[SettingsPage] Failed to fetch profile:', err);
        showError('Failed to load profile data');
      });
    }
  }, []);

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      console.log('[SettingsPage] Profile loaded, updating form:', profile);
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        gender_preference: profile.gender_preference || '',
      });
    }
  }, [profile]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        showError(validation.error);
        return;
      }

      setPhotoPreview(URL.createObjectURL(file));
      setUploading(true);
      await uploadProfilePhoto(file);
      showSuccess('Photo updated!');
      setPhotoPreview(null);
    } catch (error) {
      showError(error.message || 'Photo upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleProfileUpdate = async () => {
    try {
      // Validate required fields
      if (!formData.name?.trim()) {
        showError('Name is required');
        return;
      }

      console.log('[SettingsPage] Updating profile with data:', formData);
      await updateProfile(formData);
      console.log('[SettingsPage] Profile update successful');
      showSuccess('Profile updated!');
    } catch (error) {
      console.error('[SettingsPage] Profile update error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Update failed';
      showError(errorMsg);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      showError('Password must be at least 8 characters');
      return;
    }

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword, passwordData.confirmPassword);
      showSuccess('Password changed!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      showError(error.message || 'Password change failed');
    }
  };

  const handleLogout = () => {
    logout();
    showSuccess('Logged out');
    navigate('/login');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-cream">
      {/* HEADER */}
      <motion.header
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-cream/80 backdrop-blur-md border-b border-warm-gray/30 px-4 sm:px-8 py-4"
      >
        <div className="container-luxury flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-ivory rounded-lg transition-colors"
          >
            <ArrowLeft size={22} className="text-charcoal" />
          </motion.button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-charcoal">Settings</h1>
            <p className="text-warm-taupe text-xs">Manage your account & preferences</p>
          </div>
        </div>
      </motion.header>

      <div className="container-luxury pt-3 pb-12">
        {/* ERROR STATE */}
        {!isLoading && !profile && (
          <div className="bg-rose-dust/10 border border-rose-dust rounded-lg p-6 text-center">
            <p className="text-rose-dust font-medium mb-4">Failed to load your profile</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchProfile?.()}
              className="btn-primary btn-sm"
            >
              Retry
            </motion.button>
          </div>
        )}

        {/* LOADING STATE */}
        {isLoading && !profile && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-gold-accent border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-warm-taupe">Loading your profile...</p>
            </div>
          </div>
        )}

        {/* CONTENT */}
        {profile && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* SIDEBAR TABS */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-1"
          >
            <nav className="space-y-1 sticky top-24">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ x: 4 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                      activeTab === tab.id
                        ? 'bg-gold-accent text-white shadow-luxury'
                        : 'text-charcoal hover:bg-ivory'
                    }`}
                  >
                    <Icon size={20} />
                    {tab.label}
                  </motion.button>
                );
              })}
            </nav>
          </motion.div>

          {/* CONTENT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="md:col-span-3"
          >
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* PHOTO SECTION */}
                <section className="card-luxury p-5">
                  <h3 className="text-base font-bold text-charcoal mb-4">Profile Photo</h3>
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gold-accent bg-ivory flex items-center justify-center">
                        {(photoPreview || (profile?.profile_photo_url && !photoError)) ? (
                          <motion.img
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            src={photoPreview || normalizeImageUrl(profile?.profile_photo_url)}
                            alt="Profile"
                            className="w-full h-full object-cover"
                            onLoad={() => {
                              console.log('[SettingsPage] Photo loaded successfully');
                              setPhotoError(false);
                            }}
                            onError={(e) => {
                              console.error('[SettingsPage] Photo failed to load:', e);
                              setPhotoError(true);
                            }}
                          />
                        ) : null}
                        {!photoPreview && (!profile?.profile_photo_url || photoError) && (
                          <User size={40} className="text-warm-gray" />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col justify-center gap-4">
                      <div>
                        <p className="font-medium text-charcoal mb-1">Update Profile Photo</p>
                        <p className="text-sm text-warm-taupe">JPG or PNG, max 5MB</p>
                      </div>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        disabled={uploading}
                        className="hidden"
                      />
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploading}
                        className="btn-secondary btn-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Upload size={16} />
                        {uploading ? 'Uploading...' : 'Choose Photo'}
                      </motion.button>
                    </div>
                  </div>
                </section>

                {/* PROFILE INFO SECTION */}
                <section className="card-luxury p-5 space-y-5">
                  <h3 className="text-base font-bold text-charcoal">Personal Information</h3>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-warm-taupe mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-warm-taupe mb-1.5">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="input-field opacity-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-warm-taupe mt-1">Cannot be changed</p>
                  </div>



                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-warm-taupe mb-1.5">Gender</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="input-field w-full flex items-center justify-between text-left"
                      >
                        <span className={formData.gender_preference ? "text-charcoal" : "text-warm-taupe"}>
                          {formData.gender_preference === 'male' ? 'Male' : 
                           formData.gender_preference === 'female' ? 'Female' : 
                           formData.gender_preference === 'other' ? 'Other' : 
                           'Select gender'}
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`text-warm-taupe transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      
                      {/* Using Framer Motion AnimatePresence */}
                      <AnimatePresence>
                        {isDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-xl shadow-luxury border border-warm-gray/20 overflow-hidden"
                          >
                            {[
                              { value: '', label: 'Select gender' },
                              { value: 'male', label: 'Male' },
                              { value: 'female', label: 'Female' },
                              { value: 'other', label: 'Other' }
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, gender_preference: opt.value });
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-3 flex items-center hover:bg-ivory transition-colors text-left font-medium text-sm ${
                                  formData.gender_preference === opt.value ? 'bg-gold-accent/10 text-gold-accent' : 'text-charcoal'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <motion.button
                    onClick={handleProfileUpdate}
                    disabled={isLoading}
                    className="btn-primary w-full sm:w-auto"
                  >
                    Save Changes
                  </motion.button>
                </section>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* PASSWORD CHANGE */}
                <section className="card-luxury p-5 space-y-5">
                  <h3 className="text-base font-bold text-charcoal">Change Password</h3>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-warm-taupe mb-1.5">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="input-field pr-10"
                        placeholder="Enter current password"
                      />
                      <button
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-taupe hover:text-charcoal"
                      >
                        {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-warm-taupe mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="input-field pr-10"
                        placeholder="Minimum 8 characters"
                      />
                      <button
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-taupe hover:text-charcoal"
                      >
                        {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-warm-taupe mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="input-field pr-10"
                        placeholder="Confirm new password"
                      />
                      <button
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-taupe hover:text-charcoal"
                      >
                        {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    onClick={handlePasswordChange}
                    className="btn-primary w-full sm:w-auto"
                  >
                    Update Password
                  </motion.button>
                </section>

                {/* LOGOUT */}
                <section className="card-luxury p-5">
                  <h3 className="text-base font-bold text-charcoal mb-2">Sign Out</h3>
                  <p className="text-warm-taupe text-xs mb-4">Log out from all your devices</p>
                  <motion.button
                    onClick={() => setShowLogoutModal(true)}
                    className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </motion.button>
                </section>
              </div>
            )}

          </motion.div>
        </div>
        )}
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
