'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import PlayerSceneImagesShell from '@/components/game/PlayerSceneImagesShell';
import type { SceneImageItem } from '@/features/tablet/master/scene/types';
import {
  TABLET_BASE_HEIGHT,
  TABLET_BASE_WIDTH,
  TABLET_CAMERA_PADDING,
  TABLET_MAX_SCALE,
  TABLET_MIN_SCALE,
} from '@/lib/tablet/config';

type PlayerSceneImagesHostProps = {
  isOpen: boolean;
  images: SceneImageItem[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function PlayerSceneImagesHost({
  isOpen,
  images,
  isLoading,
  error,
  onClose,
}: PlayerSceneImagesHostProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!isOpen) return;

    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setContainerSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isOpen]);

  const scale = useMemo(() => {
    if (!containerSize.width || !containerSize.height) {
      return 1;
    }

    const availableWidth = Math.max(
      containerSize.width - TABLET_CAMERA_PADDING * 2,
      1
    );
    const availableHeight = Math.max(containerSize.height - 100 * 2, 1);
    const scaleX = availableWidth / TABLET_BASE_WIDTH;
    const scaleY = availableHeight / TABLET_BASE_HEIGHT;

    return clamp(Math.min(scaleX, scaleY), TABLET_MIN_SCALE, TABLET_MAX_SCALE);
  }, [containerSize]);

  const translateX = useMemo(
    () => (containerSize.width - TABLET_BASE_WIDTH * scale) / 2,
    [containerSize.width, scale]
  );

  const translateY = useMemo(
    () => (containerSize.height - TABLET_BASE_HEIGHT * scale) / 2,
    [containerSize.height, scale]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black" onClick={onClose}>
      <div ref={containerRef} className="relative h-full w-full overflow-hidden">
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: `${TABLET_BASE_WIDTH}px`,
            height: `${TABLET_BASE_HEIGHT}px`,
            transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <PlayerSceneImagesShell
            images={images}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
