import { GAME_SCENE_HEIGHT, GAME_SCENE_WIDTH } from "@/lib/game/sceneConfig";
import type {
  DensityPreset,
  GameParticipant,
  HoverCardData,
  ResolvedSeatPosition,
  SeatedPlayer,
  TableDefinition,
} from "@/lib/game/types";

import MasterSeat from "./MasterSeat";
import PlayerSeat from "./PlayerSeat";

type GameSceneProps = {
  table: TableDefinition;
  density: DensityPreset;
  master: GameParticipant;
  masterSeat: ResolvedSeatPosition;
  seatedPlayers: SeatedPlayer[];
  onHoverChange?: (data: HoverCardData | null) => void;
  onTabletClick?: (targetUserId: string) => void;
};

export default function GameScene({
  table,
  density,
  master,
  masterSeat,
  seatedPlayers,
  onHoverChange,
  onTabletClick,
}: GameSceneProps) {
  return (
    <div
      className="relative"
      style={{
        width: `${GAME_SCENE_WIDTH}px`,
        height: `${GAME_SCENE_HEIGHT}px`,
      }}
    >
      <div
        className="absolute left-1/2 top-1/2 rounded-[999px] border border-white/10 bg-[#6B6B6B]"
        style={{
          width: `${table.width}px`,
          height: `${table.height}px`,
          transform: "translate(-50%, -50%)",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.35)",
        }}
      />

      <MasterSeat
        participant={master}
        seat={masterSeat}
        density={density}
        onHoverChange={onHoverChange}
        onTabletClick={onTabletClick}
      />

      {seatedPlayers.map((item) => (
        <PlayerSeat
          key={item.participant.id}
          seatedPlayer={item}
          density={density}
          onHoverChange={onHoverChange}
          onTabletClick={onTabletClick}
        />
      ))}
    </div>
  );
}
