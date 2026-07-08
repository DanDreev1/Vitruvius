'use client';

import { useCallback, useEffect, useState } from 'react';

export type SceneMusicEndMode = 'next' | 'repeat';

const STORAGE_KEY = 'vitruvius.sceneMusicEndMode';
const CHANGED_EVENT = 'vitruvius-scene-music-end-mode-changed';

function isSceneMusicEndMode(value: string | null): value is SceneMusicEndMode {
  return value === 'next' || value === 'repeat';
}

export function getStoredSceneMusicEndMode(): SceneMusicEndMode {
  if (typeof window === 'undefined') return 'next';

  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  return isSceneMusicEndMode(storedValue) ? storedValue : 'next';
}

export function useSceneMusicEndMode() {
  const [mode, setModeState] = useState(getStoredSceneMusicEndMode);

  useEffect(() => {
    const syncMode = () => {
      setModeState(getStoredSceneMusicEndMode());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        syncMode();
      }
    };

    window.addEventListener(CHANGED_EVENT, syncMode);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(CHANGED_EVENT, syncMode);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setMode = useCallback((nextMode: SceneMusicEndMode) => {
    window.localStorage.setItem(STORAGE_KEY, nextMode);
    setModeState(nextMode);
    window.dispatchEvent(new Event(CHANGED_EVENT));
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'repeat' ? 'next' : 'repeat');
  }, [mode, setMode]);

  return {
    mode,
    setMode,
    toggleMode,
  };
}
