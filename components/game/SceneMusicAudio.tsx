'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { SCENE_MUSIC_FADE_MS } from '@/features/tablet/master/scene/constants';
import type { SceneMusicItem } from '@/features/tablet/master/scene/types';
import { useSceneAudioVolume } from '@/features/tablet/useSceneAudioVolume';

type SceneMusicTimeSync = {
  trackId: string;
  currentTimeSeconds: number;
  isPlaying: boolean;
  receivedAt: number;
} | null;

type SceneMusicAudioProps = {
  music: SceneMusicItem | null;
  timeSync?: SceneMusicTimeSync;
  enabled?: boolean;
  onEnded?: () => void;
};

function getSyncedTime(music: SceneMusicItem, timeSync?: SceneMusicTimeSync) {
  if (timeSync?.trackId !== music.id) {
    return music.currentTimeSeconds;
  }

  if (!timeSync.isPlaying) {
    return timeSync.currentTimeSeconds;
  }

  return Math.max(
    0,
    timeSync.currentTimeSeconds + (Date.now() - timeSync.receivedAt) / 1000
  );
}

function fadeAudioTo(
  audio: HTMLAudioElement,
  targetVolume: number,
  durationMs: number
) {
  const startVolume = audio.volume;
  const safeTargetVolume = Math.min(1, Math.max(0, targetVolume));
  const startedAt = performance.now();
  let frameId = 0;

  const promise = new Promise<void>((resolve) => {
    const step = (now: number) => {
      const progress =
        durationMs <= 0 ? 1 : Math.min(1, (now - startedAt) / durationMs);
      const nextVolume = startVolume + (safeTargetVolume - startVolume) * progress;
      audio.volume = Math.min(1, Math.max(0, nextVolume));

      if (progress >= 1) {
        resolve();
        return;
      }

      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);
  });

  return {
    promise,
    cancel: () => window.cancelAnimationFrame(frameId),
  };
}

function getFinalVolume(localVolume: number, globalVolume: number | null | undefined) {
  return Math.min(1, Math.max(0, localVolume * (globalVolume ?? 1)));
}

export default function SceneMusicAudio({
  music,
  timeSync = null,
  enabled = true,
  onEnded,
}: SceneMusicAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeCancelRef = useRef<(() => void) | null>(null);
  const activeTrackIdRef = useRef<string | null>(null);
  const appliedTimeSyncRef = useRef<number | null>(null);
  const isUnlockedRef = useRef(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const { volume } = useSceneAudioVolume();
  const finalVolume = getFinalVolume(volume, music?.volume);
  const volumeRef = useRef(finalVolume);

  useEffect(() => {
    volumeRef.current = finalVolume;
  }, [finalVolume]);

  const cancelFade = useCallback(() => {
    fadeCancelRef.current?.();
    fadeCancelRef.current = null;
  }, []);

  const fadeOutAndPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;

    cancelFade();
    const fade = fadeAudioTo(audio, 0, SCENE_MUSIC_FADE_MS);
    fadeCancelRef.current = fade.cancel;

    void fade.promise.then(() => {
      if (fadeCancelRef.current === fade.cancel) {
        audio.pause();
        fadeCancelRef.current = null;
      }
    });
  }, [cancelFade]);

  const fadeOutCurrentTrack = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;

    cancelFade();
    const fade = fadeAudioTo(audio, 0, SCENE_MUSIC_FADE_MS);
    fadeCancelRef.current = fade.cancel;

    await fade.promise;

    if (fadeCancelRef.current === fade.cancel) {
      audio.pause();
      fadeCancelRef.current = null;
    }
  }, [cancelFade]);

  const playCurrentMusic = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !music || !enabled || !music.isPlaying) return;

    if (activeTrackIdRef.current !== music.id) {
      if (activeTrackIdRef.current && !audio.paused) {
        await fadeOutCurrentTrack();
      } else {
        cancelFade();
      }

      activeTrackIdRef.current = music.id;
      audio.src = music.audioUrl;
      audio.currentTime = getSyncedTime(music, timeSync);
      audio.volume = 0;
    } else {
      cancelFade();
    }

    if (activeTrackIdRef.current === music.id && timeSync?.trackId === music.id) {
      const syncedTime = getSyncedTime(music, timeSync);
      const isNewTimeSync = appliedTimeSyncRef.current !== timeSync.receivedAt;

      if (isNewTimeSync || Math.abs(audio.currentTime - syncedTime) > 0.15) {
        audio.currentTime = syncedTime;
        appliedTimeSyncRef.current = timeSync.receivedAt;
      }
    } else if (Math.abs(audio.currentTime - music.currentTimeSeconds) > 2) {
      audio.currentTime = music.currentTimeSeconds;
    }

    try {
      await audio.play();
      isUnlockedRef.current = true;
      setNeedsUnlock(false);

      const fade = fadeAudioTo(audio, volumeRef.current, SCENE_MUSIC_FADE_MS);
      fadeCancelRef.current = fade.cancel;
      void fade.promise.then(() => {
        if (fadeCancelRef.current === fade.cancel) {
          fadeCancelRef.current = null;
        }
      });
    } catch {
      setNeedsUnlock(true);
    }
  }, [cancelFade, enabled, fadeOutCurrentTrack, music, timeSync]);

  useEffect(() => {
    if (!enabled || !music?.isPlaying) {
      activeTrackIdRef.current = music?.id ?? null;
      fadeOutAndPause();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void playCurrentMusic();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [enabled, fadeOutAndPause, music, playCurrentMusic]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;

    audio.volume = finalVolume;
  }, [finalVolume]);

  useEffect(() => {
    if (!needsUnlock || !music?.isPlaying) return;

    const unlockAudio = () => {
      isUnlockedRef.current = true;
      void playCurrentMusic();
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [music?.isPlaying, needsUnlock, playCurrentMusic]);

  useEffect(() => {
    return () => {
      cancelFade();
    };
  }, [cancelFade]);

  return (
    <>
      <audio ref={audioRef} preload="auto" onEnded={onEnded} />

      {needsUnlock && music?.isPlaying ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex justify-center px-4">
          <div className="rounded-full border border-white/20 bg-black/65 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur">
            Click anywhere to enable scene audio
          </div>
        </div>
      ) : null}
    </>
  );
}
