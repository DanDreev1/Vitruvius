'use client';

import { useEffect, useRef } from 'react';

import { supabase } from '@/lib/supabaseClient';
import {
  getParticipantProfileChannelName,
  PARTICIPANT_PROFILE_CHANGED_EVENT,
} from '@/features/tablet/settings/profile';
import type { GameParticipant } from '@/lib/game/types';

const HEARTBEAT_INTERVAL_MS = 5_000;
const OFFLINE_THRESHOLD_MS = 15_000;

type UseGamePresenceProps = {
  sessionId: string | null;
  currentUserId: string | null;
  onParticipantsSync: (participants: GameParticipant[]) => void;
  roleLabels: { master: string; player: string };
};

function getEffectiveConnectionStatus(
  lastSeenAt?: string | null,
  dbStatus: 'online' | 'offline' = 'online'
): 'online' | 'offline' {
  if (dbStatus === 'offline') {
    return 'offline';
  }

  if (!lastSeenAt) {
    return 'offline';
  }

  const diff = Date.now() - new Date(lastSeenAt).getTime();
  return diff > OFFLINE_THRESHOLD_MS ? 'offline' : 'online';
}

function mapParticipantRow(row: {
  id: string;
  user_id: string;
  role: 'master' | 'player';
  display_name: string | null;
  avatar_url: string | null;
  joined_at: string;
  connection_status: 'online' | 'offline' | null;
  last_seen_at: string | null;
}, roleLabels: { master: string; player: string }): GameParticipant {
  const dbStatus = row.connection_status === 'offline' ? 'offline' : 'online';

  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    displayName:
      row.display_name ?? (row.role === 'master' ? roleLabels.master : roleLabels.player),
    avatarUrl: row.avatar_url ?? null,
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
    connectionStatus: getEffectiveConnectionStatus(row.last_seen_at, dbStatus),
  };
}

function areParticipantsVisuallyEqual(
  currentParticipants: GameParticipant[],
  nextParticipants: GameParticipant[]
) {
  if (currentParticipants.length !== nextParticipants.length) {
    return false;
  }

  return currentParticipants.every((currentParticipant, index) => {
    const nextParticipant = nextParticipants[index];

    if (!nextParticipant) {
      return false;
    }

    return (
      currentParticipant.id === nextParticipant.id &&
      currentParticipant.userId === nextParticipant.userId &&
      currentParticipant.role === nextParticipant.role &&
      currentParticipant.displayName === nextParticipant.displayName &&
      currentParticipant.avatarUrl === nextParticipant.avatarUrl &&
      currentParticipant.joinedAt === nextParticipant.joinedAt &&
      currentParticipant.connectionStatus === nextParticipant.connectionStatus
    );
  });
}

export function useGamePresence({
  sessionId,
  currentUserId,
  onParticipantsSync,
  roleLabels,
}: UseGamePresenceProps) {
  const heartbeatInFlightRef = useRef(false);
  const syncInFlightRef = useRef(false);
  const lastSyncedParticipantsRef = useRef<GameParticipant[]>([]);
  const onParticipantsSyncRef = useRef(onParticipantsSync);

  useEffect(() => {
    onParticipantsSyncRef.current = onParticipantsSync;
  }, [onParticipantsSync]);

  useEffect(() => {
    if (!sessionId || !currentUserId) {
      return;
    }

    let isActive = true;
    lastSyncedParticipantsRef.current = [];

    const sendHeartbeat = async () => {
      if (heartbeatInFlightRef.current) {
        return;
      }

      heartbeatInFlightRef.current = true;

      try {
        const nowIso = new Date().toISOString();

        const { error } = await supabase
          .from('session_participants')
          .update({
            connection_status: 'online',
            last_seen_at: nowIso,
          })
          .eq('session_id', sessionId)
          .eq('user_id', currentUserId)
          .eq('participation_status', 'active');

        if (error) {
          console.error('heartbeat update error:', error);
        }
      } finally {
        heartbeatInFlightRef.current = false;
      }
    };

    const syncParticipants = async () => {
      if (syncInFlightRef.current) {
        return;
      }

      syncInFlightRef.current = true;

      try {
        const { data, error } = await supabase
          .from('session_participants')
          .select(
            'id, user_id, role, display_name, avatar_url, joined_at, connection_status, last_seen_at'
          )
          .eq('session_id', sessionId)
          .eq('participation_status', 'active')
          .order('joined_at', { ascending: true });

        if (error) {
          console.error('participants sync error:', error);
          return;
        }

        if (!data || !isActive) {
          return;
        }

        const mappedParticipants = data.map((row) => mapParticipantRow(row, roleLabels));

        if (
          areParticipantsVisuallyEqual(
            lastSyncedParticipantsRef.current,
            mappedParticipants
          )
        ) {
          return;
        }

        lastSyncedParticipantsRef.current = mappedParticipants;
        onParticipantsSyncRef.current(mappedParticipants);
      } finally {
        syncInFlightRef.current = false;
      }
    };

    const markOffline = async () => {
      try {
        await supabase
          .from('session_participants')
          .update({
            connection_status: 'offline',
          })
          .eq('session_id', sessionId)
          .eq('user_id', currentUserId)
          .eq('participation_status', 'active');
      } catch (error) {
        console.error('mark offline error:', error);
      }
    };

    void sendHeartbeat();
    void syncParticipants();

    const heartbeatInterval = window.setInterval(() => {
      void sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    const syncInterval = window.setInterval(() => {
      void syncParticipants();
    }, HEARTBEAT_INTERVAL_MS);

    const profileChannel = supabase
      .channel(getParticipantProfileChannelName(sessionId))
      .on(
        'broadcast',
        { event: PARTICIPANT_PROFILE_CHANGED_EVENT },
        () => void syncParticipants()
      )
      .subscribe();

    const handlePageHide = () => {
      void markOffline();
    };

    const handleBeforeUnload = () => {
      void markOffline();
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isActive = false;

      window.clearInterval(heartbeatInterval);
      window.clearInterval(syncInterval);

      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      void supabase.removeChannel(profileChannel);

      void markOffline();
    };
  }, [sessionId, currentUserId, roleLabels]);
}
