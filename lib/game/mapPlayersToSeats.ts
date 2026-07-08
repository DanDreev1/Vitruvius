import { getAnchoredSeatPosition } from './getAnchoredSeatPosition';
import type { GameParticipant, SceneLayout, SeatedPlayer } from './types';

export function mapPlayersToSeats(
  players: GameParticipant[],
  layout: SceneLayout
): SeatedPlayer[] {
  const sortedPlayers = [...players].sort(
    (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  );

  return sortedPlayers.map((participant, index) => {
    const anchoredSeat = layout.playerSeats[index];
    const resolvedSeat = getAnchoredSeatPosition(layout.table, anchoredSeat);

    return {
      participant,
      seat: {
        id: anchoredSeat.id,
        ...resolvedSeat,
      },
    };
  });
}