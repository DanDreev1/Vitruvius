'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  clearPartyCheck,
  createPartyCheck,
  getPartyAudience,
  getPartyCharacterParameters,
  savePartyCharacterParameters,
} from './api';
import type {
  PartyAudienceTarget,
  PartyCheckMode,
  PartyParameter,
} from './types';
import { useActivePartyCheck } from './useActivePartyCheck';

export type PartyTargetDraft = {
  participantId: string;
  thresholds: number[];
  advantage: number;
  disadvantage: number;
};

function normalizeThresholds(values: number[], max: number) {
  return [...new Set(values)]
    .map((value) => Math.round(value))
    .filter((value) => value >= 1 && value <= max)
    .sort((a, b) => a - b);
}

function buildDefaultThresholds(max: number) {
  return [Math.min(3, max)];
}

export function usePartyMaster({
  sessionId,
  inGameWorldId,
}: {
  sessionId: string;
  inGameWorldId: string | null;
}) {
  const activeCheck = useActivePartyCheck(sessionId);
  const [audience, setAudience] = useState<PartyAudienceTarget[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [mode, setMode] = useState<PartyCheckMode>('individual');
  const [targetDrafts, setTargetDrafts] = useState<Record<string, PartyTargetDraft>>({});
  const [groupThresholds, setGroupThresholds] = useState<number[]>([6]);
  const [parameters, setParameters] = useState<PartyParameter[]>([]);
  const [parameterDrafts, setParameterDrafts] = useState<Record<string, number>>({});
  const [isLoadingAudience, setIsLoadingAudience] = useState(false);
  const [isLoadingParameters, setIsLoadingParameters] = useState(false);
  const [isSavingParameters, setIsSavingParameters] = useState(false);
  const [isCreatingCheck, setIsCreatingCheck] = useState(false);
  const [isCancellingCheck, setIsCancellingCheck] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAudience = useCallback(async () => {
    setIsLoadingAudience(true);
    setError(null);

    try {
      const nextAudience = await getPartyAudience(sessionId);
      setAudience(nextAudience);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Failed to load party.';
      setError(message);
    } finally {
      setIsLoadingAudience(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAudience();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadAudience]);

  const selectedTargets = useMemo(
    () =>
      selectedParticipantIds
        .map((participantId) =>
          audience.find((target) => target.participantId === participantId)
        )
        .filter((target): target is PartyAudienceTarget => Boolean(target)),
    [audience, selectedParticipantIds]
  );

  const editableTarget =
    selectedTargets.length === 1 && selectedTargets[0]?.role === 'player'
      ? selectedTargets[0]
      : null;

  useEffect(() => {
    let isMounted = true;

    async function loadParameters() {
      if (!editableTarget?.inGameCharacterId) {
        setParameters([]);
        setParameterDrafts({});
        return;
      }

      setIsLoadingParameters(true);
      setError(null);

      try {
        const nextParameters = await getPartyCharacterParameters(
          editableTarget.inGameCharacterId
        );

        if (!isMounted) return;

        setParameters(nextParameters);
        setParameterDrafts(
          Object.fromEntries(
            nextParameters.map((parameter) => [
              parameter.id,
              parameter.currentValue,
            ])
          )
        );
      } catch (loadError) {
        if (!isMounted) return;

        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load party parameters.';
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoadingParameters(false);
        }
      }
    }

    void loadParameters();

    return () => {
      isMounted = false;
    };
  }, [editableTarget?.inGameCharacterId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setTargetDrafts((prevDrafts) => {
        const nextDrafts: Record<string, PartyTargetDraft> = {};

        for (const participantId of selectedParticipantIds) {
          const previousDraft = prevDrafts[participantId];
          nextDrafts[participantId] = previousDraft ?? {
            participantId,
            thresholds: buildDefaultThresholds(6),
            advantage: 0,
            disadvantage: 0,
          };
        }

        return nextDrafts;
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedParticipantIds]);

  const toggleTarget = useCallback((participantId: string) => {
    setSelectedParticipantIds((prevIds) =>
      prevIds.includes(participantId)
        ? prevIds.filter((id) => id !== participantId)
        : [...prevIds, participantId]
    );
  }, []);

  const selectAllPlayers = useCallback(() => {
    setSelectedParticipantIds(audience.map((target) => target.participantId));
  }, [audience]);

  const clearTargets = useCallback(() => {
    setSelectedParticipantIds([]);
  }, []);

  const updateParameterDraft = useCallback((parameterId: string, value: number) => {
    setParameterDrafts((prevDrafts) => ({
      ...prevDrafts,
      [parameterId]: value,
    }));
  }, []);

  const saveParameters = useCallback(async () => {
    if (!editableTarget?.inGameCharacterId) return;

    const changedParameters = parameters
      .filter((parameter) => parameterDrafts[parameter.id] !== parameter.currentValue)
      .map((parameter) => ({
        id: parameter.id,
        currentValue: parameterDrafts[parameter.id] ?? parameter.currentValue,
      }));

    if (!changedParameters.length) return;

    setIsSavingParameters(true);
    setError(null);

    try {
      await savePartyCharacterParameters(
        editableTarget.inGameCharacterId,
        changedParameters
      );
      const nextParameters = await getPartyCharacterParameters(
        editableTarget.inGameCharacterId
      );
      setParameters(nextParameters);
      setParameterDrafts(
        Object.fromEntries(
          nextParameters.map((parameter) => [
            parameter.id,
            parameter.currentValue,
          ])
        )
      );
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Failed to save party parameters.';
      setError(message);
    } finally {
      setIsSavingParameters(false);
    }
  }, [editableTarget, parameterDrafts, parameters]);

  const updateTargetThresholds = useCallback(
    (participantId: string, thresholds: number[]) => {
      setTargetDrafts((prevDrafts) => ({
        ...prevDrafts,
        [participantId]: {
          ...(prevDrafts[participantId] ?? {
            participantId,
            thresholds: buildDefaultThresholds(6),
            advantage: 0,
            disadvantage: 0,
          }),
          thresholds: normalizeThresholds(thresholds, 6),
        },
      }));
    },
    []
  );

  const updateTargetModifier = useCallback(
    (
      participantId: string,
      key: 'advantage' | 'disadvantage',
      value: number
    ) => {
      setTargetDrafts((prevDrafts) => {
        const nextValue = Math.min(2, Math.max(0, Math.round(value)));
        const previousDraft =
          prevDrafts[participantId] ?? {
            participantId,
            thresholds: buildDefaultThresholds(6),
            advantage: 0,
            disadvantage: 0,
          };

        return {
          ...prevDrafts,
          [participantId]: {
            ...previousDraft,
            advantage:
              key === 'advantage'
                ? nextValue
                : nextValue > 0
                  ? 0
                  : previousDraft.advantage,
            disadvantage:
              key === 'disadvantage'
                ? nextValue
                : nextValue > 0
                  ? 0
                  : previousDraft.disadvantage,
          },
        };
      });
    },
    []
  );

  const updateGroupThresholds = useCallback((thresholds: number[]) => {
    setGroupThresholds(normalizeThresholds(thresholds, 12));
  }, []);

  const createCheck = useCallback(async () => {
    if (!inGameWorldId) {
      setError('In-game world id is missing.');
      return false;
    }

    if (!selectedTargets.length) {
      setError('Select at least one target.');
      return false;
    }

    if (mode === 'conflict' && selectedTargets.length !== 2) {
      setError('Conflict requires exactly two targets.');
      return false;
    }

    if (mode === 'group' && selectedTargets.length < 2) {
      setError('Group checks require at least two targets.');
      return false;
    }

    setIsCreatingCheck(true);
    setError(null);

    try {
      await createPartyCheck({
        sessionId,
        inGameWorldId,
        mode,
        targets: selectedTargets.map((target) => {
          const draft = targetDrafts[target.participantId] ?? {
            participantId: target.participantId,
            thresholds: buildDefaultThresholds(6),
            advantage: 0,
            disadvantage: 0,
          };

          return {
            audience: target,
            thresholds:
              mode === 'conflict' ? [] : normalizeThresholds(draft.thresholds, 6),
            advantage: draft.advantage,
            disadvantage: draft.disadvantage,
          };
        }),
        groupThresholds:
          mode === 'group' ? normalizeThresholds(groupThresholds, 12) : [],
      });
      await activeCheck.reload();
      return true;
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : 'Failed to create party check.';
      setError(message);
      return false;
    } finally {
      setIsCreatingCheck(false);
    }
  }, [
    activeCheck,
    groupThresholds,
    inGameWorldId,
    mode,
    selectedTargets,
    sessionId,
    targetDrafts,
  ]);

  const cancelActiveCheck = useCallback(async () => {
    if (!activeCheck.check) return;

    setIsCancellingCheck(true);
    setError(null);

    try {
      await clearPartyCheck(activeCheck.check);
      await activeCheck.reload();
    } catch (cancelError) {
      const message =
        cancelError instanceof Error
          ? cancelError.message
          : 'Failed to cancel active party check.';
      setError(message);
    } finally {
      setIsCancellingCheck(false);
    }
  }, [activeCheck]);

  return {
    audience,
    selectedParticipantIds,
    selectedTargets,
    editableTarget,
    mode,
    setMode,
    targetDrafts,
    groupThresholds,
    parameters,
    parameterDrafts,
    activeCheck: activeCheck.check,
    isActiveCheckLoading: activeCheck.isLoading,
    isLoadingAudience,
    isLoadingParameters,
    isSavingParameters,
    isCreatingCheck,
    isCancellingCheck,
    error: error ?? activeCheck.error,
    toggleTarget,
    selectAllPlayers,
    clearTargets,
    updateParameterDraft,
    saveParameters,
    updateTargetThresholds,
    updateTargetModifier,
    updateGroupThresholds,
    createCheck,
    cancelActiveCheck,
    reloadAudience: loadAudience,
    reloadActiveCheck: activeCheck.reload,
  };
}
