'use client';

import TabletSettingsContent from '../shared/TabletSettingsContent';
import type { TabletParticipant } from '@/features/tablet/types';

export default function TabletSettingsPage({
  sessionId,
  participant,
  viewerUserId,
  inGameWorldId,
}: {
  sessionId: string;
  participant: TabletParticipant | null;
  viewerUserId: string;
  inGameWorldId: string | null;
}) {
  return (
    <TabletSettingsContent
      key={participant?.id ?? 'loading-profile'}
      sessionId={sessionId}
      participant={participant}
      viewerUserId={viewerUserId}
      inGameWorldId={inGameWorldId}
    />
  );
}
