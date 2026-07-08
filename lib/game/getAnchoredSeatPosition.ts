import {
  GAME_SCENE_HEIGHT,
  GAME_SCENE_WIDTH,
} from './sceneConfig';
import type {
  AnchoredSeatPosition,
  ResolvedSeatPosition,
  TableDefinition,
} from './types';

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function getAnchoredSeatPosition(
  table: TableDefinition,
  anchor: AnchoredSeatPosition
): ResolvedSeatPosition {
  const along = clamp01(anchor.along);

  const tableLeft = GAME_SCENE_WIDTH / 2 - table.width / 2;
  const tableRight = GAME_SCENE_WIDTH / 2 + table.width / 2;
  const tableTop = GAME_SCENE_HEIGHT / 2 - table.height / 2;
  const tableBottom = GAME_SCENE_HEIGHT / 2 + table.height / 2;

  const referenceDistance = Math.min(table.width, table.height);
  const gapPx = anchor.gap * referenceDistance;

  switch (anchor.side) {
    case 'top':
      return {
        x: tableLeft + along * table.width,
        y: tableTop - gapPx,
        seatFacing: anchor.seatFacing,
      };

    case 'bottom':
      return {
        x: tableLeft + along * table.width,
        y: tableBottom + gapPx,
        seatFacing: anchor.seatFacing,
      };

    case 'left':
      return {
        x: tableLeft - gapPx,
        y: tableTop + along * table.height,
        seatFacing: anchor.seatFacing,
      };

    case 'right':
      return {
        x: tableRight + gapPx,
        y: tableTop + along * table.height,
        seatFacing: anchor.seatFacing,
      };

    default:
      return {
        x: tableLeft + along * table.width,
        y: tableTop - gapPx,
        seatFacing: anchor.seatFacing,
      };
  }
}