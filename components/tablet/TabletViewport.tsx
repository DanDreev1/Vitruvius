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
import type { TabletRole, TabletTab } from "@/features/tablet/types";
import {
  getDefaultTabletTab,
  isTabletTabAllowed,
} from "@/features/tablet/navigation";

import TabletShell from "./TabletShell";

type TabletViewportProps = {
  viewerUserId: string;
  targetUserId: string;
  mode: TabletViewMode;
  targetRole: TabletRole;
  onClose: () => void;
  inGameWorldId: string | null;
  participants: Array<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    role: "master" | "player";
  }>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function TabletViewport({
  viewerUserId,
  targetUserId,
  mode,
  targetRole,
  onClose,
  inGameWorldId,
  participants,
}: TabletViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const scale = useMemo(() => {
    if (!containerSize.width || !containerSize.height) {
      return 1;
    }

    const availableWidth = Math.max(
      containerSize.width - TABLET_CAMERA_PADDING * 2,
      1,
    );
    const availableHeight = Math.max(containerSize.height - 100 * 2, 1);

    const scaleX = availableWidth / TABLET_BASE_WIDTH;
    const scaleY = availableHeight / TABLET_BASE_HEIGHT;

    return clamp(Math.min(scaleX, scaleY), TABLET_MIN_SCALE, TABLET_MAX_SCALE);
  }, [containerSize]);

  const translateX = useMemo(() => {
    return (containerSize.width - TABLET_BASE_WIDTH * scale) / 2;
  }, [containerSize.width, scale]);

  const translateY = useMemo(() => {
    return (containerSize.height - TABLET_BASE_HEIGHT * scale) / 2;
  }, [containerSize.height, scale]);

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
          inGameWorldId={inGameWorldId}
          participants={participants}
        />
      </div>
    </div>
  );
}
