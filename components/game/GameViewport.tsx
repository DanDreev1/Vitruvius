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

  const scale = useMemo(() => {
    if (!resolvedScene) {
      return 1;
    }

    const layoutScaleMultiplier = resolvedScene.layout.scaleMultiplier ?? 1;
    return rawScale * layoutScaleMultiplier;
  }, [rawScale, resolvedScene]);

  const translateX = useMemo(() => {
    if (!resolvedScene) {
      return 0;
    }

    return (
      (containerSize.width - resolvedScene.bounds.width * scale) / 2 -
      resolvedScene.bounds.minX * scale
    );
  }, [containerSize.width, resolvedScene, scale]);

  const translateY = useMemo(() => {
    if (!resolvedScene) {
      return 0;
    }

    return (
      (containerSize.height - resolvedScene.bounds.height * scale) / 2 -
      resolvedScene.bounds.minY * scale
    );
  }, [containerSize.height, resolvedScene, scale]);

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
      style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
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
            className="absolute left-0 top-0 origin-top-left"
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
