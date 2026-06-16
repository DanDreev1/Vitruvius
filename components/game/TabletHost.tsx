"use client";

import TabletViewport from "@/components/tablet/TabletViewport";
import type { TabletViewMode } from "@/lib/game/types";
import type { TabletRole } from "@/features/tablet/types";

type TabletHostProps = {
  isOpen: boolean;
  viewerUserId: string;
  targetUserId: string | null;
  mode: TabletViewMode | null;
  targetRole: TabletRole | null;
  onClose: () => void;
  inGameWorldId: string | null;
  participants: Array<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    role: "master" | "player";
  }>;
};

export default function TabletHost({
  isOpen,
  viewerUserId,
  targetUserId,
  mode,
  targetRole,
  onClose,
  inGameWorldId,
  participants,
}: TabletHostProps) {
  if (!isOpen || !targetUserId || !mode || !targetRole) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black" onClick={onClose}>
      <TabletViewport
        viewerUserId={viewerUserId}
        targetUserId={targetUserId}
        mode={mode}
        targetRole={targetRole}
        onClose={onClose}
        inGameWorldId={inGameWorldId}
        participants={participants}
      />
    </div>
  );
}
