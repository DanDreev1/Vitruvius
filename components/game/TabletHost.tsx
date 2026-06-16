"use client";

import TabletViewport from "@/components/tablet/TabletViewport";
import type { TabletViewMode } from "@/lib/game/types";
import type { TabletParticipant, TabletRole } from "@/features/tablet/types";

type TabletHostProps = {
  isOpen: boolean;
  viewerUserId: string;
  targetUserId: string | null;
  mode: TabletViewMode | null;
  targetRole: TabletRole | null;
  onClose: () => void;
  sessionId: string;
  inGameWorldId: string | null;
  participants: TabletParticipant[];
};

export default function TabletHost({
  isOpen,
  viewerUserId,
  targetUserId,
  mode,
  targetRole,
  onClose,
  sessionId,
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
        sessionId={sessionId}
        inGameWorldId={inGameWorldId}
        participants={participants}
      />
    </div>
  );
}
