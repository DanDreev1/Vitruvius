"use client";

import { useRef } from "react";
import { motion } from "framer-motion";

import { SCENE_PLACEHOLDER_ICON_PATHS } from "@/features/tablet/master/scene/constants";
import type { SceneImageItem } from "@/features/tablet/master/scene/types";

type SceneImagesStackViewerProps = {
  items: SceneImageItem[];
  activeIndex: number;
  onChangeIndex: (nextIndex: number) => void;
  onAddImage: () => void;
  onOpenLightbox: () => void;
};

const STACK_LAYOUT: Record<
  -2 | -1 | 0 | 1 | 2,
  {
    x: number;
    scale: number;
    opacity: number;
    rotate: number;
    zIndex: number;
  }
> = {
  [-2]: {
    x: -170,
    scale: 0.72,
    opacity: 0.22,
    rotate: -4,
    zIndex: 1,
  },
  [-1]: {
    x: -92,
    scale: 0.86,
    opacity: 0.55,
    rotate: -2.5,
    zIndex: 2,
  },
  [0]: {
    x: 0,
    scale: 1,
    opacity: 1,
    rotate: 0,
    zIndex: 5,
  },
  [1]: {
    x: 92,
    scale: 0.86,
    opacity: 0.55,
    rotate: 2.5,
    zIndex: 2,
  },
  [2]: {
    x: 170,
    scale: 0.72,
    opacity: 0.22,
    rotate: 4,
    zIndex: 1,
  },
};

function clampIndex(index: number, max: number) {
  return Math.max(0, Math.min(index, max));
}

export default function SceneImagesStackViewer({
  items,
  activeIndex,
  onChangeIndex,
  onAddImage,
  onOpenLightbox,
}: SceneImagesStackViewerProps) {
  const wheelLockRef = useRef(false);

  const handlePrev = () => {
    onChangeIndex(clampIndex(activeIndex - 1, items.length - 1));
  };

  const handleNext = () => {
    onChangeIndex(clampIndex(activeIndex + 1, items.length - 1));
  };

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();

    if (wheelLockRef.current) return;

    wheelLockRef.current = true;

    if (event.deltaY > 0) {
      handleNext();
    } else if (event.deltaY < 0) {
      handlePrev();
    }

    window.setTimeout(() => {
      wheelLockRef.current = false;
    }, 220);
  };

  const visibleCards = [-2, -1, 0, 1, 2]
    .map((offset) => {
      const index = activeIndex + offset;
      const item = items[index];

      if (!item) return null;

      return {
        item,
        index,
        offset: offset as -2 | -1 | 0 | 1 | 2,
      };
    })
    .filter(Boolean) as Array<{
    item: SceneImageItem;
    index: number;
    offset: -2 | -1 | 0 | 1 | 2;
  }>;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[24px] bg-[#0B1327] px-[28px] py-[18px]"
      onWheel={handleWheel}
    >
      <div className="absolute inset-[18px_28px_82px_28px]">
        {visibleCards.map(({ item, index, offset }) => {
          const layout = STACK_LAYOUT[offset];
          const isActive = offset === 0;

          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.isAddCard) {
                  if (isActive) {
                    onAddImage();
                  } else {
                    onChangeIndex(index);
                  }
                  return;
                }

                if (isActive) {
                  onOpenLightbox();
                  return;
                }

                onChangeIndex(index);
              }}
              initial={false}
              animate={{
                x: layout.x,
                scale: layout.scale,
                opacity: layout.opacity,
                rotate: layout.rotate,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 24,
              }}
              style={{ zIndex: layout.zIndex }}
              className={[
                "absolute left-1/2 top-[46%] flex h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[30px] border-[2px] border-black bg-[#D9D9D9] shadow-[0_18px_50px_rgba(0,0,0,0.28)]",
                isActive ? "cursor-default" : "cursor-pointer",
              ].join(" ")}
            >
              {item.isAddCard ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-[14px] px-[24px]">
                  <img
                    src={SCENE_PLACEHOLDER_ICON_PATHS.upload}
                    alt="Upload"
                    className="h-[82px] w-[82px] object-contain"
                  />
                  <p className="text-center font-montserrat-alt text-[24px] font-extrabold text-black/80">
                    Add image
                  </p>
                </div>
              ) : (
                <div className="relative flex h-full w-full items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <img
                      src={SCENE_PLACEHOLDER_ICON_PATHS.upload}
                      alt={item.title}
                      className="h-[82px] w-[82px] object-contain"
                    />
                  )}

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-[18px] pb-[20px] pt-[40px] text-left">
                    <p className="truncate font-montserrat-alt text-[22px] font-extrabold text-white">
                      {item.title}
                    </p>

                    {isActive ? (
                      <p className="mt-[6px] font-montserrat text-[13px] text-white/85">
                        {item.isActive
                          ? "Visible to selected targets"
                          : "Hidden from players"}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[18px] flex justify-center">
        <div className="pointer-events-auto flex items-center gap-[10px] rounded-full bg-[#5C5C5C] px-[10px] py-[8px]">
          <button
            type="button"
            onClick={handlePrev}
            className="rounded-full bg-white px-[12px] py-[6px] font-montserrat text-[13px] font-bold text-black"
          >
            Prev
          </button>

          <div className="min-w-[58px] text-center font-montserrat text-[13px] font-semibold text-white">
            {activeIndex + 1}/{items.length}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="rounded-full bg-white px-[12px] py-[6px] font-montserrat text-[13px] font-bold text-black"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
