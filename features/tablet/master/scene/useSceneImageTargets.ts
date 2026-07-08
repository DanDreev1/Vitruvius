'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SceneAudienceTarget } from './types';
import {
  addSceneImageTarget,
  getSceneImageAudience,
  getSceneImageTargets,
  removeSceneImageTarget,
} from './api';

export function useSceneImageTargets(
  sessionId: string,
  inGameSceneImageId: string | null,
  disabled: boolean
) {
  const [audience, setAudience] = useState<SceneAudienceTarget[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAudience = useCallback(async () => {
    setError(null);

    try {
      const nextAudience = await getSceneImageAudience(sessionId);
      setAudience(nextAudience);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Failed to load scene audience.';
      setError(message);
    }
  }, [sessionId]);

  const loadTargets = useCallback(async () => {
    if (!inGameSceneImageId || disabled) {
      setSelectedCharacterIds([]);
      return;
    }

    setError(null);

    try {
      const nextTargetIds = await getSceneImageTargets(inGameSceneImageId);
      setSelectedCharacterIds(nextTargetIds);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Failed to load scene image targets.';
      setError(message);
    }
  }, [inGameSceneImageId, disabled]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAudience();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadAudience]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTargets();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadTargets]);

  const allSelected = useMemo(() => {
    if (!audience.length) return false;

    return audience.every((participant) =>
      selectedCharacterIds.includes(participant.inGameCharacterId)
    );
  }, [audience, selectedCharacterIds]);

  const toggleParticipant = useCallback(
    async (inGameCharacterId: string) => {
      if (!inGameSceneImageId || disabled) return;

      const isSelected = selectedCharacterIds.includes(inGameCharacterId);
      setError(null);

      try {
        if (isSelected) {
          await removeSceneImageTarget(
            inGameSceneImageId,
            inGameCharacterId,
            sessionId
          );

          setSelectedCharacterIds((current) =>
            current.filter((id) => id !== inGameCharacterId)
          );
        } else {
          await addSceneImageTarget(
            inGameSceneImageId,
            inGameCharacterId,
            sessionId
          );

          setSelectedCharacterIds((current) => [...current, inGameCharacterId]);
        }
      } catch (toggleError) {
        const message =
          toggleError instanceof Error
            ? toggleError.message
            : 'Failed to update scene image target.';
        setError(message);
      }
    },
    [inGameSceneImageId, disabled, selectedCharacterIds, sessionId]
  );

  const toggleAll = useCallback(async () => {
    if (!inGameSceneImageId || disabled || !audience.length) return;

    const audienceIds = audience.map((participant) => participant.inGameCharacterId);
    setError(null);

    try {
      if (allSelected) {
        const idsToRemove = audienceIds.filter((id) =>
          selectedCharacterIds.includes(id)
        );

        await Promise.all(
            idsToRemove.map((id) =>
              removeSceneImageTarget(inGameSceneImageId, id, sessionId)
            )
        );

        setSelectedCharacterIds((current) =>
          current.filter((id) => !idsToRemove.includes(id))
        );
      } else {
        const idsToAdd = audienceIds.filter(
          (id) => !selectedCharacterIds.includes(id)
        );

        await Promise.all(
            idsToAdd.map((id) =>
              addSceneImageTarget(inGameSceneImageId, id, sessionId)
            )
        );

        setSelectedCharacterIds((current) => [...new Set([...current, ...idsToAdd])]);
      }
    } catch (toggleError) {
      const message =
        toggleError instanceof Error
          ? toggleError.message
          : 'Failed to update scene image targets.';
      setError(message);
    }
  }, [
    inGameSceneImageId,
    disabled,
    audience,
    selectedCharacterIds,
    allSelected,
    sessionId,
  ]);

  return {
    audience,
    selectedCharacterIds,
    allSelected,
    error,
    toggleParticipant,
    toggleAll,
  };
}
