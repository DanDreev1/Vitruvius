import {
  GAME_SCENE_HEIGHT,
  GAME_SCENE_WIDTH,
} from './sceneConfig';
import { getSeatVisualConfig } from './getSeatVisualConfig';
import type {
  DensityPreset,
  ResolvedSeatPosition,
  SceneBounds,
  SeatedPlayer,
  TableDefinition,
} from './types';

type BoundsAccumulator = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function createBoundsAccumulator(): BoundsAccumulator {
  return {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
}

function mergeBounds(acc: BoundsAccumulator, bounds: BoundsAccumulator) {
  acc.minX = Math.min(acc.minX, bounds.minX);
  acc.minY = Math.min(acc.minY, bounds.minY);
  acc.maxX = Math.max(acc.maxX, bounds.maxX);
  acc.maxY = Math.max(acc.maxY, bounds.maxY);
}

function createRectBounds(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotation = 0
): BoundsAccumulator {
  const normalizedRotation = Math.abs(rotation) % 180;
  const isQuarterTurn = normalizedRotation === 90;

  const actualWidth = isQuarterTurn ? height : width;
  const actualHeight = isQuarterTurn ? width : height;

  return {
    minX: centerX - actualWidth / 2,
    maxX: centerX + actualWidth / 2,
    minY: centerY - actualHeight / 2,
    maxY: centerY + actualHeight / 2,
  };
}

function finalizeBounds(acc: BoundsAccumulator): SceneBounds {
  const width = acc.maxX - acc.minX;
  const height = acc.maxY - acc.minY;

  return {
    minX: acc.minX,
    minY: acc.minY,
    maxX: acc.maxX,
    maxY: acc.maxY,
    width,
    height,
    centerX: acc.minX + width / 2,
    centerY: acc.minY + height / 2,
  };
}

function getTableBounds(table: TableDefinition): BoundsAccumulator {
  const tableCenterX = GAME_SCENE_WIDTH / 2;
  const tableCenterY = GAME_SCENE_HEIGHT / 2;

  return createRectBounds(tableCenterX, tableCenterY, table.width, table.height);
}

function getSeatBounds(
  seat: ResolvedSeatPosition,
  density: DensityPreset,
  isMaster = false
): BoundsAccumulator {
  const bounds = createBoundsAccumulator();
  const visual = getSeatVisualConfig(seat.seatFacing, density);

  const avatarSize = isMaster ? density.avatarSize + 10 : density.avatarSize;

  mergeBounds(bounds, createRectBounds(seat.x, seat.y, avatarSize, avatarSize));

  mergeBounds(
    bounds,
    createRectBounds(
      seat.x + visual.diceX,
      seat.y + visual.diceY,
      density.diceWidth,
      density.diceHeight,
      visual.diceRotation
    )
  );

  mergeBounds(
    bounds,
    createRectBounds(
      seat.x + visual.tabletX,
      seat.y + visual.tabletY,
      density.tabletWidth,
      density.tabletHeight,
      visual.tabletRotation
    )
  );

  mergeBounds(
    bounds,
    createRectBounds(
      seat.x,
      seat.y + density.badgeDistance * 0.45,
      avatarSize,
      28
    )
  );

  return bounds;
}

type GetSceneBoundsParams = {
  table: TableDefinition;
  density: DensityPreset;
  masterSeat: ResolvedSeatPosition;
  seatedPlayers: SeatedPlayer[];
};

export function getSceneBounds({
  table,
  density,
  masterSeat,
  seatedPlayers,
}: GetSceneBoundsParams): SceneBounds {
  const bounds = createBoundsAccumulator();

  mergeBounds(bounds, getTableBounds(table));
  mergeBounds(bounds, getSeatBounds(masterSeat, density, true));

  for (const seatedPlayer of seatedPlayers) {
    mergeBounds(bounds, getSeatBounds(seatedPlayer.seat, density, false));
  }

  return finalizeBounds(bounds);
}