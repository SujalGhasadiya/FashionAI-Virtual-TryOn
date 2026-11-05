import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, TrendingUp, ImageOff, Trash2, Maximize2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTryOn, useNotification } from '@/hooks';
import { normalizeImageUrl } from '@/utils/imageLoader';
import { AnimatedButton } from '@/components/common/MicroInteractions';

export default function SavedTryOnsPage() {
  const navigate = useNavigate();
  const { history, fetchHistory, isLoading } = useTryOn();
  const { showError, showSuccess } = useNotification();
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const savedHistory = history.filter(job => job.is_saved === true);
  const totalPages = Math.max(1, Math.ceil(savedHistory.length / itemsPerPage));
  const paginatedHistory = savedHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
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
              <h1 className="text-3xl sm:text-4xl font-bold text-charcoal flex items-center gap-3">
                Saved Try-Ons
                <TrendingUp className="text-terracotta" size={28} />
              </h1>
              <p className="text-warm-taupe text-sm">
                Your personal fashion transformation collection
              </p>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container-luxury pt-3 ">
        {isLoading && savedHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-terracotta/20 border-t-terracotta rounded-full animate-spin mb-4" />
            <p className="text-warm-taupe">Loading your collection...</p>
          </div>
        ) : savedHistory.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-luxury text-center py-20"
          >
            <div className="w-20 h-20 bg-ivory rounded-full flex items-center justify-center mx-auto mb-6">
              <TrendingUp size={40} className="text-warm-gray" />
            </div>
            <h2 className="text-2xl font-bold text-charcoal mb-3">No saved looks yet</h2>
            <p className="text-warm-taupe max-w-md mx-auto mb-8">
              Start creating virtual try-ons and save your favorite results to see them here.
            </p>
            <AnimatedButton
              variant="primary"
              onClick={() => navigate('/tryon')}
            >
              Try Something On
            </AnimatedButton>
          </motion.div>
        ) : (
          <div className="space-y-8">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
            >
              {paginatedHistory.map((job) => (
              <motion.div
                key={job.id}
                variants={itemVariants}
                className="card-garment group relative overflow-hidden transition-all hover:ring-1 hover:ring-terracotta"
              >
                <div className="aspect-[3/4] rounded-md overflow-hidden bg-white mb-3 relative">
                  <img
                    src={normalizeImageUrl(job.result_image_url || job.output_url)}
                    alt="Saved Try-On"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-wardrobe.svg';
                    }}
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedImage(normalizeImageUrl(job.result_image_url || job.output_url))}
                      className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                      title="View Large"
                    >
                      <Maximize2 size={20} />
                    </motion.button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between px-1">
                  <div>
                    <p className="text-[10px] text-warm-taupe uppercase tracking-widest font-bold">Created On</p>
                    <p className="text-xs font-semibold text-charcoal">
                      {new Date(job.created_at).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
            </motion.div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 pt-4 border-t border-warm-gray/20">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border border-warm-gray/30 text-charcoal font-semibold disabled:opacity-50 hover:bg-warm-gray/10 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm font-semibold text-charcoal">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg border border-warm-gray/30 text-charcoal font-semibold disabled:opacity-50 hover:bg-warm-gray/10 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10"
          >
            <div 
              className="absolute inset-0 bg-charcoal/90 backdrop-blur-sm" 
              onClick={() => setSelectedImage(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full h-full flex items-center justify-center"
            >
              <img
                src={selectedImage}
                alt="Large View"
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              />
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
    </div>
  );
}
