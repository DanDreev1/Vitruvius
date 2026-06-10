'use client';

import type { TabletViewMode } from '@/lib/game/types';

type TabletHostProps = {
  isOpen: boolean;
  sessionId: string;
  viewerUserId: string;
  targetUserId: string | null;
  mode: TabletViewMode | null;
  onClose: () => void;
};

export default function TabletHost({
  isOpen,
  sessionId,
  viewerUserId,
  targetUserId,
  mode,
  onClose,
}: TabletHostProps) {
  if (!isOpen || !targetUserId || !mode) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-6">
      <div className="relative w-full max-w-[1280px] rounded-[32px] bg-[#0F172A] p-6 text-white">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 text-black"
        >
          Close
        </button>

        <div className="space-y-2">
          <p>Session ID: {sessionId}</p>
          <p>Viewer user ID: {viewerUserId}</p>
          <p>Target user ID: {targetUserId}</p>
          <p>Mode: {mode}</p>
        </div>

        {/* Потом сюда вставишь реальный планшет */}
        {/* <PlayerTablet viewerUserId={viewerUserId} targetUserId={targetUserId} mode={mode} /> */}
      </div>
    </div>
  );
}