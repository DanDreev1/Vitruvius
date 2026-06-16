'use client';

import type { SceneAudienceParticipant } from '@/features/tablet/master/scene/types';

type SceneAudiencePanelProps = {
  participants: SceneAudienceParticipant[];
  activeAudienceId?: string;
  onAudienceSelect?: (participantId: string) => void;
};

function getRoleLabel(role: SceneAudienceParticipant['role']) {
  return role === 'master' ? 'Master' : 'Player';
}

export default function SceneAudiencePanel({
  participants,
  activeAudienceId,
  onAudienceSelect,
}: SceneAudiencePanelProps) {
  return (
    <div className="flex h-full flex-col gap-[18px]">
      {participants.map((participant) => {
        const isActive = activeAudienceId === participant.id;

        return (
          <button
            key={participant.id}
            type="button"
            onClick={() => onAudienceSelect?.(participant.id)}
            className={[
              'flex min-h-[72px] w-full items-center gap-[18px] rounded-[22px] border border-white px-[18px] py-[12px] text-left transition-all duration-200',
              isActive ? 'bg-white/10' : 'bg-transparent hover:bg-white/5',
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

              {!participant.isAll ? (
                <div className="absolute -bottom-[2px] -right-[2px] flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#D9D9D9] text-[10px] text-black">
                  ✎
                </div>
              ) : null}
            </div>

            <div className="min-w-0">
              <p className="truncate font-montserrat-alt text-[18px] font-extrabold text-white">
                {participant.displayName}
              </p>
              <p className="font-montserrat text-[14px] text-white/85">
                Role: {getRoleLabel(participant.role)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}