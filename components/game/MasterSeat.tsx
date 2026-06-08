import { getSeatVisualConfig } from '@/lib/game/getSeatVisualConfig';
import {
  DensityPreset,
  GameParticipant,
  HoverCardData,
  ResolvedSeatPosition,
} from '@/lib/game/types';
import Image from 'next/image';

type MasterSeatProps = {
  participant: GameParticipant;
  seat: ResolvedSeatPosition;
  density: DensityPreset;
  onHoverChange?: (data: HoverCardData | null) => void;
};

export default function MasterSeat({
  participant,
  seat,
  density,
  onHoverChange,
}: MasterSeatProps) {
  const visual = getSeatVisualConfig(seat.seatFacing, density);
  const avatarSize = density.avatarSize + 10;

  return (
    <div
      className="absolute"
      style={{
        left: `${seat.x}px`,
        top: `${seat.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="relative">
        <div
          className="rounded-full border-4 border-[#D6B25E] bg-[#D9D9D9] shadow-[0_0_20px_rgba(214,178,94,0.18)]"
          style={{
            width: avatarSize,
            height: avatarSize,
            opacity: participant.connectionStatus === 'offline' ? 0.45 : 1,
          }}
          onMouseEnter={() =>
            onHoverChange?.({
              participant,
              seat,
              avatarSize,
              badgeSide: visual.badgeSide,
            })
          }
          onMouseLeave={() => onHoverChange?.(null)}
        />

        <div
          className="absolute"
          style={{
            width: density.diceWidth,
            height: density.diceHeight,
            left: `calc(50% + ${visual.diceX}px)`,
            top: `calc(50% + ${visual.diceY}px)`,
            transform: `translate(-50%, -50%) rotate(${visual.diceRotation}deg)`,
          }}
        >
          <Image
            src="/dice-table.png"
            alt="Dice"
            fill
            className="pointer-events-none select-none object-contain"
            sizes={`${density.diceWidth}px`}
          />
        </div>

        <div
          className="absolute rounded-[999px] bg-black/90"
          style={{
            width: density.tabletWidth,
            height: density.tabletHeight,
            left: `calc(50% + ${visual.tabletX}px)`,
            top: `calc(50% + ${visual.tabletY}px)`,
            transform: `translate(-50%, -50%) rotate(${visual.tabletRotation}deg)`,
          }}
        />
      </div>
    </div>
  );
}