"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from 'next-intl';

import { getAnchoredSeatPosition } from "@/lib/game/getAnchoredSeatPosition";
import { getDensityPreset } from "@/lib/game/getDensityPreset";
import { getSceneBounds } from "@/lib/game/getSceneBounds";
import { mapPlayersToSeats } from "@/lib/game/mapPlayersToSeats";
import { MIN_GAME_VIEWPORT_WIDTH } from "@/lib/game/sceneConfig";
import { sceneLayouts } from "@/lib/game/sceneLayouts";
import type { GameParticipant, HoverCardData } from "@/lib/game/types";
import type { SceneImageItem } from "@/features/tablet/master/scene/types";
import type { PartyCheckState } from "@/features/tablet/master/party/types";

import GameScene from "./GameScene";
import PlayerHoverCard from "./PlayerHoverCard";
import RotateScreenPlaceholder from "./RotateScreenPlaceholder";

const GAME_TABLE_ZOOM_STORAGE_KEY = 'vitruvius:game-table-zoom';
const GAME_TABLE_PINCH_DISTANCE_PER_ZOOM = 500;

type GameViewportProps = {
  sessionId: string;
  master: GameParticipant;
  currentParticipant: GameParticipant;
  players: GameParticipant[];
  tableImages?: SceneImageItem[];
  partyCheck?: PartyCheckState | null;
  persistPartyChanges?: boolean;
  onPartyCheckChange?: (check: PartyCheckState | null) => void;
  onPartyMessage?: (payload: {
    checkId: string;
    type: 'roll' | 'inspiration' | 'free_bonus' | 'reset_inspiration' | 'reset_free_bonus';
    participantId: string;
    displayName: string;
    text: string;
  }) => void;
  onTabletClick?: (targetUserId: string) => void;
  onTableImageClick?: () => void;
};

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTouchPoint(first: Touch, second: Touch) {
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
    distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
  };
}

function getViewportSize() {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  return {
    width: Math.round(window.visualViewport?.width ?? window.innerWidth),
    height: Math.round(window.visualViewport?.height ?? window.innerHeight),
  };
}

export default function GameViewport({
  sessionId,
  master,
  currentParticipant,
  players,
  tableImages = [],
  partyCheck = null,
  persistPartyChanges = true,
  onPartyCheckChange,
  onPartyMessage,
  onTabletClick,
  onTableImageClick,
}: GameViewportProps) {
  const t = useTranslations('Game');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [hoveredCard, setHoveredCard] = useState<HoverCardData | null>(null);
  const [gestureZoom, setGestureZoom] = useState(1);
  const [gestureOffset, setGestureOffset] = useState({ x: 0, y: 0 });
  const [lockedBaseScale, setLockedBaseScale] = useState<number | null>(null);
  const gestureZoomRef = useRef(1);
  const gestureOffsetRef = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{
    distance: number;
    zoom: number;
    sceneX: number;
    sceneY: number;
  } | null>(null);
  const panRef = useRef<{
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const viewportHeight = viewportSize.height ? Math.max(1, viewportSize.height) : null;

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const updateSize = () => {
      const nextViewportSize = getViewportSize();
      const rect = element.getBoundingClientRect();
      const fallbackHeight = Math.max(1, nextViewportSize.height);

      setViewportSize(nextViewportSize);
      setContainerSize({
        width: rect.width || nextViewportSize.width,
        height: rect.height || fallbackHeight,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(element);
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);
    window.visualViewport?.addEventListener('resize', updateSize);
    window.visualViewport?.addEventListener('scroll', updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
      window.visualViewport?.removeEventListener('resize', updateSize);
      window.visualViewport?.removeEventListener('scroll', updateSize);
    };
  }, []);

  useEffect(() => {
    const restoreZoom = window.setTimeout(() => {
      const storedValue = window.localStorage.getItem(
        GAME_TABLE_ZOOM_STORAGE_KEY
      );
      if (storedValue === null) return;
      const storedZoom = Number(storedValue);
      if (!Number.isFinite(storedZoom)) return;
      const nextZoom = clampValue(storedZoom, 0.75, 4);
      gestureZoomRef.current = nextZoom;
      setGestureZoom(nextZoom);
    }, 0);

    return () => window.clearTimeout(restoreZoom);
  }, []);

  const resolvedScene = useMemo(() => {
    const layout = sceneLayouts[players.length];

    if (!layout) {
      return null;
    }

    const density = getDensityPreset(layout.density);
    const masterSeat = getAnchoredSeatPosition(layout.table, layout.master);
    const seatedPlayers = mapPlayersToSeats(players, layout);
    const bounds = getSceneBounds({
      table: layout.table,
      density,
      masterSeat,
      seatedPlayers,
    });

    return {
      layout,
      table: layout.table,
      density,
      masterSeat,
      seatedPlayers,
      bounds,
    };
  }, [players]);

  const padding = 24;

  const availableWidth = Math.max(containerSize.width - padding * 2, 1);
  const availableHeight = Math.max(containerSize.height - padding * 2, 1);

  const rawScale = useMemo(() => {
    if (!resolvedScene) {
      return 1;
    }

    const scaleX = availableWidth / resolvedScene.bounds.width;
    const scaleY = availableHeight / resolvedScene.bounds.height;

    return Math.min(scaleX, scaleY);
  }, [availableWidth, availableHeight, resolvedScene]);

  const baseScale = useMemo(() => {
    if (!resolvedScene) {
      return 1;
    }

    const layoutScaleMultiplier = resolvedScene.layout.scaleMultiplier ?? 1;
    return rawScale * layoutScaleMultiplier;
  }, [rawScale, resolvedScene]);

  const effectiveBaseScale = lockedBaseScale ?? baseScale;
  const scale = effectiveBaseScale * gestureZoom;

  const translateX = useMemo(() => {
    if (!resolvedScene) {
      return 0;
    }

    return (
      (containerSize.width - resolvedScene.bounds.width * scale) / 2 -
      resolvedScene.bounds.minX * scale +
      gestureOffset.x
    );
  }, [containerSize.width, gestureOffset.x, resolvedScene, scale]);

  const translateY = useMemo(() => {
    if (!resolvedScene) {
      return 0;
    }

    return (
      (containerSize.height - resolvedScene.bounds.height * scale) / 2 -
      resolvedScene.bounds.minY * scale +
      gestureOffset.y
    );
  }, [containerSize.height, gestureOffset.y, resolvedScene, scale]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !resolvedScene) return;

    const centeredPosition = (nextScale: number) => ({
      x:
        (containerSize.width - resolvedScene.bounds.width * nextScale) / 2 -
        resolvedScene.bounds.minX * nextScale,
      y:
        (containerSize.height - resolvedScene.bounds.height * nextScale) / 2 -
        resolvedScene.bounds.minY * nextScale,
    });

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1 && gestureZoomRef.current > 1) {
        const target = event.target as Element | null;
        if (!target?.closest('button, input, select, textarea, a, [role="button"]')) {
          const touch = event.touches[0];
          panRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            offsetX: gestureOffsetRef.current.x,
            offsetY: gestureOffsetRef.current.y,
          };
        }
        return;
      }
      if (event.touches.length !== 2) return;
      event.preventDefault();
      panRef.current = null;
      const point = getTouchPoint(event.touches[0], event.touches[1]);
      if (lockedBaseScale === null) setLockedBaseScale(baseScale);
      const currentScale = effectiveBaseScale * gestureZoomRef.current;
      const centered = centeredPosition(currentScale);
      pinchRef.current = {
        distance: Math.max(point.distance, 1),
        zoom: gestureZoomRef.current,
        sceneX: (point.x - centered.x - gestureOffsetRef.current.x) / currentScale,
        sceneY: (point.y - centered.y - gestureOffsetRef.current.y) / currentScale,
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1 && panRef.current) {
        event.preventDefault();
        const touch = event.touches[0];
        const nextOffset = {
          x: panRef.current.offsetX + touch.clientX - panRef.current.x,
          y: panRef.current.offsetY + touch.clientY - panRef.current.y,
        };
        gestureOffsetRef.current = nextOffset;
        setGestureOffset(nextOffset);
        return;
      }
      const pinch = pinchRef.current;
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const point = getTouchPoint(event.touches[0], event.touches[1]);
      const distanceDelta = point.distance - pinch.distance;
      const zoomDelta =
        Math.abs(distanceDelta) < 8
          ? 0
          : distanceDelta / GAME_TABLE_PINCH_DISTANCE_PER_ZOOM;
      const nextZoom = clampValue(
        pinch.zoom + zoomDelta,
        0.75,
        4
      );
      const nextScale = effectiveBaseScale * nextZoom;
      const centered = centeredPosition(nextScale);
      const nextOffset = {
        x: point.x - pinch.sceneX * nextScale - centered.x,
        y: point.y - pinch.sceneY * nextScale - centered.y,
      };
      gestureZoomRef.current = nextZoom;
      gestureOffsetRef.current = nextOffset;
      setGestureZoom(nextZoom);
      setGestureOffset(nextOffset);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2 && pinchRef.current) {
        window.localStorage.setItem(
          GAME_TABLE_ZOOM_STORAGE_KEY,
          String(gestureZoomRef.current)
        );
        pinchRef.current = null;
      }
      if (event.touches.length === 0) panRef.current = null;
    };
    const preventNativeGesture = (event: Event) => event.preventDefault();

    element.addEventListener('touchstart', onTouchStart, { passive: false });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd);
    element.addEventListener('touchcancel', onTouchEnd);
    element.addEventListener('gesturestart', preventNativeGesture, { passive: false });
    element.addEventListener('gesturechange', preventNativeGesture, { passive: false });
    element.addEventListener('gestureend', preventNativeGesture, { passive: false });
    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchEnd);
      element.removeEventListener('gesturestart', preventNativeGesture);
      element.removeEventListener('gesturechange', preventNativeGesture);
      element.removeEventListener('gestureend', preventNativeGesture);
    };
  }, [
    baseScale,
    containerSize.height,
    containerSize.width,
    effectiveBaseScale,
    lockedBaseScale,
    resolvedScene,
  ]);

  const hoverCardMetrics = useMemo(() => {
    const cardWidth = clampValue(260 * scale, 170, 280);
    const cardHeight = clampValue(120 * scale, 90, 132);

    const avatarSize = clampValue(72 * scale, 42, 72);
    const padding = clampValue(16 * scale, 10, 16);
    const gap = clampValue(16 * scale, 8, 16);

    const nameFontSize = clampValue(20 * scale, 13, 20);
    const roleFontSize = clampValue(15 * scale, 11, 15);

    const offset = clampValue(36 * scale, 18, 36);

    return {
      cardWidth,
      cardHeight,
      avatarSize,
      padding,
      gap,
      nameFontSize,
      roleFontSize,
      offset,
    };
  }, [scale]);

  const hoverCardPosition = useMemo(() => {
    if (!hoveredCard || !containerSize.width || !containerSize.height) {
      return null;
    }

    const avatarCenterX = translateX + hoveredCard.seat.x * scale;
    const avatarCenterY = translateY + hoveredCard.seat.y * scale;
    const avatarRadius = (hoveredCard.avatarSize * scale) / 2;

    const CARD_WIDTH = hoverCardMetrics.cardWidth;
    const CARD_HEIGHT = hoverCardMetrics.cardHeight;
    const OFFSET = hoverCardMetrics.offset;

    let left = avatarCenterX;
    let top = avatarCenterY;

    switch (hoveredCard.badgeSide) {
      case "top":
        top = avatarCenterY - avatarRadius - OFFSET - CARD_HEIGHT / 2;
        break;
      case "bottom":
        top = avatarCenterY + avatarRadius + OFFSET + CARD_HEIGHT / 2;
        break;
      case "left":
        left = avatarCenterX - avatarRadius - OFFSET - CARD_WIDTH / 2;
        break;
      case "right":
        left = avatarCenterX + avatarRadius + OFFSET + CARD_WIDTH / 2;
        break;
    }

    left = Math.min(
      Math.max(left, CARD_WIDTH / 2 + 12),
      containerSize.width - CARD_WIDTH / 2 - 12,
    );

    top = Math.min(
      Math.max(top, CARD_HEIGHT / 2 + 12),
      containerSize.height - CARD_HEIGHT / 2 - 12,
    );

    return { left, top };
  }, [
    hoveredCard,
    translateX,
    translateY,
    scale,
    containerSize,
    hoverCardMetrics,
  ]);

  const shouldShowRotatePlaceholder =
    containerSize.width > 0 && containerSize.width < MIN_GAME_VIEWPORT_WIDTH;

  if (!resolvedScene) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[100dvh] w-full overflow-hidden"
      style={{
        ...(viewportHeight ? { height: `${viewportHeight}px` } : {}),
        touchAction: 'none',
      }}
    >
      {shouldShowRotatePlaceholder ? (
        <RotateScreenPlaceholder />
      ) : (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-40 bg-black transition-opacity duration-1000 ease-out"
            style={{
              opacity: hoveredCard ? 0.9 : 0,
            }}
          />

          <div
            className="absolute left-0 top-0 origin-top-left will-change-transform"
            style={{
              width: "1600px",
              height: "900px",
              transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
            }}
          >
            <GameScene
              table={resolvedScene.table}
              density={resolvedScene.density}
              master={master}
              currentParticipant={currentParticipant}
              masterSeat={resolvedScene.masterSeat}
              seatedPlayers={resolvedScene.seatedPlayers}
              tableImage={tableImages[0] ?? null}
              sessionId={sessionId}
              partyCheck={partyCheck}
              persistPartyChanges={persistPartyChanges}
              onPartyCheckChange={onPartyCheckChange ?? (() => undefined)}
              onPartyMessage={onPartyMessage ?? (() => undefined)}
              onHoverChange={setHoveredCard}
              onTabletClick={onTabletClick}
              onTableImageClick={onTableImageClick}
            />
          </div>

          {hoveredCard && hoverCardPosition ? (
            <PlayerHoverCard
              left={hoverCardPosition.left}
              top={hoverCardPosition.top}
              name={hoveredCard.participant.displayName}
              role={
                hoveredCard.participant.role === "master" ? t('master') : t('player')
              }
              avatarUrl={hoveredCard.participant.avatarUrl}
              width={hoverCardMetrics.cardWidth}
              avatarSize={hoverCardMetrics.avatarSize}
              padding={hoverCardMetrics.padding}
              gap={hoverCardMetrics.gap}
              nameFontSize={hoverCardMetrics.nameFontSize}
              roleFontSize={hoverCardMetrics.roleFontSize}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
