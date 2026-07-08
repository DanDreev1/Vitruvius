'use client';

import SceneMusicAudio from '@/components/game/SceneMusicAudio';
import { usePlayerSceneMusic } from '@/features/tablet/player/usePlayerSceneMusic';

export default function PlayerSceneMusicAudio({
  sessionId,
  inGameWorldId,
  participantId,
  enabled = true,
}: {
  sessionId: string;
  inGameWorldId: string | null;
  participantId: string | null;
  enabled?: boolean;
}) {
  const { music, timeSync } = usePlayerSceneMusic({
    sessionId,
    inGameWorldId,
    participantId,
    enabled,
  });

  return (
    <SceneMusicAudio
      music={music}
      timeSync={timeSync}
      enabled={enabled}
    />
  );
}
