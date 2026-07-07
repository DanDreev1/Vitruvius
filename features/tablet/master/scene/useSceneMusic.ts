'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  SCENE_MUSIC_ALLOWED_MIME_TYPES,
  SCENE_MUSIC_MAX_FILE_SIZE_BYTES,
} from './constants';
import {
  SCENE_MUSIC_LOCAL_CHANGED_EVENT,
  createInGameWorldSceneMusic,
  deleteInGameWorldSceneMusic,
  getInGameWorldSceneMusic,
  pauseInGameWorldSceneMusic,
  playInGameWorldSceneMusic,
  selectInGameWorldSceneMusic,
  updateInGameWorldSceneMusicCover,
  updateInGameWorldSceneMusicVolume,
} from './api';
import {
  clearSceneMusicRuntimeState,
  getSceneMusicRuntimeState,
  getSceneMusicRuntimeTime,
  saveSceneMusicRuntimeState,
} from './musicRuntime';
import type { SceneMusicItem, SceneMusicRecord } from './types';

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

function isAllowedAudioFile(file: File) {
  if (SCENE_MUSIC_ALLOWED_MIME_TYPES.includes(file.type)) {
    return true;
  }

  return /\.(mp3|wav|ogg|m4a)$/i.test(file.name);
}

function isAllowedCoverFile(file: File) {
  if (file.type.startsWith('image/')) {
    return true;
  }

  return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

function dispatchLocalMusicChange({
  sessionId,
  trackId,
  currentTimeSeconds,
  isActive,
  isPlaying,
  volume,
}: {
  sessionId: string;
  trackId: string;
  currentTimeSeconds: number;
  isActive: boolean;
  isPlaying: boolean;
  volume?: number;
}) {
  window.dispatchEvent(
    new CustomEvent(SCENE_MUSIC_LOCAL_CHANGED_EVENT, {
      detail: {
        sessionId,
        trackId,
        currentTimeSeconds,
        isActive,
        isPlaying,
        volume,
        changedAt: Date.now(),
      },
    })
  );
}

export function useSceneMusic(
  inGameWorldId: string | null,
  sessionId: string
) {
  const [records, setRecords] = useState<SceneMusicRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleLocalMusicChange = (event: Event) => {
      const payload = (event as CustomEvent<{
        sessionId?: string;
        trackId?: string;
        currentTimeSeconds?: number;
        isActive?: boolean;
        isPlaying?: boolean;
        volume?: number;
      }>).detail;

      if (
        payload?.sessionId !== sessionId ||
        !payload.trackId
      ) {
        return;
      }

      setRecords((prevRecords) =>
        prevRecords.map((record) => ({
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
        }))
      );
    };

    window.addEventListener(
      SCENE_MUSIC_LOCAL_CHANGED_EVENT,
      handleLocalMusicChange
    );

    return () => {
      window.removeEventListener(
        SCENE_MUSIC_LOCAL_CHANGED_EVENT,
        handleLocalMusicChange
      );
    };
  }, [sessionId]);

  const loadMusic = useCallback(async () => {
    if (!inGameWorldId) {
      setRecords([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextRecords = await getInGameWorldSceneMusic(inGameWorldId);
      setRecords(nextRecords);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load scene music.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [inGameWorldId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMusic();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadMusic]);

  const uploadMusic = useCallback(
    async (file: File) => {
      if (!inGameWorldId) {
        throw new Error('In-game world id is missing.');
      }

      if (!isAllowedAudioFile(file)) {
        const message = 'Only MP3, WAV, OGG, or M4A audio files are allowed.';
        setError(message);
        throw new Error(message);
      }

      if (file.size > SCENE_MUSIC_MAX_FILE_SIZE_BYTES) {
        const message = 'Audio file must be 10 MB or smaller.';
        setError(message);
        throw new Error(message);
      }

      setIsUploading(true);
      setError(null);

      try {
        await createInGameWorldSceneMusic(inGameWorldId, file, sessionId);
        await loadMusic();
      } catch (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : 'Failed to upload scene music.';
        setError(message);
        throw uploadError;
      } finally {
        setIsUploading(false);
      }
    },
    [inGameWorldId, loadMusic, sessionId]
  );

  const uploadCover = useCallback(
    async (music: SceneMusicItem, file: File) => {
      if (!inGameWorldId) {
        throw new Error('In-game world id is missing.');
      }

      if (!isAllowedCoverFile(file)) {
        const message = 'Only image files are allowed for music covers.';
        setError(message);
        throw new Error(message);
      }

      setIsUploading(true);
      setError(null);

      try {
        const coverUrl = await updateInGameWorldSceneMusicCover(
          music.id,
          inGameWorldId,
          file,
          sessionId
        );

        setRecords((prevRecords) =>
          prevRecords.map((record) =>
            record.id === music.id
              ? {
                  ...record,
                  cover_url: coverUrl,
                }
              : record
          )
        );
      } catch (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : 'Failed to upload scene music cover.';
        setError(message);
        throw uploadError;
      } finally {
        setIsUploading(false);
      }
    },
    [inGameWorldId, sessionId]
  );

  const setMusicVolume = useCallback(
    async (music: SceneMusicItem, volume: number) => {
      const safeVolume = Math.min(1, Math.max(0, volume));

      setError(null);
      setRecords((prevRecords) =>
        prevRecords.map((record) =>
          record.id === music.id
            ? {
                ...record,
                volume: safeVolume,
              }
            : record
        )
      );
      dispatchLocalMusicChange({
        sessionId,
        trackId: music.id,
        currentTimeSeconds: music.currentTimeSeconds,
        isActive: music.isActive,
        isPlaying: music.isPlaying,
        volume: safeVolume,
      });

      try {
        await updateInGameWorldSceneMusicVolume(music.id, safeVolume, sessionId);
      } catch (volumeError) {
        const message =
          volumeError instanceof Error
            ? volumeError.message
            : 'Failed to update scene music volume.';
        setError(message);
        void loadMusic();
      }
    },
    [loadMusic, sessionId]
  );

  const selectMusic = useCallback(
    async (musicId: string) => {
      if (!inGameWorldId) return;

      setError(null);

      try {
        clearSceneMusicRuntimeState(sessionId);
        setRecords((prevRecords) =>
          prevRecords.map((record) => ({
            ...record,
            is_active: record.id === musicId,
            is_playing: false,
            current_time_seconds:
              record.id === musicId ? 0 : record.current_time_seconds,
          }))
        );
        dispatchLocalMusicChange({
          sessionId,
          trackId: musicId,
          currentTimeSeconds: 0,
          isActive: true,
          isPlaying: false,
        });
        await selectInGameWorldSceneMusic(inGameWorldId, musicId, sessionId);
      } catch (selectError) {
        const message =
          selectError instanceof Error
            ? selectError.message
            : 'Failed to select scene music.';
        setError(message);
      }
    },
    [inGameWorldId, sessionId]
  );

  const switchMusic = useCallback(
    async (music: SceneMusicItem, shouldPlay: boolean) => {
      if (!inGameWorldId) return;

      setError(null);

      try {
        saveSceneMusicRuntimeState({
          sessionId,
          trackId: music.id,
          currentTimeSeconds: 0,
          isPlaying: shouldPlay,
        });
        setRecords((prevRecords) =>
          prevRecords.map((record) => ({
            ...record,
            is_active: record.id === music.id,
            is_playing: record.id === music.id && shouldPlay,
            current_time_seconds:
              record.id === music.id ? 0 : record.current_time_seconds,
          }))
        );
        dispatchLocalMusicChange({
          sessionId,
          trackId: music.id,
          currentTimeSeconds: 0,
          isActive: true,
          isPlaying: shouldPlay,
        });

        if (shouldPlay) {
          await playInGameWorldSceneMusic(
            inGameWorldId,
            music.id,
            0,
            sessionId
          );
        } else {
          await selectInGameWorldSceneMusic(inGameWorldId, music.id, sessionId);
        }
      } catch (switchError) {
        const message =
          switchError instanceof Error
            ? switchError.message
            : 'Failed to switch scene music.';
        setError(message);
      }
    },
    [inGameWorldId, sessionId]
  );

  const playMusic = useCallback(
    async (music: SceneMusicItem) => {
      if (!inGameWorldId) return;

      setError(null);

      try {
        const runtimeState = getSceneMusicRuntimeState(sessionId, music);
        const currentTimeSeconds =
          runtimeState?.trackId === music.id
            ? getSceneMusicRuntimeTime(runtimeState)
            : music.currentTimeSeconds;

        saveSceneMusicRuntimeState({
          sessionId,
          trackId: music.id,
          currentTimeSeconds,
          isPlaying: true,
        });
        setRecords((prevRecords) =>
          prevRecords.map((record) => ({
            ...record,
            is_active: record.id === music.id,
            is_playing: record.id === music.id,
            current_time_seconds:
              record.id === music.id
                ? currentTimeSeconds
                : record.current_time_seconds,
          }))
        );
        dispatchLocalMusicChange({
          sessionId,
          trackId: music.id,
          currentTimeSeconds,
          isActive: true,
          isPlaying: true,
        });

        await playInGameWorldSceneMusic(
          inGameWorldId,
          music.id,
          currentTimeSeconds,
          sessionId
        );
      } catch (playError) {
        const message =
          playError instanceof Error
            ? playError.message
            : 'Failed to play scene music.';
        setError(message);
      }
    },
    [inGameWorldId, sessionId]
  );

  const pauseMusic = useCallback(
    async (music: SceneMusicItem) => {
      setError(null);

      try {
        const runtimeState = getSceneMusicRuntimeState(sessionId, music);
        const currentTimeSeconds =
          runtimeState?.trackId === music.id
            ? getSceneMusicRuntimeTime(runtimeState)
            : music.currentTimeSeconds;

        saveSceneMusicRuntimeState({
          sessionId,
          trackId: music.id,
          currentTimeSeconds,
          isPlaying: false,
        });
        setRecords((prevRecords) =>
          prevRecords.map((record) =>
            record.id === music.id
              ? {
                  ...record,
                  is_playing: false,
                  current_time_seconds: currentTimeSeconds,
                }
              : record
          )
        );
        dispatchLocalMusicChange({
          sessionId,
          trackId: music.id,
          currentTimeSeconds,
          isActive: true,
          isPlaying: false,
        });

        await pauseInGameWorldSceneMusic(
          music.id,
          currentTimeSeconds,
          sessionId
        );
      } catch (pauseError) {
        const message =
          pauseError instanceof Error
            ? pauseError.message
            : 'Failed to pause scene music.';
        setError(message);
      }
    },
    [sessionId]
  );

  const seekMusic = useCallback(
    async (music: SceneMusicItem, currentTimeSeconds: number) => {
      if (!inGameWorldId || !music.isActive) return;

      setError(null);

      try {
        saveSceneMusicRuntimeState({
          sessionId,
          trackId: music.id,
          currentTimeSeconds,
          isPlaying: music.isPlaying,
        });
        setRecords((prevRecords) =>
          prevRecords.map((record) =>
            record.id === music.id
              ? {
                  ...record,
                  current_time_seconds: currentTimeSeconds,
                }
              : record
          )
        );
        dispatchLocalMusicChange({
          sessionId,
          trackId: music.id,
          currentTimeSeconds,
          isActive: true,
          isPlaying: music.isPlaying,
        });

        if (music.isPlaying) {
          await playInGameWorldSceneMusic(
            inGameWorldId,
            music.id,
            currentTimeSeconds,
            sessionId
          );
        } else {
          await pauseInGameWorldSceneMusic(
            music.id,
            currentTimeSeconds,
            sessionId
          );
        }
      } catch (seekError) {
        const message =
          seekError instanceof Error
            ? seekError.message
            : 'Failed to seek scene music.';
        setError(message);
      }
    },
    [inGameWorldId, sessionId]
  );

  const deleteMusic = useCallback(
    async (music: SceneMusicItem) => {
      setError(null);

      try {
        if (music.isActive) {
          clearSceneMusicRuntimeState(sessionId);
        }

        await deleteInGameWorldSceneMusic(music.id, sessionId);
        await loadMusic();
      } catch (deleteError) {
        const message =
          deleteError instanceof Error
            ? deleteError.message
            : 'Failed to delete scene music.';
        setError(message);
      }
    },
    [loadMusic, sessionId]
  );

  const music = useMemo(
    () => records.map(mapRecordToItem),
    [records]
  );

  return {
    music,
    isLoading,
    isUploading,
    error,
    loadMusic,
    uploadMusic,
    uploadCover,
    setMusicVolume,
    selectMusic,
    playMusic,
    pauseMusic,
    seekMusic,
    switchMusic,
    deleteMusic,
  };
}
