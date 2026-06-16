"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { SCENE_PLACEHOLDER_ICON_PATHS } from "@/features/tablet/master/scene/constants";
import type {
  SceneAudienceState,
  SceneImageItem,
  SceneImagesViewMode,
} from "@/features/tablet/master/scene/types";
import { useSceneImageTargets } from "@/features/tablet/master/scene/useSceneImageTargets";
import { useSceneImages } from "@/features/tablet/master/scene/useSceneImages";

import SceneImageLightbox from "./SceneImageLightbox";
import SceneImagesStackViewer from "./SceneImagesStackViewer";
import SceneImagesToolbar from "./SceneImagesToolbar";

const addCard: SceneImageItem = {
  id: "add-image",
  title: "Add image",
  imageUrl: null,
  isActive: false,
  sortOrder: -1,
  isAddCard: true,
};

type SceneImagesPageProps = {
  sessionId: string;
  inGameWorldId: string | null;
  onAudienceStateChange: (state: SceneAudienceState | null) => void;
};

export default function SceneImagesPage({
  sessionId,
  inGameWorldId,
  onAudienceStateChange,
}: SceneImagesPageProps) {
  const [viewMode, setViewMode] = useState<SceneImagesViewMode>("stack");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    images,
    isLoading,
    isUploading,
    error,
    uploadImage,
    deleteImage,
    toggleImageActive,
  } = useSceneImages(inGameWorldId);

  const items = useMemo(() => {
    const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    return [addCard, ...sortedImages];
  }, [images]);

  useEffect(() => {
    setActiveIndex((currentIndex) =>
      Math.min(currentIndex, Math.max(0, items.length - 1)),
    );
  }, [items.length]);

  const activeItem = items[activeIndex] ?? items[0];
  const isAddCardActive = activeItem?.isAddCard === true;

  const activeImageId = !isAddCardActive ? activeItem.id : null;

  const {
    audience,
    selectedCharacterIds,
    error: targetsError,
    toggleParticipant,
    toggleAll,
  } = useSceneImageTargets(sessionId, activeImageId, isAddCardActive);

  useEffect(() => {
    onAudienceStateChange({
      participants: audience,
      selectedCharacterIds,
      disabled: isAddCardActive || !activeImageId,
      onToggleAll: toggleAll,
      onToggleParticipant: toggleParticipant,
    });

    return () => {
      onAudienceStateChange(null);
    };
  }, [
    onAudienceStateChange,
    audience,
    selectedCharacterIds,
    isAddCardActive,
    activeImageId,
    toggleAll,
    toggleParticipant,
  ]);

  const combinedError = error ?? targetsError;

  const openLightbox = () => {
    if (isAddCardActive) return;
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  const handlePrevInLightbox = () => {
    setActiveIndex((current) => Math.max(0, current - 1));
  };

  const handleNextInLightbox = () => {
    setActiveIndex((current) => Math.min(items.length - 1, current + 1));
  };

  const handleAddImage = () => {
    console.log("inGameWorldId from UI:", inGameWorldId);

    if (!inGameWorldId) {
      console.error("Missing inGameWorldId");
      return;
    }

    if (isUploading) {
      console.error("Upload already in progress");
      return;
    }

    if (!fileInputRef.current) {
      console.error("File input ref is missing");
      return;
    }

    fileInputRef.current.click();
  };

  const handleDeleteImage = async () => {
    if (isAddCardActive) return;

    await deleteImage(activeItem.id);
    setActiveIndex((current) => Math.max(0, current - 1));
    setIsLightboxOpen(false);
  };

  const handleToggleImageActive = async () => {
    if (isAddCardActive) return;
    await toggleImageActive(activeItem.id, !activeItem.isActive);
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    event,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      await uploadImage(file);
      setActiveIndex(images.length + 1);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="mb-[18px]">
        <SceneImagesToolbar
          canDelete={!isAddCardActive}
          isCurrentImageActive={activeItem?.isActive ?? false}
          viewMode={viewMode}
          onAddImage={handleAddImage}
          onDeleteImage={handleDeleteImage}
          onToggleImageActive={handleToggleImageActive}
          onChangeViewMode={setViewMode}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-white/15 bg-white/[0.02] p-[14px]">
        <div className="mb-[14px] flex items-center justify-between">
          <div>
            <p className="font-montserrat-alt text-[28px] font-extrabold text-white">
              Images
            </p>
            <p className="font-montserrat text-[14px] text-white/70">
              Mode: {viewMode === "stack" ? "Stack" : "Fit"}
            </p>
          </div>

          <div className="rounded-full bg-white/10 px-[14px] py-[8px] font-montserrat text-[14px] text-white">
            {activeIndex + 1} / {items.length}
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
        ) : viewMode === "stack" ? (
          <SceneImagesStackViewer
            items={items}
            activeIndex={activeIndex}
            onChangeIndex={setActiveIndex}
            onAddImage={handleAddImage}
            onOpenLightbox={openLightbox}
          />
        ) : (
          <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-[#0B1327] p-[14px]">
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-[#111827]">
              {isAddCardActive ? (
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="flex h-full w-full flex-col items-center justify-center gap-[16px] transition-opacity hover:opacity-90"
                >
                  <img
                    src={SCENE_PLACEHOLDER_ICON_PATHS.upload}
                    alt="Upload"
                    className="h-[82px] w-[82px] object-contain"
                  />
                  <p className="font-montserrat-alt text-[24px] font-extrabold text-white">
                    {isUploading ? "Uploading..." : "Add image"}
                  </p>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openLightbox}
                  className="flex h-full w-full items-center justify-center"
                >
                  {activeItem.imageUrl ? (
                    <img
                      src={activeItem.imageUrl}
                      alt={activeItem.title}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-[16px] px-[24px] text-center">
                      <img
                        src={SCENE_PLACEHOLDER_ICON_PATHS.upload}
                        alt={activeItem.title}
                        className="h-[82px] w-[82px] object-contain"
                      />
                      <p className="font-montserrat-alt text-[24px] font-extrabold text-white">
                        {activeItem.title}
                      </p>
                      <p className="font-montserrat text-[14px] text-white/60">
                        No preview image yet
                      </p>
                    </div>
                  )}
                </button>
              )}

              {!isAddCardActive ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-[20px] pb-[64px] pt-[40px]">
                  <div className="flex items-end justify-between gap-[16px]">
                    <div className="min-w-0">
                      <p className="truncate font-montserrat-alt text-[22px] font-extrabold text-white">
                        {activeItem.title}
                      </p>
                      <p className="font-montserrat text-[13px] text-white/75">
                        {activeItem.isActive
                          ? "Visible to selected targets"
                          : "Hidden from players"}
                      </p>
                    </div>

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
                  {activeIndex + 1}/{items.length}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((current) =>
                      Math.min(items.length - 1, current + 1),
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

      <SceneImageLightbox
        isOpen={isLightboxOpen}
        item={isAddCardActive ? null : activeItem}
        currentIndex={activeIndex}
        totalCount={items.length}
        canGoPrev={activeIndex > 0}
        canGoNext={activeIndex < items.length - 1}
        onClose={closeLightbox}
        onPrev={handlePrevInLightbox}
        onNext={handleNextInLightbox}
      />
    </div>
  );
}
