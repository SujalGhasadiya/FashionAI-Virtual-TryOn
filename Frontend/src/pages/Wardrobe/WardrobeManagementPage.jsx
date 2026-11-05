import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  Trash2,
  MoreHorizontal,
  ArrowLeft,
  LayoutGrid,
  List,
  Sparkles,
  ImageOff,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { useWardrobe, useNotification } from '@/hooks';
import { useUser } from '@/hooks';
import { useNavigate } from 'react-router-dom';
import { validateImageFile } from '@/utils/validators';
import {
  normalizeImageUrl,
  onImageLoad,
  onImageError,
  getFallbackImage,
} from '@/utils/imageLoader';
import { AnimatedButton } from '@/components/common/MicroInteractions';
import { AnimatedStaggerContainer, AnimatedStaggerItem } from '@/components/common/AnimationComponents';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';

export default function WardrobeManagementPage() {
  const navigate = useNavigate();
  const { items, fetchItems, uploadItem, deleteItem, updateItemStatus, syncEmbeddings, isLoading } = useWardrobe();
  const { profile } = useUser();
  const { showSuccess, showError } = useNotification();

  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewFiles, setPreviewFiles] = useState([]);
  const [uploadType, setUploadType] = useState(null); // Initialize as null to force selection
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [imageLoadState, setImageLoadState] = useState({}); 
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const activeItemCount = items.filter((item) => item.active_status === 'active').length;
  const wardrobeLimit = profile?.wardrobe_limit;
  const spaceRemaining = typeof wardrobeLimit === 'number' ? Math.max(0, wardrobeLimit - activeItemCount) : Infinity;
  const canUploadMore = spaceRemaining > 0 && spaceRemaining >= previewFiles.length;
  const isSubscriptionExpired = profile?.is_subscription_expired;

  useEffect(() => {
    fetchItems(true); 
  }, []);

  const filteredItems = items.filter(item => {
    const matchesCategory = activeFilter === 'all' || item.type === activeFilter;
    const matchesStatus = statusFilter === 'all' || item.active_status === statusFilter;
    return matchesCategory && matchesStatus;
  });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubscriptionExpired) return;
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
    if (isSubscriptionExpired) {
      showError('Your subscription has expired. Please renew to add items.');
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await processFiles(files);
  };

  const processFiles = async (files) => {
    try {
      const validFiles = [];
      for (const file of files) {
        const validation = validateImageFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          showError(`${file.name}: ${validation.error}`);
        }
      }
      if (validFiles.length > 0) {
        setPreviewFiles((prev) => [...prev, ...validFiles]);
      }
    } catch (error) {
      showError('File validation failed');
    }
  };

  const handleUpload = async () => {
    if (previewFiles.length === 0) {
      showError('Please select at least one file');
      return;
    }

    if (!uploadType) {
      showError('Please select an item category (Top, Bottom, or One-Piece)');
      return;
    }

    if (!canUploadMore) {
      if (spaceRemaining <= 0) {
        showError('Wardrobe limit reached. Upgrade your plan to add more items.');
      } else {
        showError(`You only have space for ${spaceRemaining} more item(s). Please remove some files or upgrade your plan.`);
      }
      return;
    }

    setUploading(true);
    try {
      let successCount = 0;
      let failureCount = 0;

      for (const file of previewFiles) {
        try {
          await uploadItem(uploadType, file);
          successCount++;
        } catch (error) {
          failureCount++;
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }

      if (successCount > 0) {
        const typeLabel = uploadType === 'one-piece' ? 'One-Piece' : uploadType.charAt(0).toUpperCase() + uploadType.slice(1);
        showSuccess(`${successCount} ${typeLabel}${successCount > 1 ? 's' : ''} uploaded successfully!`);
      }
      if (failureCount > 0) {
        showError(`${failureCount} file(s) failed to upload`);
      }

      setPreviewFiles([]);
      await fetchItems(true);
    } catch (error) {
      showError(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (itemId) => {
    try {
      await deleteItem(itemId);
      showSuccess('Item removed');
      await fetchItems(true);
    } catch (error) {
      showError(error.message || 'Delete failed');
    }
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = item.active_status === 'active' ? 'inactive' : 'active';
    try {
      await updateItemStatus(item.id, nextStatus);
      showSuccess(`Item ${nextStatus === 'active' ? 'activated' : 'deactivated'}`);
    } catch (error) {
      showError(error.message || 'Status update failed');
    }
  };

  const handleImageLoad = (itemId, imageUrl) => {
    onImageLoad(imageUrl);
    setImageLoadState((prev) => ({
      ...prev,
      [itemId]: 'loaded',
    }));
  };

  const handleImageError = (itemId, imageUrl) => {
    onImageError(imageUrl);
    setImageLoadState((prev) => ({
      ...prev,
      [itemId]: 'error',
    }));
  };

  const getImageUrl = (item) => {
    // Normalize the URL to handle relative paths
    const url = normalizeImageUrl(item.image_url);
    return url || getFallbackImage('wardrobe');
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
    hover: { y: -8, transition: { duration: 0.2 } },
    exit: { opacity: 0, y: 20, transition: { duration: 0.2 } },
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
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-3xl sm:text-4xl font-bold text-charcoal"
              >
                Digital Wardrobe
              </motion.h1>
              <p className="text-warm-taupe text-sm sm:text-base">
                {items.length} items curated just for you
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="p-3 bg-ivory rounded-lg"
          >
            <Sparkles size={24} className="text-terracotta" />
          </motion.div>
        </div>
      </motion.header>

      <div className="container-luxury py-6">
        {/* UPLOAD SECTION */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* UPLOAD CARD */}
            <motion.div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              animate={dragActive ? { scale: 1.02 } : { scale: 1 }}
              className={`lg:col-span-2 relative rounded-2xl border-2 border-dashed p-6 sm:p-8 transition-all cursor-pointer ${dragActive
                  ? 'border-terracotta bg-terracotta/5'
                  : 'border-warm-gray/50 bg-ivory hover:border-terracotta hover:bg-terracotta/2'
                }`}
            >
              {previewFiles.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                    {previewFiles.map((file, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative rounded-lg overflow-hidden border border-warm-gray shadow-luxury"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover"
                        />
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setPreviewFiles(previewFiles.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2 bg-rose-dust text-white rounded-full p-1.5 shadow-md opacity-100 transition-opacity"
                          title="Remove file"
                        >
                          <X size={14} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-charcoal">
                      {previewFiles.length} file{previewFiles.length > 1 ? 's' : ''} selected
                    </p>
                    <p className="text-xs text-warm-taupe">
                      Total: {(previewFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex gap-4 justify-center pt-4 flex-wrap">
                    <AnimatedButton
                      variant="secondary"
                      onClick={() => setPreviewFiles([])}
                      disabled={uploading}
                    >
                      Cancel
                    </AnimatedButton>
                    <AnimatedButton
                      variant="primary"
                      onClick={handleUpload}
                      disabled={uploading || !canUploadMore}
                    >
                      {uploading 
                        ? `Uploading (${previewFiles.length})...` 
                        : spaceRemaining <= 0 
                          ? 'Wardrobe Full' 
                          : !canUploadMore 
                            ? `Only space for ${spaceRemaining} more` 
                            : `Upload ${previewFiles.length}`}
                    </AnimatedButton>
                  </div>
                </motion.div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="flex flex-col items-center justify-center py-8">
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="mb-4"
                    >
                      <Upload size={40} className="text-terracotta" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-charcoal mb-1 text-center">
                      Add to your collection
                    </h3>
                    <p className="text-sm text-warm-taupe text-center mb-4 max-w-sm">
                      Drag your fashion pieces here or click to browse your files (multiple selection supported)
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        if (isSubscriptionExpired) {
                          showError('Your subscription has expired. Please renew to add items.');
                          return;
                        }
                        if (e.target.files) processFiles(Array.from(e.target.files));
                      }}
                      className="hidden"
                    />
                    <div className="text-xs text-warm-taupe">
                      JPG, PNG • Up to 10MB
                    </div>
                  </div>
                </label>
              )}
            </motion.div>

            {/* TYPE SELECTION */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-4">
                  Item Category
                </label>
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`w-full py-4 px-6 rounded-xl font-semibold border-2 transition-all flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-terracotta/20 ${
                      !uploadType 
                        ? 'border-warm-gray bg-white text-warm-taupe italic' 
                        : 'border-terracotta bg-ivory text-charcoal'
                    }`}
                  >
                    <span>
                      {!uploadType ? 'Select Category...' : 
                       uploadType === 'top' ? '👔 Tops' : 
                       uploadType === 'bottom' ? '👖 Bottoms' : '👗 One-Pieces'}
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
                      className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </motion.button>
                  
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
                          { value: 'top', label: '👔 Tops' },
                          { value: 'bottom', label: '👖 Bottoms' },
                          { value: 'one-piece', label: '👗 One-Pieces' }
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setUploadType(opt.value);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-6 py-4 flex items-center gap-3 hover:bg-ivory transition-colors text-left font-medium ${
                              uploadType === opt.value ? 'bg-terracotta/10 text-terracotta' : 'text-charcoal'
                            }`}
                          >
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={syncEmbeddings}
                className="w-full btn-ghost py-3 flex items-center justify-center gap-2 group font-medium"
              >
                <Sparkles size={18} className="group-hover:rotate-180 transition-transform" />
                Sync AI Embeddings
              </motion.button>
            </motion.div>
          </div>
        </motion.section>

        {/* FILTER & VIEW CONTROLS */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-warm-gray/50"
        >
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            {/* CATEGORY FILTER */}
            <div className="flex p-1 bg-ivory rounded-xl border border-warm-gray/20 overflow-x-auto no-scrollbar">
              {[
                { value: 'all', label: 'All Items' },
                { value: 'top', label: 'Tops' },
                { value: 'bottom', label: 'Bottoms' },
                { value: 'one-piece', label: 'One-Pieces' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => {
                    setActiveFilter(f.value);
                    setCurrentPage(1);
                  }}
                  className={`px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeFilter === f.value
                      ? 'bg-white text-terracotta shadow-sm ring-1 ring-terracotta/10'
                      : 'text-warm-taupe hover:text-charcoal'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* STATUS FILTER */}
            <div className="flex p-1 bg-ivory rounded-xl border border-warm-gray/20 overflow-x-auto no-scrollbar">
              {[
                { value: 'all', label: 'Show All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Deactivated' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => {
                    setStatusFilter(f.value);
                    setCurrentPage(1);
                  }}
                  className={`px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    statusFilter === f.value
                      ? 'bg-white text-terracotta shadow-sm ring-1 ring-terracotta/10'
                      : 'text-warm-taupe hover:text-charcoal'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                  ? 'bg-terracotta text-cream'
                  : 'bg-ivory text-charcoal hover:bg-beige'
                }`}
              title="Grid view"
            >
              <LayoutGrid size={20} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                  ? 'bg-terracotta text-cream'
                  : 'bg-ivory text-charcoal hover:bg-beige'
                }`}
              title="List view"
            >
              <List size={20} />
            </motion.button>
          </div>
        </motion.div>

        {/* ITEMS DISPLAY */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6' : 'space-y-4'}`}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton h-80 rounded-xl" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-24"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-ivory mb-6">
                <ImageOff size={40} className="text-warm-taupe" />
              </div>
              <h3 className="text-2xl font-bold text-charcoal mb-2">
                Your wardrobe is empty
              </h3>
              <p className="text-warm-taupe max-w-sm mx-auto">
                Start your fashion journey by uploading your first item
              </p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className={viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'
                  : 'space-y-4'
                }
              >
                {filteredItems
                  .slice((currentPage - 1) * 10, currentPage * 10)
                  .map((item) => (
                  <motion.div
                  key={item.id}
                  variants={itemVariants}
                  whileHover="hover"
                  className="group"
                >
                  <div className={`card-garment relative overflow-hidden transition-all hover:ring-1 hover:ring-terracotta ${item.active_status === 'inactive' ? 'opacity-70 grayscale-[0.3]' : ''
                    } ${viewMode === 'list' ? 'flex gap-4 items-center p-2' : 'space-y-4'
                    }`}>
                    {/* IMAGE */}
                    <div className={`relative ${viewMode === 'list' ? 'w-24 h-24 flex-shrink-0' : 'aspect-[4/5]'} overflow-hidden rounded-md bg-white shadow-inner`}>
                      {item.active_status === 'inactive' && (
                        <div className="absolute inset-0 bg-charcoal/10 backdrop-grayscale-[0.5] z-[1] pointer-events-none flex items-center justify-center">
                          <span className="px-2 py-1 bg-rose-dust text-white text-[10px] font-bold rounded-full shadow-lg">
                            INACTIVE
                          </span>
                        </div>
                      )}
                      {imageLoadState[item.id] !== 'error' ? (
                        <>
                          {/* Loading Skeleton */}
                          {imageLoadState[item.id] !== 'loaded' && (
                            <motion.div
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="absolute inset-0 bg-warm-gray/20"
                            />
                          )}
                          {/* Image */}
                          <motion.img
                            whileHover={{ scale: 1.1 }}
                            src={getImageUrl(item)}
                            alt={item.type}
                            className="w-full h-full object-contain p-2"
                            onLoad={(e) => handleImageLoad(item.id, item.image_url)}
                            onError={(e) => handleImageError(item.id, item.image_url)}
                          />
                        </>
                      ) : (
                        /* Fallback when image fails to load */
                        <div className="w-full h-full flex flex-col items-center justify-center bg-beige">
                          <ImageOff size={32} className="text-warm-gray mb-2" />
                          <p className="text-xs text-warm-taupe text-center px-2">
                            Image unavailable
                          </p>
                        </div>
                      )}
                    </div>

                    {/* INFO */}
                    <div className={`px-2 pb-2 ${viewMode === 'list' ? 'flex-1 pt-2' : ''}`}>
                      <div className="flex items-start justify-between mb-2">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-sage/10 text-sage">
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </span>
                        <div className="flex gap-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleToggleStatus(item)}
                            className={`p-2 rounded-lg transition-colors ${item.active_status === 'active'
                                ? 'hover:bg-warm-taupe/10 text-warm-taupe'
                                : 'hover:bg-sage/10 text-sage'
                              }`}
                            title={item.active_status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {item.active_status === 'active' ? <EyeOff size={16} /> : <Eye size={16} />}
                          </motion.button>
                          <button
                            onClick={() => {
                              setItemToDelete(item.id);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 hover:bg-rose-dust/10 rounded-lg transition-colors text-rose-dust"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* EMBEDDING STATUS */}
                      <div className="mt-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${item.embedding_done ? 'bg-sage' : 'bg-terracotta animate-pulse'}`} />
                          <span className={`text-[10px] font-medium ${item.embedding_done ? 'text-sage' : 'text-terracotta'}`}>
                            {item.embedding_done ? 'AI Ready' : 'AI Processing'}
                          </span>
                        </div>
                        {!item.embedding_done && item.embedding_error && (
                          <p className="text-[9px] text-rose-dust mt-1 leading-tight">
                            {item.embedding_error.slice(0, 50)}...
                          </p>
                        )}
                      </div>
                      {viewMode === 'list' && (
                        <p className="text-sm text-warm-taupe">
                          Added {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              </motion.div>

              {Math.ceil(filteredItems.length / 10) > 1 && (
                <div className="flex justify-center items-center gap-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg border border-warm-gray/30 text-charcoal font-semibold disabled:opacity-50 hover:bg-warm-gray/10 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm font-semibold text-charcoal">
                    Page {currentPage} of {Math.ceil(filteredItems.length / 10)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(filteredItems.length / 10)))}
                    disabled={currentPage === Math.ceil(filteredItems.length / 10)}
                    className="px-4 py-2 rounded-lg border border-warm-gray/30 text-charcoal font-semibold disabled:opacity-50 hover:bg-warm-gray/10 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setItemToDelete(null);
          }}
          onConfirm={() => handleDelete(itemToDelete)}
          title="Remove Item"
          message="Are you sure you want to remove this item from your wardrobe? This action cannot be undone."
          confirmText="Remove"
          type="danger"
        />
      </div>
    </div>
  );
}
