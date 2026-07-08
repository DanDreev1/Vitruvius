'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import SceneMusicAudio from '@/components/game/SceneMusicAudio';
import {
  SCENE_MUSIC_CHANGED_EVENT,
  SCENE_MUSIC_LOCAL_CHANGED_EVENT,
  SCENE_MUSIC_TIME_REQUEST_EVENT,
  broadcastSceneMusicTimeResponse,
  getInGameWorldSceneMusic,
  getSceneMusicRealtimeChannelName,
  pauseInGameWorldSceneMusic,
  playInGameWorldSceneMusic,
  updateInGameWorldSceneMusicTime,
} from '@/features/tablet/master/scene/api';
import {
  getSceneMusicRuntimeState,
  getSceneMusicRuntimeTime,
  saveSceneMusicRuntimeState,
} from '@/features/tablet/master/scene/musicRuntime';
import type {
  SceneMusicItem,
  SceneMusicRecord,
} from '@/features/tablet/master/scene/types';
import { useSceneMusicEndMode } from '@/features/tablet/master/scene/useSceneMusicEndMode';
import { supabase } from '@/lib/supabaseClient';

type MusicTimeRequestPayload = {
  sessionId?: string;
  trackId?: string;
};

type LocalMusicChangedPayload = MusicTimeRequestPayload & {
  currentTimeSeconds?: number;
  isActive?: boolean;
  isPlaying?: boolean;
  volume?: number;
};

function applyMusicPayloadToRecords(
  records: SceneMusicRecord[],
  payload: LocalMusicChangedPayload
) {
  if (!payload.trackId) {
    return records;
  }

  return records.map((record) => ({
    ...record,
    is_active:
      record.id === payload.trackId
        ? payload.isActive ?? record.is_active
        : payload.isActive
          ? false
          : record.is_active,
    is_playing:
      record.id === payload.trackId
        ? payload.isPlaying === true
        : payload.isPlaying
          ? false
          : record.is_playing,
    current_time_seconds:
      record.id === payload.trackId && typeof payload.currentTimeSeconds === 'number'
        ? payload.currentTimeSeconds ?? record.current_time_seconds
        : record.current_time_seconds,
    volume:
      record.id === payload.trackId && typeof payload.volume === 'number'
        ? payload.volume
        : record.volume,
  }));
}

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

export default function SceneMusicMasterRuntime({
  sessionId,
  inGameWorldId,
  enabled = true,
}: {
  sessionId: string;
  inGameWorldId: string | null;
  enabled?: boolean;
}) {
  const [records, setRecords] = useState<SceneMusicRecord[]>([]);
  const { mode: endMode } = useSceneMusicEndMode();
  const endedRestartGuardRef = useRef<{
    trackId: string;
    expiresAt: number;
  } | null>(null);

  const loadMusic = useCallback(async () => {
    if (!enabled || !inGameWorldId) {
      setRecords([]);
      return;
    }

    try {
      const nextRecords = await getInGameWorldSceneMusic(inGameWorldId);
      setRecords(nextRecords);
    } catch (error) {
      console.error(error);
    }
  }, [enabled, inGameWorldId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMusic();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadMusic]);

  const activeMusic = useMemo(() => {
    const activeRecord = records.find((record) => record.is_active) ?? null;
    return activeRecord ? mapRecordToItem(activeRecord) : null;
  }, [records]);

  const sortedMusic = useMemo(
    () => [...records].sort((a, b) => a.sort_order - b.sort_order),
    [records]
  );

  useEffect(() => {
    if (!enabled || !inGameWorldId) return;

    const shouldIgnoreLateEndedRestart = (
      payload: LocalMusicChangedPayload
    ) => {
      const guard = endedRestartGuardRef.current;

      if (!guard || Date.now() > guard.expiresAt) {
        endedRestartGuardRef.current = null;
        return false;
      }

      return (
        payload.trackId === guard.trackId &&
        payload.isPlaying === true &&
        Math.abs((payload.currentTimeSeconds ?? 0) - 0) < 0.05
      );
    };

    const handleLocalMusicChange = (event: Event) => {
      const payload = (event as CustomEvent<LocalMusicChangedPayload>).detail;

      if (
        payload?.sessionId === sessionId &&
        payload.trackId
      ) {
        if (shouldIgnoreLateEndedRestart(payload)) {
          return;
        }

        setRecords((prevRecords) =>
          applyMusicPayloadToRecords(prevRecords, payload)
        );
        return;
      }

      void loadMusic();
    };

    window.addEventListener(
      SCENE_MUSIC_LOCAL_CHANGED_EVENT,
      handleLocalMusicChange
    );

    const channel = supabase
      .channel(getSceneMusicRealtimeChannelName(sessionId))
      .on(
        'broadcast',
        {
          event: SCENE_MUSIC_CHANGED_EVENT,
        },
        ({ payload }) => {
          const change = payload as LocalMusicChangedPayload;

          if (
            change?.sessionId === sessionId &&
            change.trackId
          ) {
            if (shouldIgnoreLateEndedRestart(change)) {
              return;
            }

            setRecords((prevRecords) =>
              applyMusicPayloadToRecords(prevRecords, change)
            );
            return;
          }

          void loadMusic();
        }
      )
      .on(
        'broadcast',
        {
          event: SCENE_MUSIC_TIME_REQUEST_EVENT,
        },
        ({ payload }) => {
          const request = payload as MusicTimeRequestPayload;

          if (request.sessionId !== sessionId || !activeMusic) {
            return;
          }

          const runtimeState = getSceneMusicRuntimeState(sessionId, activeMusic);
          const currentTimeSeconds = runtimeState
            ? getSceneMusicRuntimeTime(runtimeState)
            : activeMusic.currentTimeSeconds;

          void broadcastSceneMusicTimeResponse({
            sessionId,
            trackId: activeMusic.id,
            currentTimeSeconds,
            isPlaying: activeMusic.isPlaying,
          });
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener(
        SCENE_MUSIC_LOCAL_CHANGED_EVENT,
        handleLocalMusicChange
      );
      void supabase.removeChannel(channel);
    };
  }, [activeMusic, enabled, inGameWorldId, loadMusic, sessionId]);

  useEffect(() => {
    if (!activeMusic) return;

    const saveCurrentTime = () => {
      const runtimeState = getSceneMusicRuntimeState(sessionId, activeMusic);
      if (!runtimeState) return;

      void updateInGameWorldSceneMusicTime(
        activeMusic.id,
        getSceneMusicRuntimeTime(runtimeState)
      );
    };

    window.addEventListener('pagehide', saveCurrentTime);
    window.addEventListener('beforeunload', saveCurrentTime);

    return () => {
      saveCurrentTime();
      window.removeEventListener('pagehide', saveCurrentTime);
      window.removeEventListener('beforeunload', saveCurrentTime);
    };
  }, [activeMusic, sessionId]);

  const handleMusicEnded = useCallback(() => {
    if (!activeMusic || !inGameWorldId) return;

    if (endMode === 'repeat') {
      endedRestartGuardRef.current = {
        trackId: activeMusic.id,
        expiresAt: Date.now() + 8000,
      };
      saveSceneMusicRuntimeState({
        sessionId,
        trackId: activeMusic.id,
        currentTimeSeconds: 0,
        isPlaying: true,
      });
      setRecords((prevRecords) =>
        prevRecords.map((record) =>
          record.id === activeMusic.id
            ? {
                ...record,
                is_active: true,
                is_playing: true,
                current_time_seconds: 0,
              }
            : record
        )
      );
      void playInGameWorldSceneMusic(inGameWorldId, activeMusic.id, 0, sessionId)
        .catch(console.error);
      return;
    }

    if (sortedMusic.length <= 1) {
      saveSceneMusicRuntimeState({
        sessionId,
        trackId: activeMusic.id,
        currentTimeSeconds: activeMusic.currentTimeSeconds,
        isPlaying: false,
      });
      setRecords((prevRecords) =>
        prevRecords.map((record) =>
          record.id === activeMusic.id
            ? {
                ...record,
                is_playing: false,
              }
            : record
        )
      );
      void pauseInGameWorldSceneMusic(
        activeMusic.id,
        activeMusic.currentTimeSeconds,
        sessionId
      )
        .catch(console.error);
      return;
    }

    const activeIndex = sortedMusic.findIndex(
      (record) => record.id === activeMusic.id
    );
    const nextRecord = sortedMusic[(activeIndex + 1) % sortedMusic.length];
    if (!nextRecord) return;

    endedRestartGuardRef.current = {
      trackId: nextRecord.id,
      expiresAt: Date.now() + 8000,
    };
    saveSceneMusicRuntimeState({
      sessionId,
      trackId: nextRecord.id,
      currentTimeSeconds: 0,
      isPlaying: true,
    });
    setRecords((prevRecords) =>
      prevRecords.map((record) => ({
        ...record,
        is_active: record.id === nextRecord.id,
        is_playing: record.id === nextRecord.id,
        current_time_seconds:
          record.id === nextRecord.id ? 0 : record.current_time_seconds,
      }))
    );
    void playInGameWorldSceneMusic(inGameWorldId, nextRecord.id, 0, sessionId)
      .catch(console.error);
  }, [activeMusic, endMode, inGameWorldId, sessionId, sortedMusic]);

  return (
    <SceneMusicAudio
      music={activeMusic?.isPlaying ? activeMusic : null}
      enabled={enabled}
      onEnded={handleMusicEnded}
    />
  );
}
