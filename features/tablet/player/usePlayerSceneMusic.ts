'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  SCENE_MUSIC_CHANGED_EVENT,
  SCENE_MUSIC_TIME_REQUEST_EVENT,
  SCENE_MUSIC_TIME_RESPONSE_EVENT,
  getAvailablePlayerSceneMusic,
  getSceneMusicRealtimeChannelName,
} from '@/features/tablet/master/scene/api';
import type {
  SceneMusicItem,
  SceneMusicRecord,
} from '@/features/tablet/master/scene/types';
import { supabase } from '@/lib/supabaseClient';

type TimeResponse = {
  sessionId?: string;
  trackId?: string;
  currentTimeSeconds?: number;
  isPlaying?: boolean;
};

type MusicChangedPayload = TimeResponse & {
  isActive?: boolean;
  volume?: number;
};

type AppliedLiveSync = {
  trackId: string;
  currentTimeSeconds: number;
  isPlaying: boolean;
  appliedAt: number;
};

const LIVE_SYNC_DEDUPE_MS = 5000;

function mapRecordToItem(record: SceneMusicRecord): SceneMusicItem {
  return {
    id: record.id,
    title: record.title,
    audioUrl: record.audio_url,
    coverUrl: record.cover_url,
    isActive: record.is_active,
    isPlaying: record.is_playing,
    currentTimeSeconds: record.current_time_seconds ?? 0,
    volume: record.volume ?? 1,
    sortOrder: record.sort_order,
  };
}

export function usePlayerSceneMusic({
  sessionId,
  inGameWorldId,
  participantId,
  enabled = true,
}: {
  sessionId: string | null;
  inGameWorldId: string | null;
  participantId: string | null;
  enabled?: boolean;
}) {
  const [record, setRecord] = useState<SceneMusicRecord | null>(null);
  const [timeSync, setTimeSync] = useState<{
    trackId: string;
    currentTimeSeconds: number;
    isPlaying: boolean;
    receivedAt: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recordRef = useRef<SceneMusicRecord | null>(null);
  const lastLiveSyncRef = useRef<AppliedLiveSync | null>(null);

  useEffect(() => {
    recordRef.current = record;
  }, [record]);

  const loadMusic = useCallback(async () => {
    if (!enabled || !sessionId || !inGameWorldId || !participantId) {
      setRecord(null);
      setTimeSync(null);
      return;
    }

    setError(null);

    try {
      const nextRecord = await getAvailablePlayerSceneMusic({
        sessionId,
        inGameWorldId,
        participantId,
      });
      const previousRecord = recordRef.current;
      const lastLiveSync = lastLiveSyncRef.current;
      const matchesRecentLiveSync =
        Boolean(nextRecord && lastLiveSync) &&
        Date.now() - lastLiveSync!.appliedAt < LIVE_SYNC_DEDUPE_MS &&
        nextRecord!.id === lastLiveSync!.trackId &&
        nextRecord!.is_playing === lastLiveSync!.isPlaying &&
        Math.abs(
          (nextRecord!.current_time_seconds ?? 0) -
            lastLiveSync!.currentTimeSeconds
        ) < 0.05;
      const shouldSyncTime =
        !matchesRecentLiveSync &&
        (!nextRecord ||
          !previousRecord ||
          previousRecord.id !== nextRecord.id ||
          previousRecord.is_playing !== nextRecord.is_playing ||
          previousRecord.updated_at !== nextRecord.updated_at ||
          Math.abs(
            (previousRecord.current_time_seconds ?? 0) -
              (nextRecord.current_time_seconds ?? 0)
          ) > 0.05);

      setRecord(nextRecord);

      if (shouldSyncTime) {
        setTimeSync(
          nextRecord
            ? {
                trackId: nextRecord.id,
                currentTimeSeconds: nextRecord.current_time_seconds ?? 0,
                isPlaying: nextRecord.is_playing === true,
                receivedAt: Date.now(),
              }
            : null
        );
      }
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load available scene music.';
      setError(message);
    }
  }, [enabled, inGameWorldId, participantId, sessionId]);

  const applyLiveSync = useCallback(
    ({
      trackId,
      currentTimeSeconds,
      isPlaying,
    }: {
      trackId: string;
      currentTimeSeconds: number;
      isPlaying: boolean;
    }) => {
      const appliedAt = Date.now();

      lastLiveSyncRef.current = {
        trackId,
        currentTimeSeconds,
        isPlaying,
        appliedAt,
      };

      setTimeSync({
        trackId,
        currentTimeSeconds,
        isPlaying,
        receivedAt: appliedAt,
      });
    },
    []
  );

  const requestTimeSync = useCallback(
    async (trackId: string) => {
      if (!sessionId || !participantId) return;

      const channel = supabase.channel(getSceneMusicRealtimeChannelName(sessionId));

      try {
        const isSubscribed = await new Promise<boolean>((resolve) => {
          const timeoutId = window.setTimeout(() => resolve(false), 3000);

          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              window.clearTimeout(timeoutId);
              resolve(true);
            }
          });
        });

        if (!isSubscribed) {
          return;
        }

        await channel.send({
          type: 'broadcast',
          event: SCENE_MUSIC_TIME_REQUEST_EVENT,
          payload: {
            sessionId,
            participantId,
            trackId,
            requestedAt: Date.now(),
          },
        });
      } finally {
        void supabase.removeChannel(channel);
      }
    },
    [participantId, sessionId]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMusic();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadMusic]);

  useEffect(() => {
    if (!enabled || !sessionId || !inGameWorldId || !participantId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadMusic();
    }, 1500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, inGameWorldId, loadMusic, participantId, sessionId]);

  useEffect(() => {
    if (!enabled || !sessionId || !inGameWorldId || !participantId) {
      return;
    }

    const channel = supabase
      .channel(getSceneMusicRealtimeChannelName(sessionId))
      .on(
        'broadcast',
        {
          event: SCENE_MUSIC_CHANGED_EVENT,
        },
        ({ payload }) => {
          const change = payload as MusicChangedPayload;

          if (
            change.sessionId === sessionId &&
            change.trackId &&
            typeof change.currentTimeSeconds === 'number'
          ) {
            applyLiveSync({
              trackId: change.trackId,
              currentTimeSeconds: change.currentTimeSeconds,
              isPlaying: change.isPlaying === true,
            });

            setRecord((prevRecord) => {
              if (!prevRecord || prevRecord.id !== change.trackId) {
                return prevRecord;
              }

              return {
                ...prevRecord,
                is_active: change.isActive ?? prevRecord.is_active,
                is_playing: change.isPlaying === true,
                current_time_seconds:
                  change.currentTimeSeconds ?? prevRecord.current_time_seconds,
                volume:
                  typeof change.volume === 'number'
                    ? change.volume
                    : prevRecord.volume,
              };
            });
          }

          void loadMusic();
        }
      )
      .on(
        'broadcast',
        {
          event: SCENE_MUSIC_TIME_RESPONSE_EVENT,
        },
        ({ payload }) => {
          const response = payload as TimeResponse;

          if (
            response.sessionId !== sessionId ||
            !response.trackId ||
            typeof response.currentTimeSeconds !== 'number'
          ) {
            return;
          }

          applyLiveSync({
            trackId: response.trackId,
            currentTimeSeconds: response.currentTimeSeconds,
            isPlaying: response.isPlaying === true,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'in_game_worlds_scene_music',
          filter: `in_game_world_id=eq.${inGameWorldId}`,
        },
        () => {
          void loadMusic();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'in_game_worlds_scene_music_targets',
        },
        () => {
          void loadMusic();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applyLiveSync, enabled, inGameWorldId, loadMusic, participantId, sessionId]);

  const music = useMemo(
    () => (record ? mapRecordToItem(record) : null),
    [record]
  );

  useEffect(() => {
    if (!music?.isPlaying) return;

    void requestTimeSync(music.id);
  }, [music?.id, music?.isPlaying, requestTimeSync]);

  return {
    music,
    timeSync,
    error,
    reload: loadMusic,
  };
}
