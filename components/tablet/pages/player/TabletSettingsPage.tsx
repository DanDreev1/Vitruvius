'use client';

import TabletSettingsContent from '../shared/TabletSettingsContent';
import type { TabletParticipant } from '@/features/tablet/types';

export default function TabletSettingsPage({
  sessionId,
  participant,
  viewerUserId,
}: {
  sessionId: string;
  participant: TabletParticipant | null;
  viewerUserId: string;
}) {
  return (
    <TabletSettingsContent
      key={participant?.id ?? 'loading-profile'}
      sessionId={sessionId}
      participant={participant}
      viewerUserId={viewerUserId}
    />
  );
}
