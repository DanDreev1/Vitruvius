'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { SCENE_PLACEHOLDER_ICON_PATHS } from '@/features/tablet/master/scene/constants';
import type { SceneImageItem } from '@/features/tablet/master/scene/types';

type SceneImageLightboxProps = {
  isOpen: boolean;
  item: SceneImageItem | null;
  currentIndex: number;
  totalCount: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function SceneImageLightbox({
  isOpen,
  item,
  currentIndex,
  totalCount,
  canGoPrev,
  canGoNext,
  onClose,
  onPrev,
  onNext,
}: SceneImageLightboxProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && canGoPrev) onPrev();
      if (event.key === 'ArrowRight' && canGoNext) onNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canGoPrev, canGoNext, onClose, onPrev, onNext]);

  return (
    <AnimatePresence>
      {isOpen && item ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <div className="relative flex h-full w-full items-center justify-center px-[32px] py-[32px]">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              className="absolute right-[60px] top-[60px] z-20 rounded-full bg-white px-[14px] py-[8px] font-montserrat text-[14px] font-bold text-black shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
            >
              Close
            </button>

            <div
              className="relative flex h-full max-h-[92vh] w-full max-w-[1500px] items-center justify-center rounded-[28px] border border-white/10 bg-[#0B1327] p-[24px]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="absolute left-[24px] top-[24px] rounded-full bg-white/10 px-[14px] py-[8px] font-montserrat text-[14px] text-white">
                {currentIndex + 1}/{totalCount}
              </div>

              {!item.isAddCard ? (
                <div className="absolute inset-x-[24px] bottom-[24px] z-10 rounded-[20px] bg-gradient-to-t from-black/65 to-transparent px-[18px] pb-[18px] pt-[48px]">
                  <p className="truncate font-montserrat-alt text-[26px] font-extrabold text-white">
                    {item.title}
                  </p>
                  <p className="mt-[6px] font-montserrat text-[14px] text-white/80">
                    {item.isActive ? 'Visible to selected targets' : 'Hidden from players'}
                  </p>
                </div>
              ) : null}

              {canGoPrev ? (
                <button
                  type="button"
                  onClick={onPrev}
                  className="absolute left-[24px] top-1/2 z-20 -translate-y-1/2 rounded-full bg-white px-[16px] py-[10px] font-montserrat text-[14px] font-bold text-black"
                >
                  Prev
                </button>
              ) : null}

              {canGoNext ? (
                <button
                  type="button"
                  onClick={onNext}
                  className="absolute right-[24px] top-1/2 z-20 -translate-y-1/2 rounded-full bg-white px-[16px] py-[10px] font-montserrat text-[14px] font-bold text-black"
                >
                  Next
                </button>
              ) : null}

              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[22px] bg-[#111827]">
                {item.isAddCard ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-[16px]">
                    <img
                      src={SCENE_PLACEHOLDER_ICON_PATHS.upload}
                      alt="Upload"
                      className="h-[90px] w-[90px] object-contain"
                    />
                    <p className="font-montserrat-alt text-[28px] font-extrabold text-white">
                      Add image
                    </p>
                  </div>
                ) : item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-[16px] text-center">
                    <img
                      src={SCENE_PLACEHOLDER_ICON_PATHS.upload}
                      alt={item.title}
                      className="h-[90px] w-[90px] object-contain"
                    />
                    <p className="font-montserrat-alt text-[28px] font-extrabold text-white">
                      {item.title}
                    </p>
                    <p className="font-montserrat text-[15px] text-white/60">
                      No preview image yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}