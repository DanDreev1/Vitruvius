'use client';

import type { SceneMusicItem } from './types';

const SCENE_MUSIC_RUNTIME_STORAGE_PREFIX = 'vitruvius.sceneMusicRuntime';
const SCENE_MUSIC_RUNTIME_MAX_AGE_MS = 2 * 60 * 60 * 1000;

type SceneMusicRuntimeState = {
  sessionId: string;
  trackId: string;
  baseTimeSeconds: number;
  startedAtMs: number;
  isPlaying: boolean;
  savedAtMs: number;
};

function getStorageKey(sessionId: string) {
  return `${SCENE_MUSIC_RUNTIME_STORAGE_PREFIX}.${sessionId}`;
}

function clampTime(value: number) {
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

export function getSceneMusicRuntimeTime(state: SceneMusicRuntimeState) {
  if (!state.isPlaying) {
    return clampTime(state.baseTimeSeconds);
  }

  return clampTime(
    state.baseTimeSeconds + (Date.now() - state.startedAtMs) / 1000
  );
}

export function getSceneMusicRuntimeState(
  sessionId: string,
  activeTrack?: SceneMusicItem | null
) {
  try {
    const rawValue = window.sessionStorage.getItem(getStorageKey(sessionId));
    if (!rawValue) return null;

    const state = JSON.parse(rawValue) as SceneMusicRuntimeState;

    if (
      state.sessionId !== sessionId ||
      !state.trackId ||
      Date.now() - state.savedAtMs > SCENE_MUSIC_RUNTIME_MAX_AGE_MS
    ) {
      return null;
    }

    if (activeTrack && state.trackId !== activeTrack.id) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

export function saveSceneMusicRuntimeState({
  sessionId,
  trackId,
  currentTimeSeconds,
  isPlaying,
}: {
  sessionId: string;
  trackId: string;
  currentTimeSeconds: number;
  isPlaying: boolean;
}) {
  const now = Date.now();
  const state: SceneMusicRuntimeState = {
    sessionId,
    trackId,
    baseTimeSeconds: clampTime(currentTimeSeconds),
    startedAtMs: now,
    isPlaying,
    savedAtMs: now,
  };

  window.sessionStorage.setItem(getStorageKey(sessionId), JSON.stringify(state));
}

export function clearSceneMusicRuntimeState(sessionId: string) {
  window.sessionStorage.removeItem(getStorageKey(sessionId));
}
