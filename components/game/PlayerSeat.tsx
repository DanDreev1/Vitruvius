import { getSeatVisualConfig } from "@/lib/game/getSeatVisualConfig";
import { DensityPreset, HoverCardData, SeatedPlayer } from "@/lib/game/types";
import ParticipantAvatar from "./ParticipantAvatar";
import OfflinePill from "./OfflinePill";
import Image from "next/image";

type PlayerSeatProps = {
  seatedPlayer: SeatedPlayer;
  density: DensityPreset;
  onHoverChange?: (data: HoverCardData | null) => void;
  onTabletClick?: (targetUserId: string) => void;
};

export default function PlayerSeat({
  seatedPlayer,
  density,
  onHoverChange,
  onTabletClick,
}: PlayerSeatProps) {
  const { participant, seat } = seatedPlayer;
  const visual = getSeatVisualConfig(seat.seatFacing, density);

  return (
    <div
      className="absolute"
      style={{
        left: `${seat.x}px`,
        top: `${seat.y}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="relative">
        <div
          onMouseEnter={() =>
            onHoverChange?.({
              participant,
              seat,
              avatarSize: density.avatarSize,
              badgeSide: visual.badgeSide,
            })
          }
          onMouseLeave={() => onHoverChange?.(null)}
        >
          <ParticipantAvatar
            avatarUrl={participant.avatarUrl}
            displayName={participant.displayName}
            size={density.avatarSize}
            isOffline={participant.connectionStatus === "offline"}
          />
        </div>

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

        <button
          type="button"
          onClick={() => onTabletClick?.(participant.userId)}
          className="absolute rounded-[999px] bg-black/90"
          style={{
            width: density.tabletWidth,
            height: density.tabletHeight,
            left: `calc(50% + ${visual.tabletX}px)`,
            top: `calc(50% + ${visual.tabletY}px)`,
            transform: `translate(-50%, -50%) rotate(${visual.tabletRotation}deg)`,
          }}
        />

        {participant.connectionStatus === "offline" ? (
          <OfflinePill fontSize={Math.max(10, density.badgeFontSize - 3)} />
        ) : null}
      </div>
    </div>
  );
}
