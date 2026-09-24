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

function getTouchPoint(first: Touch, second: Touch) {
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
    distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
  };
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
  const [gestureZoom, setGestureZoom] = useState(1);
  const [gestureOffset, setGestureOffset] = useState({ x: 0, y: 0 });
  const gestureZoomRef = useRef(1);
  const gestureOffsetRef = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{ distance: number; zoom: number; contentX: number; contentY: number } | null>(null);

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

  const baseScale = useMemo(() => {
    if (!containerSize.width || !containerSize.height) {
      return 1;
    }

    const isCompactViewport =
      containerSize.height < 600 || containerSize.width < 1000;
    const horizontalPadding = isCompactViewport ? 12 : TABLET_CAMERA_PADDING;
    const verticalPadding = isCompactViewport ? 12 : 100;
    const availableWidth = Math.max(
      containerSize.width - horizontalPadding * 2,
      1
    );
    const availableHeight = Math.max(
      containerSize.height - verticalPadding * 2,
      1
    );
    const scaleX = availableWidth / TABLET_BASE_WIDTH;
    const scaleY = availableHeight / TABLET_BASE_HEIGHT;

    const fittedScale = clamp(
      Math.min(scaleX, scaleY),
      isCompactViewport ? 0.01 : TABLET_MIN_SCALE,
      TABLET_MAX_SCALE
    );

    return fittedScale;
  }, [containerSize]);

  const scale = baseScale * gestureZoom;

  const translateX = useMemo(
    () => (containerSize.width - TABLET_BASE_WIDTH * scale) / 2 + gestureOffset.x,
    [containerSize.width, gestureOffset.x, scale]
  );

  const translateY = useMemo(
    () => (containerSize.height - TABLET_BASE_HEIGHT * scale) / 2 + gestureOffset.y,
    [containerSize.height, gestureOffset.y, scale]
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!isOpen || !element || !containerSize.width || !containerSize.height) return;

    const centered = (nextScale: number) => ({
      x: (containerSize.width - TABLET_BASE_WIDTH * nextScale) / 2,
      y: (containerSize.height - TABLET_BASE_HEIGHT * nextScale) / 2,
    });
    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      const point = getTouchPoint(event.touches[0], event.touches[1]);
      const currentScale = baseScale * gestureZoomRef.current;
      const center = centered(currentScale);
      pinchRef.current = {
        distance: Math.max(point.distance, 1),
        zoom: gestureZoomRef.current,
        contentX: (point.x - center.x - gestureOffsetRef.current.x) / currentScale,
        contentY: (point.y - center.y - gestureOffsetRef.current.y) / currentScale,
      };
    };
    const onMove = (event: TouchEvent) => {
      const pinch = pinchRef.current;
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const point = getTouchPoint(event.touches[0], event.touches[1]);
      const nextZoom = clamp(pinch.zoom * (point.distance / pinch.distance), 0.75, 2.5);
      const nextScale = baseScale * nextZoom;
      const center = centered(nextScale);
      const nextOffset = {
        x: point.x - pinch.contentX * nextScale - center.x,
        y: point.y - pinch.contentY * nextScale - center.y,
      };
      gestureZoomRef.current = nextZoom;
      gestureOffsetRef.current = nextOffset;
      setGestureZoom(nextZoom);
      setGestureOffset(nextOffset);
    };
    const onEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchRef.current = null;
    };

    element.addEventListener('touchstart', onStart, { passive: false });
    element.addEventListener('touchmove', onMove, { passive: false });
    element.addEventListener('touchend', onEnd);
    element.addEventListener('touchcancel', onEnd);
    return () => {
      element.removeEventListener('touchstart', onStart);
      element.removeEventListener('touchmove', onMove);
      element.removeEventListener('touchend', onEnd);
      element.removeEventListener('touchcancel', onEnd);
    };
  }, [baseScale, containerSize.height, containerSize.width, isOpen]);

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
