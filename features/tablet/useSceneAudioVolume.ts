'use client';

import { useCallback, useEffect, useState } from 'react';

const SCENE_AUDIO_VOLUME_STORAGE_KEY = 'vitruvius.sceneAudioVolume';
const SCENE_AUDIO_VOLUME_CHANGED_EVENT = 'vitruvius-scene-audio-volume-changed';
const DEFAULT_SCENE_AUDIO_VOLUME = 0.7;

function normalizeVolume(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_SCENE_AUDIO_VOLUME;
  }

  return Math.min(1, Math.max(0, value));
}

export function getStoredSceneAudioVolume() {
  if (typeof window === 'undefined') {
    return DEFAULT_SCENE_AUDIO_VOLUME;
  }

  const storedValue = window.localStorage.getItem(SCENE_AUDIO_VOLUME_STORAGE_KEY);
  if (!storedValue) {
    return DEFAULT_SCENE_AUDIO_VOLUME;
  }

  return normalizeVolume(Number(storedValue));
}

export function useSceneAudioVolume() {
  const [volume, setVolumeState] = useState(getStoredSceneAudioVolume);

  useEffect(() => {
    const syncVolume = () => {
      setVolumeState(getStoredSceneAudioVolume());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SCENE_AUDIO_VOLUME_STORAGE_KEY) {
        syncVolume();
      }
    };

    window.addEventListener(SCENE_AUDIO_VOLUME_CHANGED_EVENT, syncVolume);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(SCENE_AUDIO_VOLUME_CHANGED_EVENT, syncVolume);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setVolume = useCallback((nextVolume: number) => {
    const normalizedVolume = normalizeVolume(nextVolume);
    window.localStorage.setItem(
      SCENE_AUDIO_VOLUME_STORAGE_KEY,
      String(normalizedVolume)
    );
    setVolumeState(normalizedVolume);
    window.dispatchEvent(new Event(SCENE_AUDIO_VOLUME_CHANGED_EVENT));
  }, []);

  return {
    volume,
    setVolume,
  };
}
