import React, { useState, useEffect } from 'react';
import {
  FiX,
  FiExternalLink,
  FiImage,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiPlay,
  FiPause,
} from 'react-icons/fi';
import { FALLBACK_IMAGE_DATA_URI } from '../../utils/imageUtils';

const ImageModal = ({ isOpen, onClose, imageUrl, imageUrls, title, modelNumber }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [errorMap, setErrorMap] = useState({});

  // Prepare images array
  const rawList = Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [];
  const images = rawList.filter((u) => u && u.trim());

  // Reset state on open or change
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsAutoPlay(images.length > 1);
      setErrorMap({});
    }
  }, [isOpen, imageUrl, imageUrls]);

  // Automatic Slide Interval (Every 3.5 seconds)
  useEffect(() => {
    let timer;
    if (isOpen && isAutoPlay && images.length > 1) {
      timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 3500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, isAutoPlay, images.length]);

  if (!isOpen || images.length === 0) return null;

  const currentUrl = images[currentIndex] || images[0];
  const hasError = !!errorMap[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      {/* Click outside backdrop to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-cyan-500/25 rounded-3xl shadow-2xl overflow-hidden z-10 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-white">{title || 'Component Image Preview'}</h3>
              {images.length > 1 && (
                <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold rounded-full">
                  Image {currentIndex + 1} of {images.length}
                </span>
              )}
            </div>
            {modelNumber && (
              <p className="text-xs text-cyan-400 font-mono font-semibold mt-0.5">Model: {modelNumber}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer border ${
                  isAutoPlay
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title={isAutoPlay ? 'Pause automatic slideshow' : 'Start automatic slideshow'}
              >
                {isAutoPlay ? <FiPause className="w-3.5 h-3.5" /> : <FiPlay className="w-3.5 h-3.5" />}
                <span>{isAutoPlay ? 'Auto Slide ON' : 'Auto Slide OFF'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Close Preview"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Viewer Area */}
        <div className="relative px-4 sm:px-6 py-4 flex flex-col items-center justify-center bg-slate-950/50 min-h-75 max-h-[65vh]">
          {/* Left Arrow Button */}
          {images.length > 1 && (
            <button
              onClick={handlePrev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 bg-slate-950/90 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/40 text-cyan-400 rounded-2xl transition cursor-pointer shadow-2xl z-20"
              title="Previous Image"
            >
              <FiChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {/* Right Arrow Button */}
          {images.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 bg-slate-950/90 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/40 text-cyan-400 rounded-2xl transition cursor-pointer shadow-2xl z-20"
              title="Next Image"
            >
              <FiChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {/* Main Image or Fallback */}
          {hasError ? (
            <div className="p-8 text-center space-y-3 bg-slate-950/80 border border-cyan-500/20 rounded-2xl max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <FiAlertCircle className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white">Direct Image Preview Unavailable</h4>
              <p className="text-xs text-slate-400">
                The image host prevented cross-origin embedding. You can open the link directly in a new tab.
              </p>
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl transition shadow"
              >
                <FiExternalLink className="w-4 h-4" />
                <span>Open Image Link</span>
              </a>
            </div>
          ) : (
            <img
              key={currentIndex}
              src={currentUrl}
              alt={`${title || 'Component'} - ${currentIndex + 1}`}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              className="max-h-[55vh] max-w-full object-contain rounded-2xl shadow-2xl border border-cyan-500/20 animate-fade-in"
              onError={(e) => {
                setErrorMap((prev) => ({ ...prev, [currentIndex]: true }));
                e.target.onerror = null;
                e.target.src = FALLBACK_IMAGE_DATA_URI;
              }}
            />
          )}

          {/* Thumbnails Navigation Bar for Multiple Images */}
          {images.length > 1 && (
            <div className="flex items-center space-x-2 mt-4 max-w-full overflow-x-auto p-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl">
              {images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                    idx === currentIndex
                      ? 'border-cyan-400 scale-105 shadow-md shadow-cyan-500/30'
                      : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Thumb ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = FALLBACK_IMAGE_DATA_URI;
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-950/60">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition"
          >
            <FiExternalLink className="w-4 h-4" />
            <span>Open Original Image Link</span>
          </a>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs shadow cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
