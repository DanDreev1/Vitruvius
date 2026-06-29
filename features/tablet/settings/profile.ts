'use client';

import {
  updateParticipantNickname,
  uploadParticipantAvatar,
} from '@/features/lobby/api';
import { supabase } from '@/lib/supabaseClient';

export const PARTICIPANT_PROFILE_CHANGED_EVENT = 'participant-profile-changed';

export function getParticipantProfileChannelName(sessionId: string) {
  return `participant-profile-${sessionId}`;
}

async function broadcastParticipantProfileChanged(
  sessionId: string,
  participantId: string
) {
  const channel = supabase.channel(getParticipantProfileChannelName(sessionId));

  try {
    const isReady = await new Promise<boolean>((resolve) => {
      const timeoutId = window.setTimeout(() => resolve(false), 2500);

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          window.clearTimeout(timeoutId);
          resolve(true);
        }
      });
    });

    if (isReady) {
      await channel.send({
        type: 'broadcast',
        event: PARTICIPANT_PROFILE_CHANGED_EVENT,
        payload: { sessionId, participantId, changedAt: Date.now() },
      });
    }
  } finally {
    void supabase.removeChannel(channel);
  }
}

export async function saveParticipantProfileNickname({
  sessionId,
  participantId,
  displayName,
}: {
  sessionId: string;
  participantId: string;
  displayName: string;
}) {
  await updateParticipantNickname(participantId, displayName);
  await broadcastParticipantProfileChanged(sessionId, participantId);
}

export async function saveParticipantProfileAvatar({
  sessionId,
  participantId,
  userId,
  file,
}: {
  sessionId: string;
  participantId: string;
  userId: string;
  file: File;
}) {
  const avatarUrl = await uploadParticipantAvatar(participantId, userId, file);
  await broadcastParticipantProfileChanged(sessionId, participantId);
  return avatarUrl;
}
