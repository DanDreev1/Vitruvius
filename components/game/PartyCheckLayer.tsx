'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  acceptPartyCheck,
  clearPartyCheck,
  getPartyAttributeTemplates,
  getPartyCharacterAttributes,
  getPartyCharacterParameters,
  getRollAttemptSuccesses,
  rollPartyDice,
  savePartyCheckState,
} from '@/features/tablet/master/party/api';
import {
  isPartyConfirmationSuppressed,
  setPartyConfirmationSuppressed,
} from '@/features/tablet/master/party/confirmation';
import type {
  PartyAttribute,
  PartyCheckState,
  PartyCheckTarget,
  PartyDecisionAction,
} from '@/features/tablet/master/party/types';
import type {
  DensityPreset,
  GameParticipant,
  ResolvedSeatPosition,
  SeatedPlayer,
} from '@/lib/game/types';
import { getSeatVisualConfig } from '@/lib/game/getSeatVisualConfig';

type PartyCheckLayerProps = {
  sessionId: string;
  check: PartyCheckState | null;
  currentParticipant: GameParticipant;
  master: GameParticipant;
  masterSeat: ResolvedSeatPosition;
  seatedPlayers: SeatedPlayer[];
  density: DensityPreset;
  persistChanges?: boolean;
  onCheckChange: (check: PartyCheckState | null) => void;
  onMessage: (payload: {
    checkId: string;
    type: 'roll' | 'inspiration' | 'free_bonus' | 'reset_inspiration' | 'reset_free_bonus';
    participantId: string;
    displayName: string;
    text: string;
  }) => void;
};

type RollOverlayState = {
  target: PartyCheckTarget;
} | null;

type ConfirmationState = {
  action: PartyDecisionAction;
  winnerParticipantId?: string;
} | null;

type DecisionRevealState = {
  action: PartyDecisionAction;
  winnerParticipantId?: string;
} | null;

const ROLL_FLASH_MS = 900;
const DECISION_REVEAL_MS = 1000;

type SuccessBreakdown = {
  dice: number;
  freeBonus: number;
  inspiration: number;
};

const ATTRIBUTE_ICON_PATHS: Record<string, string> = {
  constitution: '/attributes-imgs/Cons.png',
  awareness: '/attributes-imgs/Awareness.png',
  agility: '/attributes-imgs/Agility.png',
  thinking: '/attributes-imgs/Thinking.png',
  charisma: '/attributes-imgs/Charisma.png',
  will: '/attributes-imgs/Will.png',
};

function getForwardVector(seatFacing: ResolvedSeatPosition['seatFacing']) {
  const vectors = {
    up: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
  };

  return vectors[seatFacing];
}

function getPartyCheckRotation(seatFacing: ResolvedSeatPosition['seatFacing']) {
  const rotations = {
    up: 0,
    right: 90,
    down: 180,
    left: -90,
  };

  return rotations[seatFacing];
}

function getTotalRolls(target: PartyCheckTarget) {
  return Math.max(1, 1 + target.advantage + target.disadvantage);
}

function getSelectedAttempt(target: PartyCheckTarget) {
  return (
    target.roll.attempts.find(
      (attempt) => attempt.id === target.roll.selectedAttemptId
    ) ??
    target.roll.attempts[0] ??
    null
  );
}

function getDiceSuccesses(target: PartyCheckTarget) {
  return getSelectedAttempt(target)?.successes ?? 0;
}

function getFinalSuccesses(target: PartyCheckTarget) {
  return (
    getDiceSuccesses(target) +
    target.roll.inspirationSuccesses +
    target.roll.freeBonusSuccesses
  );
}

function isTargetComplete(target: PartyCheckTarget) {
  return target.roll.attempts.length >= getTotalRolls(target);
}

function getAttemptSuccesses(target: PartyCheckTarget, attemptId: string | null) {
  if (!attemptId) return 0;
  return (
    target.roll.attempts.find((attempt) => attempt.id === attemptId)?.successes ??
    0
  );
}

function getDisplayedSuccesses(
  target: PartyCheckTarget,
  transientAttemptId: string | null
): SuccessBreakdown {
  if (isTargetComplete(target)) {
    return {
      dice: getDiceSuccesses(target),
      freeBonus: target.roll.freeBonusSuccesses,
      inspiration: target.roll.inspirationSuccesses,
    };
  }

  return {
    dice: getAttemptSuccesses(target, transientAttemptId),
    freeBonus: 0,
    inspiration: 0,
  };
}

function getSuccessTotal(successes: SuccessBreakdown) {
  return successes.dice + successes.freeBonus + successes.inspiration;
}

function getSuccessColor(index: number, successes: SuccessBreakdown) {
  if (index < successes.dice) return '#FFFFFF';
  if (index < successes.dice + successes.freeBonus) return '#6EA6E8';
  return '#E0BE62';
}

function hasPassedThreshold(successes: number, thresholds: number[]) {
  if (!thresholds.length) return successes > 0;
  return thresholds.some((threshold) => successes >= threshold);
}

function pickSelectedAttemptId(target: PartyCheckTarget) {
  const attempts = target.roll.attempts;
  if (attempts.length < getTotalRolls(target)) return null;

  const shouldPickWorst = target.disadvantage > target.advantage;
  const sorted = [...attempts].sort((a, b) =>
    shouldPickWorst ? a.successes - b.successes : b.successes - a.successes
  );

  return sorted[0]?.id ?? null;
}

function buildEmptyRoll() {
  return {
    attempts: [],
    selectedAttemptId: null,
    inspirationSuccesses: 0,
    freeBonusSuccesses: 0,
  };
}

function ThresholdTrack({
  max,
  thresholds,
  successes,
  compact = false,
  revealOutcome = null,
}: {
  max: number;
  thresholds: number[];
  successes: SuccessBreakdown;
  compact?: boolean;
  revealOutcome?: 'success' | 'failure' | null;
}) {
  return (
    <div
      className={[
        'grid items-end gap-[8px]',
        max > 6 ? 'grid-cols-6' : 'grid-flow-col auto-cols-max',
      ].join(' ')}
    >
      {Array.from({ length: max }).map((_, index) => {
        const value = index + 1;
        const isThreshold = thresholds.includes(value);
        const hasSuccess = getSuccessTotal(successes) >= value;
        const shouldRevealColor = revealOutcome !== null;
        const revealColor =
          revealOutcome === 'success'
            ? 'border-[#E0BE62] text-[#E0BE62]'
            : revealOutcome === 'failure'
              ? 'border-[#6EA6E8] text-[#6EA6E8]'
              : 'border-white/70 text-white/90';

        return (
          <div
            key={value}
            className={[
              'relative transition-colors duration-300',
              shouldRevealColor ? revealColor : 'border-white/70 text-white/90',
              isThreshold
                ? compact
                  ? 'h-[27px] w-[18px]'
                  : 'h-[36px] w-[24px]'
                : [
                    'border bg-[#111A2D]',
                    compact
                      ? 'h-[18px] w-[18px] rounded-[6px]'
                      : 'h-[24px] w-[24px] rounded-[8px]',
                  ].join(' '),
            ].join(' ')}
            style={{
              transitionDelay: revealOutcome ? `${index * 90}ms` : '0ms',
            }}
          >
            {isThreshold ? (
              <>
                <div
                  className={[
                    'absolute left-1/2 top-0 -translate-x-1/2 rounded-t-full border border-current border-b-0 bg-[#111A2D] transition-colors duration-300',
                    compact ? 'h-[12px] w-[18px]' : 'h-[16px] w-[24px]',
                  ].join(' ')}
                  style={{
                    transitionDelay: revealOutcome ? `${index * 90}ms` : '0ms',
                  }}
                />
                <div
                  className={[
                    'absolute bottom-0 left-1/2 -translate-x-1/2 rounded-b-[5px] border border-current bg-[#111A2D] transition-colors duration-300',
                    compact ? 'h-[18px] w-[18px]' : 'h-[24px] w-[24px]',
                  ].join(' ')}
                  style={{
                    transitionDelay: revealOutcome ? `${index * 90}ms` : '0ms',
                  }}
                />
              </>
            ) : null}
            {hasSuccess ? (
              <span
                className={[
                  'pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 bg-current transition-colors duration-300',
                  isThreshold
                    ? compact
                      ? 'bottom-[4px] h-[12px] w-[15px]'
                      : 'bottom-[5px] h-[15px] w-[19px]'
                    : compact
                      ? 'top-1/2 h-[12px] w-[15px] -translate-y-1/2'
                      : 'top-1/2 h-[15px] w-[19px] -translate-y-1/2',
                ].join(' ')}
                style={{
                  transitionDelay: revealOutcome ? `${index * 90}ms` : '0ms',
                  backgroundColor: getSuccessColor(index, successes),
                  mask: 'url(/party/success.svg) center / contain no-repeat',
                  WebkitMask:
                    'url(/party/success.svg) center / contain no-repeat',
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function TargetResultCard({
  target,
  max,
  thresholds,
  seat,
  density,
  onRollClick,
  canRoll,
  displayedSuccesses,
  revealOutcome,
}: {
  target: PartyCheckTarget;
  max: number;
  thresholds: number[];
  seat: ResolvedSeatPosition;
  density: DensityPreset;
  onRollClick: () => void;
  canRoll: boolean;
  displayedSuccesses: SuccessBreakdown;
  revealOutcome: 'success' | 'failure' | null;
}) {
  const t = useTranslations('Game');
  const visual = getSeatVisualConfig(seat.seatFacing, density);
  const forward = getForwardVector(seat.seatFacing);
  const totalRolls = getTotalRolls(target);
  const completedRolls = Math.min(target.roll.attempts.length, totalRolls);
  const partyCheckX =
    (visual.diceX + visual.tabletX) / 2 + forward.x * density.partyCheckForwardOffset;
  const partyCheckY =
    (visual.diceY + visual.tabletY) / 2 + forward.y * density.partyCheckForwardOffset;
  const partyCheckRotation = getPartyCheckRotation(seat.seatFacing);
  const displayedSuccessTotal = getSuccessTotal(displayedSuccesses);

  return (
    <>
      <div
        className="absolute"
        style={{
          left: `calc(50% + ${partyCheckX}px)`,
          top: `calc(50% + ${partyCheckY}px)`,
          transform: `translate(-50%, -50%) rotate(${partyCheckRotation}deg)`,
        }}
      >
        <div className="rounded-[14px] border border-white/15 bg-black/70 px-[10px] py-[8px] shadow-[0_12px_34px_rgba(0,0,0,0.35)] backdrop-blur">
          <ThresholdTrack
            max={max}
            thresholds={thresholds}
            successes={displayedSuccesses}
            compact
            revealOutcome={revealOutcome}
          />
          <p className="mt-[5px] text-center font-montserrat text-[10px] font-extrabold text-white">
            {t('successes', { count: displayedSuccessTotal })}
          </p>
          <p className="mt-[2px] text-center font-montserrat text-[9px] font-bold text-white/65">
            {t('rollProgress', { current: completedRolls, total: totalRolls })}
          </p>
        </div>
      </div>

      {canRoll ? (
        <button
          type="button"
          onClick={onRollClick}
          className="absolute rounded-full border border-[#D6B25E]/70 bg-[#D6B25E]/20"
          style={{
            width: density.diceWidth,
            height: density.diceHeight,
            left: `calc(50% + ${visual.diceX}px)`,
            top: `calc(50% + ${visual.diceY}px)`,
            transform: `translate(-50%, -50%) rotate(${visual.diceRotation}deg)`,
          }}
          aria-label={t('rollPartyDice')}
        />
      ) : null}

    </>
  );
}

function BonusControls({
  target,
  inspirationAvailable,
  onBonusChange,
  onResetBonuses,
}: {
  target: PartyCheckTarget;
  inspirationAvailable: number | null;
  onBonusChange: (
    type: 'inspiration' | 'freeBonus',
    direction: 1 | -1 | 'reset'
  ) => void;
  onResetBonuses: () => void;
}) {
  const t = useTranslations('Game');
  return (
    <div className="absolute right-[70px] top-[92px] z-30 flex items-start justify-end gap-[14px]">
      <button
        type="button"
        onClick={() => onBonusChange('inspiration', 1)}
        disabled={
          inspirationAvailable !== null &&
          target.roll.inspirationSuccesses >= inspirationAvailable
        }
        className="group flex w-[68px] flex-col items-center gap-[5px] font-montserrat text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span className="relative flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#D6B25E] shadow-lg transition-transform group-hover:scale-105">
          <Image src="/parameters/Inspirations.png" alt="" width={23} height={23} className="object-contain" />
          <span className="absolute -right-[5px] -top-[5px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-white px-[4px] text-[9px] text-black">
            {inspirationAvailable === null
              ? '–'
              : Math.max(0, inspirationAvailable - target.roll.inspirationSuccesses)}
          </span>
        </span>
        <span>{t('inspiration')}</span>
      </button>
      <button
        type="button"
        onClick={() => onBonusChange('freeBonus', 1)}
        className="group flex w-[68px] flex-col items-center gap-[5px] font-montserrat text-[10px] font-extrabold text-white"
      >
        <span className="relative flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white font-montserrat-alt text-[22px] text-black shadow-lg transition-transform group-hover:scale-105">
          +
          <span className="absolute -right-[5px] -top-[5px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#D6B25E] px-[4px] font-montserrat text-[9px] text-black">
            +{target.roll.freeBonusSuccesses}
          </span>
        </span>
        <span>{t('freeBonus')}</span>
      </button>
      <button
        type="button"
        onClick={onResetBonuses}
        className="group flex w-[54px] flex-col items-center gap-[5px] font-montserrat text-[10px] font-extrabold text-white"
      >
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-black/75 font-montserrat-alt text-[17px] text-white shadow-lg ring-1 ring-white/25 transition-transform group-hover:scale-105">
          &#8634;
        </span>
        <span>{t('reset')}</span>
      </button>
    </div>
  );
}

function RollOverlay({
  sessionId,
  target,
  onClose,
  onRoll,
}: {
  sessionId: string;
  target: PartyCheckTarget;
  onClose: () => void;
  onRoll: (
    attribute: PartyAttribute,
    diceCount: number
  ) => Promise<void>;
}) {
  const t = useTranslations('Game');
  const [attributes, setAttributes] = useState<PartyAttribute[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [manualDiceCount, setManualDiceCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAttributes() {
      setIsLoading(true);
      setError(null);

      try {
        const nextAttributes = target.inGameCharacterId
          ? await getPartyCharacterAttributes(target.inGameCharacterId)
          : await getPartyAttributeTemplates(sessionId);

        if (!isMounted) return;

        setAttributes(nextAttributes);
        setSelectedKey(nextAttributes[0]?.key ?? null);
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : t('attributesError')
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAttributes();

    return () => {
      isMounted = false;
    };
  }, [sessionId, t, target.inGameCharacterId]);

  const selectedAttribute =
    attributes.find((attribute) => attribute.key === selectedKey) ?? null;
  const diceCount = target.role === 'master'
    ? manualDiceCount
    : selectedAttribute?.value ?? 0;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-[460px] rounded-[26px] border border-white/15 bg-[#111A2D] p-[22px] shadow-2xl">
        <div className="mb-[16px] flex items-start justify-between gap-[16px]">
          <div>
            <p className="font-montserrat-alt text-[24px] font-extrabold text-white">
              {t('rollDice')}
            </p>
            <p className="mt-[4px] font-montserrat text-[14px] text-white/60">
              {target.displayName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 px-[12px] py-[7px] font-montserrat text-[12px] font-bold text-white"
          >
            {t('close')}
          </button>
        </div>

        {error ? (
          <div className="mb-[12px] rounded-[14px] border border-red-400/30 bg-red-500/10 px-[12px] py-[9px] font-montserrat text-[13px] text-red-200">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <p className="font-montserrat text-[14px] text-white/65">
            {t('loadingAttributes')}
          </p>
        ) : (
          <div className="space-y-[10px]">
            {attributes.map((attribute) => (
              <button
                key={attribute.id}
                type="button"
                onClick={() => setSelectedKey(attribute.key)}
                className={[
                  'flex w-full items-center justify-between rounded-[16px] border px-[14px] py-[11px] text-left',
                  selectedKey === attribute.key
                    ? 'border-[#D6B25E] bg-[#D6B25E]/12'
                    : 'border-white/12 bg-white/[0.04]',
                ].join(' ')}
              >
                <span className="flex min-w-0 items-center gap-[11px]">
                  {ATTRIBUTE_ICON_PATHS[attribute.key.toLowerCase()] ? (
                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/15">
                      <Image
                        src={ATTRIBUTE_ICON_PATHS[attribute.key.toLowerCase()]}
                        alt=""
                        width={22}
                        height={22}
                        className="object-contain"
                      />
                    </span>
                  ) : null}
                  <span className="truncate font-montserrat-alt text-[16px] font-extrabold text-white">
                    {attribute.label}
                  </span>
                </span>
                <span className="font-montserrat text-[13px] font-bold text-white/65">
                  {target.role === 'master' ? t('manual') : t('diceAmount', { count: attribute.value })}
                </span>
              </button>
            ))}
          </div>
        )}

        {target.role === 'master' ? (
          <div className="mt-[14px] flex items-center justify-between rounded-[16px] bg-white/5 px-[14px] py-[12px]">
            <span className="font-montserrat text-[13px] font-bold text-white/70">
              {t('diceCount')}
            </span>
            <input
              type="number"
              min={1}
              max={6}
              value={manualDiceCount}
              onChange={(event) =>
                setManualDiceCount(
                  Math.min(6, Math.max(1, Number(event.target.value)))
                )
              }
              className="w-[72px] rounded-[10px] bg-white px-[10px] py-[7px] text-center font-montserrat-alt text-[16px] font-extrabold text-black"
            />
          </div>
        ) : null}

        <button
          type="button"
          disabled={!selectedAttribute || !diceCount || isRolling}
          onClick={async () => {
            if (!selectedAttribute || !diceCount) return;
            setIsRolling(true);
            try {
              await onRoll(selectedAttribute, Math.min(6, Math.max(1, diceCount)));
              onClose();
            } finally {
              setIsRolling(false);
            }
          }}
          className="mt-[16px] w-full rounded-[16px] bg-[#D6B25E] px-[18px] py-[13px] font-montserrat text-[15px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRolling ? t('rolling') : t('rollDiceCount', { count: diceCount || 0 })}
        </button>
      </div>
    </div>
  );
}

export default function PartyCheckLayer({
  sessionId,
  check,
  currentParticipant,
  master,
  masterSeat,
  seatedPlayers,
  density,
  persistChanges = true,
  onCheckChange,
  onMessage,
}: PartyCheckLayerProps) {
  const t = useTranslations('Game');
  const [rollOverlay, setRollOverlay] = useState<RollOverlayState>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isDecisionSaving, setIsDecisionSaving] = useState(false);
  const [transientAttemptIds, setTransientAttemptIds] = useState<
    Record<string, string>
  >({});
  const [decisionReveal, setDecisionReveal] =
    useState<DecisionRevealState>(null);
  const [loadedInspiration, setLoadedInspiration] = useState<{
    characterId: string;
    value: number;
  } | null>(null);

  const currentTarget =
    check?.targets.find(
      (target) => target.participantId === currentParticipant.id
    ) ?? null;

  useEffect(() => {
    let isMounted = true;

    if (!currentTarget?.inGameCharacterId) return;

    void getPartyCharacterParameters(currentTarget.inGameCharacterId)
      .then((parameters) => {
        if (!isMounted) return;
        const inspiration = parameters.find((parameter) =>
          parameter.key.toLowerCase().includes('inspiration')
        );
        setLoadedInspiration({
          characterId: currentTarget.inGameCharacterId as string,
          value: inspiration?.currentValue ?? 0,
        });
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [currentTarget?.inGameCharacterId]);

  const inspirationAvailable =
    currentTarget?.inGameCharacterId &&
    loadedInspiration?.characterId === currentTarget.inGameCharacterId
      ? loadedInspiration.value
      : null;

  const seatByParticipantId = useMemo(() => {
    const map = new Map<string, ResolvedSeatPosition>();
    map.set(master.id, masterSeat);
    for (const seatedPlayer of seatedPlayers) {
      map.set(seatedPlayer.participant.id, seatedPlayer.seat);
    }
    return map;
  }, [master.id, masterSeat, seatedPlayers]);

  if (!check) return null;

  const updateCheck = async (nextCheck: PartyCheckState) => {
    onCheckChange(nextCheck);
    if (!persistChanges) {
      return;
    }

    const saved = await savePartyCheckState(nextCheck);
    onCheckChange(saved);
  };

  const updateTarget = async (
    participantId: string,
    updater: (target: PartyCheckTarget) => PartyCheckTarget
  ) => {
    await updateCheck({
      ...check,
      targets: check.targets.map((target) =>
        target.participantId === participantId ? updater(target) : target
      ),
    });
  };

  const handleRoll = async (
    target: PartyCheckTarget,
    attribute: PartyAttribute,
    diceCount: number
  ) => {
    const dice = rollPartyDice(diceCount);
    const attempt = {
      id: crypto.randomUUID(),
      diceCount,
      attributeKey: attribute.key,
      attributeLabel: attribute.label,
      dice,
      successes: getRollAttemptSuccesses(dice),
      rolledAt: Date.now(),
    };

    const nextTarget = {
      ...target,
      roll: {
        ...target.roll,
        attempts: [...target.roll.attempts, attempt],
      },
    };

    nextTarget.roll.selectedAttemptId = pickSelectedAttemptId(nextTarget);

    setTransientAttemptIds((current) => ({
      ...current,
      [target.participantId]: attempt.id,
    }));

    if (!isTargetComplete(nextTarget)) {
      window.setTimeout(() => {
        setTransientAttemptIds((current) => {
          if (current[target.participantId] !== attempt.id) {
            return current;
          }

          const next = { ...current };
          delete next[target.participantId];
          return next;
        });
      }, ROLL_FLASH_MS);
    }

    await updateTarget(target.participantId, () => nextTarget);
    onMessage({
      checkId: check.id,
      type: 'roll',
      participantId: target.participantId,
      displayName: target.displayName,
      text: t('messageRoll', { name: target.displayName, count: diceCount, attribute: attribute.label }),
    });
  };

  const handleBonusChange = async (
    target: PartyCheckTarget,
    type: 'inspiration' | 'freeBonus',
    direction: 1 | -1 | 'reset'
  ) => {
    if (
      type === 'inspiration' &&
      direction === 1 &&
      inspirationAvailable !== null &&
      target.roll.inspirationSuccesses >= inspirationAvailable
    ) {
      return;
    }

    await updateTarget(target.participantId, (currentTarget) => {
      const key =
        type === 'inspiration' ? 'inspirationSuccesses' : 'freeBonusSuccesses';
      const nextValue =
        direction === 'reset'
          ? 0
          : Math.max(0, currentTarget.roll[key] + direction);

      return {
        ...currentTarget,
        roll: {
          ...currentTarget.roll,
          [key]: nextValue,
        },
      };
    });

    if (direction === 'reset') {
      onMessage({
        checkId: check.id,
        type: type === 'inspiration' ? 'reset_inspiration' : 'reset_free_bonus',
        participantId: target.participantId,
        displayName: target.displayName,
        text: t('messageResetBonus', { name: target.displayName, bonus: type === 'inspiration' ? t('inspiration') : t('freeBonus') }),
      });
      return;
    }

    onMessage({
      checkId: check.id,
      type: type === 'inspiration' ? 'inspiration' : 'free_bonus',
      participantId: target.participantId,
      displayName: target.displayName,
      text: t('messageUseBonus', { name: target.displayName, bonus: type === 'inspiration' ? t('inspiration') : t('freeBonus') }),
    });
  };

  const handleResetBonuses = async (target: PartyCheckTarget) => {
    await updateTarget(target.participantId, (currentTarget) => ({
      ...currentTarget,
      roll: {
        ...currentTarget.roll,
        inspirationSuccesses: 0,
        freeBonusSuccesses: 0,
      },
    }));

    onMessage({
      checkId: check.id,
      type: 'reset_inspiration',
      participantId: target.participantId,
      displayName: target.displayName,
      text: t('messageResetAll', { name: target.displayName }),
    });
  };

  const executeDecision = async (nextConfirmation: ConfirmationState) => {
    if (!nextConfirmation) return;

    setIsDecisionSaving(true);
    setConfirmation(null);

    try {
      if (nextConfirmation.action !== 'reroll') {
        setDecisionReveal(nextConfirmation);
        await new Promise((resolve) =>
          window.setTimeout(resolve, DECISION_REVEAL_MS)
        );
      }

      if (nextConfirmation.action === 'accept') {
        const acceptedCheck = nextConfirmation.winnerParticipantId
          ? {
              ...check,
              tieWinnerParticipantId: nextConfirmation.winnerParticipantId,
            }
          : check;
        await acceptPartyCheck(acceptedCheck);
        onCheckChange(null);
        return;
      }

      if (nextConfirmation.action === 'reject') {
        await clearPartyCheck(check);
        onCheckChange(null);
        return;
      }

      const rerolledCheck: PartyCheckState = {
        ...check,
        tieWinnerParticipantId: null,
        targets: check.targets.map((target) => ({
          ...target,
          roll: buildEmptyRoll(),
        })),
      };
      await updateCheck(rerolledCheck);
    } finally {
      setIsDecisionSaving(false);
      setDecisionReveal(null);
    }
  };

  const requestDecision = (nextConfirmation: ConfirmationState) => {
    if (!nextConfirmation) return;

    if (isPartyConfirmationSuppressed()) {
      void executeDecision(nextConfirmation);
      return;
    }

    setDontShowAgain(false);
    setConfirmation(nextConfirmation);
  };

  const allTargetsComplete = check.targets.every(isTargetComplete);
  const hasCompletedResult = check.targets.some(isTargetComplete);
  const isMaster = currentParticipant.role === 'master';
  const groupSuccesses = check.targets.reduce<SuccessBreakdown>(
    (total, target) => {
      const successes = getDisplayedSuccesses(
        target,
        transientAttemptIds[target.participantId] ?? null
      );
      return {
        dice: total.dice + successes.dice,
        freeBonus: total.freeBonus + successes.freeBonus,
        inspiration: total.inspiration + successes.inspiration,
      };
    },
    { dice: 0, freeBonus: 0, inspiration: 0 }
  );
  const groupTotal = getSuccessTotal(groupSuccesses);
  const conflictScores =
    check.mode === 'conflict'
      ? check.targets.map((target) => ({
          participantId: target.participantId,
          displayName: target.displayName,
          successes: getFinalSuccesses(target),
        }))
      : [];
  const isConflictTie =
    conflictScores.length === 2 &&
    conflictScores[0].successes === conflictScores[1].successes &&
    allTargetsComplete;
  const canAdjustCurrentBonus =
    currentTarget !== null && isTargetComplete(currentTarget);

  const getTargetRevealOutcome = (target: PartyCheckTarget) => {
    if (!decisionReveal || decisionReveal.action === 'reroll') return null;

    if (decisionReveal.action === 'reject') {
      return 'failure';
    }

    if (check.mode === 'conflict') {
      const winnerParticipantId =
        decisionReveal.winnerParticipantId ??
        [...check.targets].sort(
          (a, b) => getFinalSuccesses(b) - getFinalSuccesses(a)
        )[0]?.participantId;

      return target.participantId === winnerParticipantId
        ? 'success'
        : 'failure';
    }

    if (check.mode === 'group') {
      return hasPassedThreshold(
        check.targets.reduce((total, item) => total + getFinalSuccesses(item), 0),
        check.groupThresholds
      )
        ? 'success'
        : 'failure';
    }

    return hasPassedThreshold(getFinalSuccesses(target), target.thresholds)
      ? 'success'
      : 'failure';
  };
  const groupRevealOutcome =
    decisionReveal && decisionReveal.action !== 'reroll' && check.mode === 'group'
      ? hasPassedThreshold(
          check.targets.reduce((total, target) => total + getFinalSuccesses(target), 0),
          check.groupThresholds
        )
        ? 'success'
        : 'failure'
      : null;

  return (
    <>
      {currentTarget && canAdjustCurrentBonus ? (
        <BonusControls
          target={currentTarget}
          inspirationAvailable={inspirationAvailable}
          onBonusChange={(type, direction) =>
            void handleBonusChange(currentTarget, type, direction)
          }
          onResetBonuses={() => void handleResetBonuses(currentTarget)}
        />
      ) : null}

      {check.targets.map((target) => {
        const seat = seatByParticipantId.get(target.participantId);
        if (!seat) return null;

        const isCurrentTarget =
          currentParticipant.id === target.participantId;
        const canRoll =
          isCurrentTarget &&
          target.roll.attempts.length < getTotalRolls(target);
        const displayedSuccesses = getDisplayedSuccesses(
          target,
          transientAttemptIds[target.participantId] ?? null
        );

        return (
          <div
            key={target.participantId}
            className="absolute"
            style={{
              left: `${seat.x}px`,
              top: `${seat.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative">
              <TargetResultCard
                target={target}
                max={check.mode === 'conflict' ? 6 : 6}
                thresholds={check.mode === 'individual' ? target.thresholds : []}
                seat={seat}
                density={density}
                onRollClick={() => setRollOverlay({ target })}
                canRoll={canRoll}
                displayedSuccesses={displayedSuccesses}
                revealOutcome={getTargetRevealOutcome(target)}
              />
            </div>
          </div>
        );
      })}

      {check.mode === 'group' ? (
        <div className="absolute bottom-[52px] right-[70px] rounded-[18px] border border-white/15 bg-black/75 px-[16px] py-[14px] shadow-2xl backdrop-blur">
          <p className="mb-[9px] font-montserrat-alt text-[17px] font-extrabold text-white">
            {t('groupTotal', { count: groupTotal })}
          </p>
          <ThresholdTrack
            max={12}
            thresholds={check.groupThresholds}
            successes={groupSuccesses}
            revealOutcome={groupRevealOutcome}
          />
        </div>
      ) : null}

      {isMaster && hasCompletedResult ? (
        <div className="absolute bottom-[120px] left-1/2 flex max-w-[560px] -translate-x-1/2 flex-wrap justify-center gap-[8px] rounded-[26px] border border-white/15 bg-black/75 p-[8px] shadow-2xl backdrop-blur">
          {isConflictTie ? (
            check.targets.map((target) => (
              <button
                key={target.participantId}
                type="button"
                onClick={() =>
                  requestDecision({
                    action: 'accept',
                    winnerParticipantId: target.participantId,
                  })
                }
                className="rounded-full bg-[#D6B25E] px-[14px] py-[9px] font-montserrat text-[12px] font-extrabold text-black"
              >
                {t('wins', { name: target.displayName })}
              </button>
            ))
          ) : (
            <button
              type="button"
              onClick={() => requestDecision({ action: 'accept' })}
              className="rounded-full bg-[#D6B25E] px-[18px] py-[9px] font-montserrat text-[13px] font-extrabold text-black"
            >
              {t('accept')}
            </button>
          )}
          <button
            type="button"
            onClick={() => requestDecision({ action: 'reject' })}
            className="rounded-full bg-white px-[18px] py-[9px] font-montserrat text-[13px] font-extrabold text-black"
          >
            {t('reject')}
          </button>
          <button
            type="button"
            onClick={() => requestDecision({ action: 'reroll' })}
            className="rounded-full bg-white/15 px-[18px] py-[9px] font-montserrat text-[13px] font-extrabold text-white"
          >
            {t('reroll')}
          </button>
        </div>
      ) : null}

      {rollOverlay ? (
        <RollOverlay
          sessionId={sessionId}
          target={rollOverlay.target}
          onClose={() => setRollOverlay(null)}
          onRoll={(attribute, diceCount) =>
            handleRoll(rollOverlay.target, attribute, diceCount)
          }
        />
      ) : null}

      {confirmation ? (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-[420px] rounded-[24px] border border-white/15 bg-[#111A2D] p-[22px] shadow-2xl">
            <p className="font-montserrat-alt text-[22px] font-extrabold text-white">
              {t('confirmAction')}
            </p>
            <p className="mt-[8px] font-montserrat text-[14px] text-white/65">
              {t('confirmDecision', { action: confirmation.action === 'accept' ? t('actions.accept') : confirmation.action === 'reject' ? t('actions.reject') : t('actions.reroll') })}
            </p>
            <label className="mt-[16px] flex items-center gap-[10px] font-montserrat text-[13px] font-bold text-white/70">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(event) => setDontShowAgain(event.target.checked)}
              />
              {t('dontShowAgain')}
            </label>
            <div className="mt-[18px] flex justify-end gap-[10px]">
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                className="rounded-full bg-white/10 px-[16px] py-[9px] font-montserrat text-[13px] font-extrabold text-white"
              >
                {t('no')}
              </button>
              <button
                type="button"
                disabled={isDecisionSaving}
                onClick={() => {
                  if (dontShowAgain) {
                    setPartyConfirmationSuppressed(true);
                  }
                  void executeDecision(confirmation);
                }}
                className="rounded-full bg-[#D6B25E] px-[16px] py-[9px] font-montserrat text-[13px] font-extrabold text-black disabled:opacity-50"
              >
                {isDecisionSaving ? t('saving') : t('yes')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
