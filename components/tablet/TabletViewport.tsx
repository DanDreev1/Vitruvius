"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  TABLET_BASE_HEIGHT,
  TABLET_BASE_WIDTH,
  TABLET_CAMERA_PADDING,
  TABLET_MAX_SCALE,
  TABLET_MIN_SCALE,
} from "@/lib/tablet/config";
import type { TabletViewMode } from "@/lib/game/types";
import type {
  TabletParticipant,
  TabletRole,
  TabletTab,
} from "@/features/tablet/types";
import {
  getDefaultTabletTab,
  isTabletTabAllowed,
} from "@/features/tablet/navigation";
import { usePlayerTabletCharacter } from "@/features/tablet/player/usePlayerTabletCharacter";

import TabletShell from "./TabletShell";

type TabletViewportProps = {
  viewerUserId: string;
  targetUserId: string;
  mode: TabletViewMode;
  targetRole: TabletRole;
  onClose: () => void;
  sessionId: string;
  inGameWorldId: string | null;
  participants: TabletParticipant[];
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

export default function TabletViewport({
  viewerUserId,
  targetUserId,
  mode,
  targetRole,
  onClose,
  sessionId,
  inGameWorldId,
  participants,
}: TabletViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gestureZoom, setGestureZoom] = useState(1);
  const [gestureOffset, setGestureOffset] = useState({ x: 0, y: 0 });
  const gestureZoomRef = useRef(1);
  const gestureOffsetRef = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{
    distance: number;
    zoom: number;
    contentX: number;
    contentY: number;
  } | null>(null);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const defaultTab = useMemo(
    () => getDefaultTabletTab(targetRole, mode),
    [targetRole, mode],
  );
  const [selectedTab, setSelectedTab] = useState<TabletTab>(() =>
    getDefaultTabletTab(targetRole, mode),
  );
  const activeTab = isTabletTabAllowed(selectedTab, targetRole, mode)
    ? selectedTab
    : defaultTab;
  const targetParticipant = useMemo(
    () =>
      participants.find((participant) => participant.user_id === targetUserId) ??
      null,
    [participants, targetUserId],
  );
  const tabletCharacterState = usePlayerTabletCharacter({
    sessionId,
    participantId:
      targetRole === "player" ? targetParticipant?.id ?? null : null,
    enabled: targetRole === "player",
  });

  useEffect(() => {
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

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
      1,
    );
    const availableHeight = Math.max(
      containerSize.height - verticalPadding * 2,
      1,
    );

    const scaleX = availableWidth / TABLET_BASE_WIDTH;
    const scaleY = availableHeight / TABLET_BASE_HEIGHT;

    const fittedScale = clamp(
      Math.min(scaleX, scaleY),
      isCompactViewport ? 0.01 : TABLET_MIN_SCALE,
      TABLET_MAX_SCALE,
    );

    return fittedScale;
  }, [containerSize]);

  const scale = baseScale * gestureZoom;

  const translateX = useMemo(() => {
    return (containerSize.width - TABLET_BASE_WIDTH * scale) / 2 + gestureOffset.x;
  }, [containerSize.width, gestureOffset.x, scale]);

  const translateY = useMemo(() => {
    return (containerSize.height - TABLET_BASE_HEIGHT * scale) / 2 + gestureOffset.y;
  }, [containerSize.height, gestureOffset.y, scale]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !containerSize.width || !containerSize.height) return;

    const centeredPosition = (nextScale: number) => ({
      x: (containerSize.width - TABLET_BASE_WIDTH * nextScale) / 2,
      y: (containerSize.height - TABLET_BASE_HEIGHT * nextScale) / 2,
    });

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      const point = getTouchPoint(event.touches[0], event.touches[1]);
      const currentScale = baseScale * gestureZoomRef.current;
      const centered = centeredPosition(currentScale);
      pinchRef.current = {
        distance: Math.max(point.distance, 1),
        zoom: gestureZoomRef.current,
        contentX: (point.x - centered.x - gestureOffsetRef.current.x) / currentScale,
        contentY: (point.y - centered.y - gestureOffsetRef.current.y) / currentScale,
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      const pinch = pinchRef.current;
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const point = getTouchPoint(event.touches[0], event.touches[1]);
      const nextZoom = clamp(
        pinch.zoom * (point.distance / pinch.distance),
        0.75,
        2.5
      );
      const nextScale = baseScale * nextZoom;
      const centered = centeredPosition(nextScale);
      const nextOffset = {
        x: point.x - pinch.contentX * nextScale - centered.x,
        y: point.y - pinch.contentY * nextScale - centered.y,
      };
      gestureZoomRef.current = nextZoom;
      gestureOffsetRef.current = nextOffset;
      setGestureZoom(nextZoom);
      setGestureOffset(nextOffset);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchRef.current = null;
    };

    element.addEventListener('touchstart', onTouchStart, { passive: false });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd);
    element.addEventListener('touchcancel', onTouchEnd);
    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [baseScale, containerSize.height, containerSize.width]);

  return (
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
        <TabletShell
          activeTab={activeTab}
          onTabChange={setSelectedTab}
          viewerUserId={viewerUserId}
          targetUserId={targetUserId}
          mode={mode}
          targetRole={targetRole}
          onClose={onClose}
          sessionId={sessionId}
          inGameWorldId={inGameWorldId}
          participants={participants}
          playerCharacter={tabletCharacterState.character}
          isPlayerCharacterLoading={tabletCharacterState.isLoading}
          playerCharacterError={tabletCharacterState.error}
          onPlayerCharacterSaved={tabletCharacterState.setCharacter}
        />
      </div>
    </div>
  );
}
