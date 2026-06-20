'use client';

import { useMemo, useState } from 'react';

import type {
  SceneImageItem,
  SceneImagesViewMode,
} from '@/features/tablet/master/scene/types';

import SceneImageLightbox from '@/components/tablet/pages/master/TabletScenePage/SceneImagesPage/SceneImageLightbox';
import SceneImagesStackViewer from '@/components/tablet/pages/master/TabletScenePage/SceneImagesPage/SceneImagesStackViewer';

type PlayerSceneImagesShellProps = {
  images: SceneImageItem[];
  isLoading: boolean;
  error: string | null;
};

export default function PlayerSceneImagesShell({
  images,
  isLoading,
  error,
}: PlayerSceneImagesShellProps) {
  const [viewMode, setViewMode] = useState<SceneImagesViewMode>('stack');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const items = useMemo(
    () => [...images].sort((a, b) => a.sortOrder - b.sortOrder),
    [images]
  );

  const resolvedActiveIndex = Math.min(activeIndex, Math.max(0, items.length - 1));
  const activeItem = items[resolvedActiveIndex] ?? null;

  const handlePrevInLightbox = () => {
    setActiveIndex(Math.max(0, resolvedActiveIndex - 1));
  };

  const handleNextInLightbox = () => {
    setActiveIndex(Math.min(items.length - 1, resolvedActiveIndex + 1));
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[34px] border border-white/10 bg-[#1B2230] shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-[16px] rounded-[28px] border border-white/8 bg-[#0F1724]" />

      <div className="absolute inset-[40px] flex flex-col">
        <div className="mb-[18px] flex items-center gap-[12px]">
          <div className="ml-auto flex items-center gap-[8px] rounded-full bg-[#5C5C5C] p-[6px]">
            <button
              type="button"
              onClick={() => setViewMode('stack')}
              className={[
                'rounded-full px-[14px] py-[8px] font-montserrat text-[14px] font-bold transition-colors',
                viewMode === 'stack'
                  ? 'bg-white text-black'
                  : 'bg-transparent text-white',
              ].join(' ')}
            >
              Stack
            </button>

            <button
              type="button"
              onClick={() => setViewMode('fit')}
              className={[
                'rounded-full px-[14px] py-[8px] font-montserrat text-[14px] font-bold transition-colors',
                viewMode === 'fit'
                  ? 'bg-white text-black'
                  : 'bg-transparent text-white',
              ].join(' ')}
            >
              Fit
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-white/15 bg-white/[0.02] p-[14px]">
          <div className="mb-[14px] flex items-center justify-between">
            <div>
              <p className="font-montserrat-alt text-[28px] font-extrabold text-white">
                Images
              </p>
              <p className="font-montserrat text-[14px] text-white/70">
                Mode: {viewMode === 'stack' ? 'Stack' : 'Fit'}
              </p>
            </div>

            <div className="rounded-full bg-white/10 px-[14px] py-[8px] font-montserrat text-[14px] text-white">
              {items.length ? resolvedActiveIndex + 1 : 0} / {items.length}
            </div>
          </div>

          {error ? (
            <div className="mb-[12px] rounded-[16px] border border-red-400/30 bg-red-500/10 px-[14px] py-[10px] font-montserrat text-[14px] text-red-200">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-[24px] bg-[#0B1327]">
              <p className="font-montserrat text-[16px] text-white/75">
                Loading images...
              </p>
            </div>
          ) : !items.length ? (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-[24px] bg-[#0B1327]">
              <p className="font-montserrat text-[16px] text-white/75">
                No images available
              </p>
            </div>
          ) : viewMode === 'stack' ? (
            <SceneImagesStackViewer
              items={items}
              activeIndex={resolvedActiveIndex}
              onChangeIndex={setActiveIndex}
              onAddImage={() => {}}
              onOpenLightbox={() => setIsLightboxOpen(true)}
              showVisibilityStatus={false}
            />
          ) : (
            <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-[#0B1327] p-[14px]">
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-[#111827]">
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="flex h-full w-full items-center justify-center"
                >
                  {activeItem?.imageUrl ? (
                    <img
                      src={activeItem.imageUrl}
                      alt={activeItem.title}
                      className="h-full w-full object-contain"
                    />
                  ) : null}
                </button>

                {activeItem ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-[20px] pb-[64px] pt-[40px]">
                    <div className="flex items-end justify-between gap-[16px]">
                      <p className="min-w-0 truncate font-montserrat-alt text-[22px] font-extrabold text-white">
                        {activeItem.title}
                      </p>

                      <div className="shrink-0 rounded-full bg-white/10 px-[12px] py-[6px] font-montserrat text-[13px] text-white">
                        Fit
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-[18px] flex justify-center">
                <div className="pointer-events-auto flex items-center gap-[10px] rounded-full bg-[#5C5C5C] px-[10px] py-[8px]">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((current) => Math.max(0, current - 1))
                    }
                    className="rounded-full bg-white px-[12px] py-[6px] font-montserrat text-[13px] font-bold text-black"
                  >
                    Prev
                  </button>

                  <div className="min-w-[52px] text-center font-montserrat text-[13px] font-semibold text-white">
                    {resolvedActiveIndex + 1}/{items.length}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((current) =>
                        Math.min(items.length - 1, current + 1)
                      )
                    }
                    className="rounded-full bg-white px-[12px] py-[6px] font-montserrat text-[13px] font-bold text-black"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <SceneImageLightbox
        isOpen={isLightboxOpen}
        item={activeItem}
        currentIndex={resolvedActiveIndex}
        totalCount={items.length}
        canGoPrev={resolvedActiveIndex > 0}
        canGoNext={resolvedActiveIndex < items.length - 1}
        onClose={() => setIsLightboxOpen(false)}
        onPrev={handlePrevInLightbox}
        onNext={handleNextInLightbox}
        showVisibilityStatus={false}
      />
    </div>
  );
}
