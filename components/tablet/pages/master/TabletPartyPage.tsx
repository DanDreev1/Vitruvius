'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { translateSystemLabel } from '@/components/tablet/systemLabels';
import type { PartyCheckMode } from '@/features/tablet/master/party/types';
import { usePartyMaster } from '@/features/tablet/master/party/usePartyMaster';

import { Panel } from '../shared/TabletPagePrimitives';

type TabletPartyPageProps = {
  sessionId: string;
  inGameWorldId: string | null;
  onClose?: () => void;
};

const modeOptions: PartyCheckMode[] = ['individual', 'group', 'conflict'];

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function ThresholdPicker({
  max,
  values,
  addLabel,
  removeLabel,
  titleLabel,
  onChange,
}: {
  max: number;
  values: number[];
  addLabel: (value: number) => string;
  removeLabel: (value: number) => string;
  titleLabel: (value: number) => string;
  onChange: (values: number[]) => void;
}) {
  return (
    <div className="grid grid-cols-6 justify-items-center gap-[10px] pt-[18px]">
      {Array.from({ length: max }).map((_, index) => {
        const value = index + 1;
        const isSelected = values.includes(value);

        return (
          <button
            key={value}
            type="button"
            aria-label={isSelected ? removeLabel(value) : addLabel(value)}
            title={titleLabel(value)}
            onClick={() => {
              onChange(
                isSelected
                  ? values.filter((item) => item !== value)
                  : [...values, value]
              );
            }}
            className={[
              'relative flex aspect-square w-full max-w-[44px] items-center justify-center rounded-[10px] border transition duration-200',
              isSelected
                ? 'border-transparent bg-transparent text-[#D6B25E]'
                : 'border-white/55 bg-transparent text-white/75 hover:border-white hover:bg-white/5',
            ].join(' ')}
          >
            {isSelected ? (
              <span
                aria-hidden="true"
                className="absolute bottom-0 h-[60px] w-[41px] bg-current"
                style={{
                  WebkitMaskImage: "url('/party/lock.svg')",
                  maskImage: "url('/party/lock.svg')",
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({
  label,
  value,
  max,
  disabledIncrement = false,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  disabledIncrement?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-[10px] rounded-[14px] bg-white/5 px-[12px] py-[9px]">
      <span className="font-montserrat text-[12px] font-bold text-white/70">
        {label}
      </span>
      <div className="flex items-center gap-[8px]">
        <button
          type="button"
          onClick={() => onChange(clampNumber(value - 1, 0, max))}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white text-black"
        >
          -
        </button>
        <span className="w-[18px] text-center font-montserrat-alt text-[16px] font-extrabold text-white">
          {value}
        </span>
        <button
          type="button"
          disabled={disabledIncrement}
          onClick={() => onChange(clampNumber(value + 1, 0, max))}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white text-black disabled:cursor-not-allowed disabled:opacity-35"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function TabletPartyPage({
  sessionId,
  inGameWorldId,
  onClose,
}: TabletPartyPageProps) {
  const t = useTranslations('TabletMaster.party');
  const common = useTranslations('TabletMaster.common');
  const systemLabels = useTranslations('TabletMaster.systemLabels');
  const party = usePartyMaster({ sessionId, inGameWorldId });

  const hasParameterChanges = useMemo(
    () =>
      party.parameters.some(
        (parameter) =>
          party.parameterDrafts[parameter.id] !== parameter.currentValue
      ),
    [party.parameterDrafts, party.parameters]
  );

  const selectedCount = party.selectedParticipantIds.length;
  const isAllSelected =
    party.audience.length > 0 &&
    party.audience.every((target) =>
      party.selectedParticipantIds.includes(target.participantId)
    );
  const thresholdLabels = {
    addLabel: (value: number) => t('threshold.add', { value }),
    removeLabel: (value: number) => t('threshold.remove', { value }),
    titleLabel: (value: number) => t('threshold.title', { value }),
  };

  return (
    <div className="flex h-full flex-col">
      {party.error ? (
        <div className="mb-[12px] rounded-[16px] border border-red-400/30 bg-red-500/10 px-[14px] py-[10px] font-montserrat text-[14px] text-red-200">
          {party.error}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px] gap-[18px]">
        <div className="grid min-h-0 grid-rows-[auto_1fr] gap-[18px]">
          <Panel className="space-y-[14px]">
            <div className="flex items-center justify-between gap-[12px]">
              <div>
                <p className="font-montserrat-alt text-[20px] font-extrabold text-white">
                  {t('statusTitle')}
                </p>
                <p className="mt-[3px] font-montserrat text-[13px] text-white/60">
                  {t('statusSubtitle')}
                </p>
              </div>

              <button
                type="button"
                onClick={party.saveParameters}
                disabled={!hasParameterChanges || party.isSavingParameters}
                className="rounded-[14px] bg-white px-[18px] py-[10px] font-montserrat text-[14px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {party.isSavingParameters ? common('saving') : common('save')}
              </button>
            </div>

            {!party.editableTarget ? (
              <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-[16px] py-[18px] font-montserrat text-[14px] text-white/60">
                {t('statusUnavailable')}
              </div>
            ) : party.isLoadingParameters ? (
              <div className="rounded-[18px] bg-white/[0.03] px-[16px] py-[18px] font-montserrat text-[14px] text-white/60">
                {t('loadingParameters')}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-[12px]">
                {party.parameters.map((parameter) => {
                  const draftValue =
                    party.parameterDrafts[parameter.id] ?? parameter.currentValue;
                  const maxValue = parameter.maxValue ?? 20;

                  return (
                    <div
                      key={parameter.id}
                      className="rounded-[18px] border border-white/10 bg-[#243047] px-[14px] py-[12px]"
                    >
                      <p className="truncate font-montserrat text-[12px] font-bold uppercase text-white/55">
                        {translateSystemLabel('parameters', parameter.key, parameter.label, systemLabels)}
                      </p>
                      <div className="mt-[10px] flex items-center justify-between gap-[8px]">
                        <button
                          type="button"
                          onClick={() =>
                            party.updateParameterDraft(
                              parameter.id,
                              clampNumber(draftValue - 1, 0, maxValue)
                            )
                          }
                          className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-white text-black"
                        >
                          -
                        </button>
                        <span className="font-montserrat-alt text-[24px] font-extrabold text-white">
                          {draftValue}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            party.updateParameterDraft(
                              parameter.id,
                              clampNumber(draftValue + 1, 0, maxValue)
                            )
                          }
                          className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-white text-black"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel className="min-h-0 overflow-y-auto">
            <div className="mb-[14px] flex items-center justify-between gap-[12px]">
              <div>
                <p className="font-montserrat-alt text-[20px] font-extrabold text-white">
                  {t('difficultyTitle')}
                </p>
                <p className="mt-[3px] font-montserrat text-[13px] text-white/60">
                  {t('difficultySubtitle')}
                </p>
              </div>
              <div className="flex rounded-full bg-white/10 p-[4px]">
                {modeOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => party.setMode(option)}
                    className={[
                      'rounded-full px-[13px] py-[8px] font-montserrat text-[12px] font-extrabold transition',
                      party.mode === option
                        ? 'bg-white text-black'
                        : 'text-white/65 hover:text-white',
                    ].join(' ')}
                  >
                    {t(`modes.${option}`)}
                  </button>
                ))}
              </div>
            </div>

            {party.activeCheck ? (
              <div className="flex items-center justify-between gap-[12px] rounded-[18px] border border-[#D6B25E]/35 bg-[#D6B25E]/10 px-[16px] py-[14px]">
                <p className="font-montserrat text-[14px] text-[#F4D982]">
                  {t('activeCheck')}
                </p>
                <button
                  type="button"
                  onClick={party.cancelActiveCheck}
                  disabled={party.isCancellingCheck}
                  className="shrink-0 rounded-full bg-white px-[12px] py-[7px] font-montserrat text-[12px] font-extrabold text-black disabled:opacity-50"
                >
                  {party.isCancellingCheck ? t('cancelling') : common('cancel')}
                </button>
              </div>
            ) : null}

            <div className="mt-[14px] space-y-[14px]">
              {party.mode === 'group' ? (
                <div className="rounded-[18px] border border-white/10 bg-[#243047] p-[14px]">
                  <p className="mb-[10px] font-montserrat text-[13px] font-bold text-white/70">
                    {t('groupThresholds')}
                  </p>
                  <ThresholdPicker
                    max={12}
                    values={party.groupThresholds}
                    {...thresholdLabels}
                    onChange={party.updateGroupThresholds}
                  />
                </div>
              ) : null}

              {party.selectedTargets.map((target) => {
                const draft = party.targetDrafts[target.participantId];

                if (!draft) return null;

                return (
                  <div
                    key={target.participantId}
                    className="rounded-[18px] border border-white/10 bg-[#243047] p-[14px]"
                  >
                    <div className="mb-[12px] flex items-center justify-between gap-[12px]">
                      <div>
                        <p className="font-montserrat-alt text-[17px] font-extrabold text-white">
                          {target.displayName}
                        </p>
                        <p className="font-montserrat text-[12px] text-white/50">
                          {target.role === 'master' ? common('master') : common('player')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => party.toggleTarget(target.participantId)}
                        className="rounded-full bg-white/10 px-[12px] py-[7px] font-montserrat text-[12px] font-bold text-white"
                      >
                        {t('remove')}
                      </button>
                    </div>

                    {party.mode !== 'group' && party.mode !== 'conflict' ? (
                      <div className="mb-[12px]">
                        <p className="mb-[8px] font-montserrat text-[12px] font-bold text-white/65">
                          {t('thresholds')}
                        </p>
                        <ThresholdPicker
                          max={6}
                          values={draft.thresholds}
                          {...thresholdLabels}
                          onChange={(values) =>
                            party.updateTargetThresholds(
                              target.participantId,
                              values
                            )
                          }
                        />
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-[10px]">
                      <Stepper
                        label={t('advantage')}
                        value={draft.advantage}
                        max={2}
                        disabledIncrement={draft.disadvantage > 0}
                        onChange={(value) =>
                          party.updateTargetModifier(
                            target.participantId,
                            'advantage',
                            value
                          )
                        }
                      />
                      <Stepper
                        label={t('disadvantage')}
                        value={draft.disadvantage}
                        max={2}
                        disabledIncrement={draft.advantage > 0}
                        onChange={(value) =>
                          party.updateTargetModifier(
                            target.participantId,
                            'disadvantage',
                            value
                          )
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedCount ? (
              <button
                type="button"
                onClick={async () => {
                  const wasCreated = await party.createCheck();
                  if (wasCreated) {
                    onClose?.();
                  }
                }}
                disabled={Boolean(party.activeCheck) || party.isCreatingCheck}
                className="mt-[16px] w-full rounded-[16px] bg-[#D6B25E] px-[18px] py-[13px] font-montserrat text-[15px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {party.isCreatingCheck ? t('creating') : t('sendCheck')}
              </button>
            ) : (
              <p className="mt-[16px] rounded-[16px] border border-white/10 bg-white/[0.03] px-[18px] py-[13px] text-center font-montserrat text-[13px] font-bold text-white/55">
                {t('selectUserFirst')}
              </p>
            )}
          </Panel>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="mb-[18px]">
            <div>
              <p className="font-montserrat-alt text-[20px] font-extrabold text-white">
                {t('targets')}
              </p>
              <p className="font-montserrat text-[13px] text-white/55">
                {common('selected', { count: selectedCount })}
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-[18px] overflow-y-auto pr-[4px]">
            {party.isLoadingAudience ? (
              <p className="font-montserrat text-[14px] text-white/60">
                {t('loadingTargets')}
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    isAllSelected ? party.clearTargets() : party.selectAllPlayers()
                  }
                  className={[
                    'flex min-h-[72px] w-full items-center gap-[18px] rounded-[22px] border border-white px-[18px] py-[12px] text-left transition-all duration-200',
                    isAllSelected ? 'bg-white/10' : 'bg-transparent hover:bg-white/5',
                  ].join(' ')}
                >
                  <div className="relative shrink-0">
                    <div className="h-[48px] w-[48px] rounded-full bg-white/40" />
                    {isAllSelected ? (
                      <div className="absolute -bottom-[2px] -right-[2px] flex h-[20px] w-[20px] items-center justify-center rounded-full bg-white text-[11px] font-bold text-black">
                        ✓
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-montserrat-alt text-[18px] font-extrabold text-white">
                      {common('all')}
                    </p>
                    <p className="font-montserrat text-[14px] text-white/85">
                      {common('role', { role: common('party') })}
                    </p>
                  </div>
                </button>

                {party.audience.map((target) => {
                  const isSelected = party.selectedParticipantIds.includes(
                    target.participantId
                  );

                  return (
                    <button
                      key={target.participantId}
                      type="button"
                      onClick={() => party.toggleTarget(target.participantId)}
                      className={[
                        'flex min-h-[72px] w-full items-center gap-[18px] rounded-[22px] border border-white px-[18px] py-[12px] text-left transition-all duration-200',
                        isSelected ? 'bg-white/10' : 'bg-transparent hover:bg-white/5',
                      ].join(' ')}
                    >
                      <div className="relative shrink-0">
                        <div
                          className="flex h-[48px] w-[48px] items-center justify-center overflow-hidden rounded-full bg-white/40 bg-cover bg-center font-montserrat-alt text-[16px] font-extrabold text-black"
                          style={{
                            backgroundImage: `url(${target.avatarUrl ?? '/avatar-placeholder.png'})`,
                          }}
                        />

                        {isSelected ? (
                          <div className="absolute -bottom-[2px] -right-[2px] flex h-[20px] w-[20px] items-center justify-center rounded-full bg-white text-[11px] font-bold text-black">
                            ✓
                          </div>
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-montserrat-alt text-[18px] font-extrabold text-white">
                          {target.displayName}
                        </p>
                        <p className="font-montserrat text-[14px] text-white/85">
                          {common('role', { role: target.role === 'master' ? common('master') : common('player') })}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
