import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, useNotification } from '@/hooks';
import { Upload, User, CheckCircle, ArrowRight } from 'lucide-react';

export default function RegisterStep2Page() {
  const navigate = useNavigate();
  const { registerStep2 } = useAuth();
  const { showError, showSuccess } = useNotification();

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [gender, setGender] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image size must be less than 5MB');
      return;
    }

    setProfilePhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
    setFormError('');
  };

  const handleComplete = async () => {
    setFormError('');

    if (!gender) {
      const errorMsg = 'Please select your gender';
      setFormError(errorMsg);
      showError(errorMsg);
      return;
    }

    if (!profilePhoto) {
      const errorMsg = 'Please upload a profile photo';
      setFormError(errorMsg);
      showError(errorMsg);
      return;
    }

    setIsLoading(true);

    try {
      // Call registerStep2 which updates user data and is_fully_registered flag
      // The gender preference is sent as 'female' (or 'male'/'other') and photo as the file
      const result = await registerStep2(gender, profilePhoto);

      showSuccess('Profile completed!');
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to complete profile';
      setFormError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative backgrounds */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-powder opacity-5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-sage opacity-5 rounded-full blur-3xl" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="card-luxury">
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1 className="text-3xl font-bold text-charcoal mb-2">Complete Your Profile</h1>
            <p className="text-warm-taupe text-sm">Add your photo and preferences</p>
          </motion.div>

          {/* Step Indicator */}
          <motion.div variants={itemVariants} className="flex justify-between mb-8">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex flex-col items-center">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    num <= 2
                      ? 'bg-gold-accent text-white shadow-md'
                      : 'bg-beige text-charcoal'
                  }`}
                >
                  {num < 2 ? <CheckCircle size={20} /> : num}
                </motion.div>
                <span className="text-xs text-warm-taupe mt-1">
                  {num === 1 ? 'Email' : num === 2 ? 'Profile' : 'Done'}
                </span>
              </div>
            ))}
          </motion.div>

          {/* Error Message */}
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0, x: [-5, 5, -5, 5, 0] }}
              transition={{ duration: 0.4 }}
              className="mb-6 p-4 bg-rose-dust/10 border border-rose-dust/30 rounded-lg text-rose-dust text-sm"
            >
              {formError}
            </motion.div>
          )}

          {/* Photo Upload */}
          <motion.div variants={itemVariants} className="mb-8">
            <label className="block text-sm font-semibold text-charcoal mb-4">Profile Photo</label>

            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Profile preview"
                  className="w-full h-40 object-cover rounded-lg border-2 border-warm-gray"
                />
                <button
                  type="button"
                  onClick={() => {
                    setProfilePhoto(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute top-2 right-2 bg-rose-dust text-cream px-3 py-1 rounded-full text-xs font-semibold hover:bg-rose-dust/80 transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              <motion.div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                  isDragActive
                    ? 'border-gold-accent bg-gold-accent/5'
                    : 'border-warm-gray hover:border-gold-accent'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload size={32} className="text-warm-gray" />
                  <p className="text-sm font-semibold text-charcoal">Drag your photo here</p>
                  <p className="text-xs text-warm-taupe">or click to browse</p>
                  <p className="text-xs text-warm-gray mt-1">JPG, PNG up to 5MB</p>
                </div>
              </motion.div>
            )}

          </motion.div>

          {/* Gender Selection */}
          <motion.div variants={itemVariants} className="mb-8">
            <label className="block text-sm font-semibold text-charcoal mb-4">Gender</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'male', label: 'Male', emoji: '👨' },
                { value: 'female', label: 'Female', emoji: '👩' },
                { value: 'other', label: 'Other', emoji: '🧑' },
              ].map((option) => (
                <motion.button
                  key={option.value}
                  type="button"
                  onClick={() => setGender(option.value)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-4 rounded-lg border-2 transition-all font-semibold ${
                    gender === option.value
                      ? 'border-gold-accent bg-gold-accent/10 text-charcoal'
                      : 'border-warm-gray bg-transparent text-warm-taupe hover:border-gold-accent'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.emoji}</div>
                  <div className="text-sm">{option.label}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Complete Button */}
          <motion.button
            variants={itemVariants}
            type="button"
            onClick={handleComplete}
            disabled={isLoading}
            className="w-full btn-primary font-semibold flex items-center justify-center gap-2 mb-4"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                Completing...
              </>
            ) : (
              <>
                Complete Setup
                <CheckCircle size={18} />
              </>
            )}
          </motion.button>

        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-warm-taupe text-xs mt-6"
        >
          You can always update this later in Settings
        </motion.p>
      </motion.div>
    </div>
  );
}
