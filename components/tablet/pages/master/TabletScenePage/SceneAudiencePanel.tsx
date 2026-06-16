'use client';

import type { SceneAudienceTarget } from '@/features/tablet/master/scene/types';

type SceneAudiencePanelProps = {
  participants: SceneAudienceTarget[];
  selectedCharacterIds: string[];
  disabled?: boolean;
  onToggleAll: () => void;
  onToggleParticipant: (inGameCharacterId: string) => void;
};

export default function SceneAudiencePanel({
  participants,
  selectedCharacterIds,
  disabled = false,
  onToggleAll,
  onToggleParticipant,
}: SceneAudiencePanelProps) {
  const isAllSelected =
    participants.length > 0 &&
    participants.every((participant) =>
      selectedCharacterIds.includes(participant.inGameCharacterId)
    );

  return (
    <div className="flex h-full flex-col gap-[18px]">
      <button
        type="button"
        onClick={onToggleAll}
        disabled={disabled}
        className={[
          'flex min-h-[72px] w-full items-center gap-[18px] rounded-[22px] border border-white px-[18px] py-[12px] text-left transition-all duration-200',
          disabled
            ? 'cursor-not-allowed bg-transparent opacity-45'
            : isAllSelected
              ? 'bg-white/10'
              : 'bg-transparent hover:bg-white/5',
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
            All
          </p>
          <p className="font-montserrat text-[14px] text-white/85">
            Role: Player
          </p>
        </div>
      </button>

      {participants.map((participant) => {
        const isSelected = selectedCharacterIds.includes(participant.inGameCharacterId);

        return (
          <button
            key={participant.inGameCharacterId}
            type="button"
            onClick={() => onToggleParticipant(participant.inGameCharacterId)}
            disabled={disabled}
            className={[
              'flex min-h-[72px] w-full items-center gap-[18px] rounded-[22px] border border-white px-[18px] py-[12px] text-left transition-all duration-200',
              disabled
                ? 'cursor-not-allowed bg-transparent opacity-45'
                : isSelected
                  ? 'bg-white/10'
                  : 'bg-transparent hover:bg-white/5',
            ].join(' ')}
          >
            <div className="relative shrink-0">
              <div className="h-[48px] w-[48px] overflow-hidden rounded-full bg-white/40">
                {participant.avatarUrl ? (
                  <img
                    src={participant.avatarUrl}
                    alt={participant.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              {isSelected ? (
                <div className="absolute -bottom-[2px] -right-[2px] flex h-[20px] w-[20px] items-center justify-center rounded-full bg-white text-[11px] font-bold text-black">
                  ✓
                </div>
              ) : null}
            </div>

            <div className="min-w-0">
              <p className="truncate font-montserrat-alt text-[18px] font-extrabold text-white">
                {participant.displayName}
              </p>
              <p className="font-montserrat text-[14px] text-white/85">
                Role: Player
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}