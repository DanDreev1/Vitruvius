import {
  BadgeSide,
  DensityPreset,
  SeatFacing,
  SeatVisualConfig,
} from './types';

type Vector2 = {
  x: number;
  y: number;
};

function getFacingRotation(seatFacing: SeatFacing): number {
  const rotationMap: Record<SeatFacing, number> = {
    up: 0,
    right: -90,
    down: 180,
    left: 90,
  };

  return rotationMap[seatFacing];
}

function getForwardVector(seatFacing: SeatFacing): Vector2 {
  const forwardMap: Record<SeatFacing, Vector2> = {
    up: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
  };

  return forwardMap[seatFacing];
}

function getRightVector(seatFacing: SeatFacing): Vector2 {
  const rightMap: Record<SeatFacing, Vector2> = {
    up: { x: 1, y: 0 },
    right: { x: 0, y: 1 },
    down: { x: -1, y: 0 },
    left: { x: 0, y: -1 },
  };

  return rightMap[seatFacing];
}

function getBadgeSide(seatFacing: SeatFacing): BadgeSide {
  const badgeSideMap: Record<SeatFacing, BadgeSide> = {
    up: 'top',
    right: 'right',
    down: 'bottom',
    left: 'left',
  };

  return badgeSideMap[seatFacing];
}

function buildOffset(
  seatFacing: SeatFacing,
  forwardDistance: number,
  sideDistance: number
): Vector2 {
  const forward = getForwardVector(seatFacing);
  const right = getRightVector(seatFacing);

  return {
    x: forward.x * forwardDistance + right.x * sideDistance,
    y: forward.y * forwardDistance + right.y * sideDistance,
  };
}

export function getSeatVisualConfig(
  seatFacing: SeatFacing,
  density: DensityPreset
): SeatVisualConfig {
  const facingRotation = getFacingRotation(seatFacing);

  const diceOffset = buildOffset(
    seatFacing,
    density.diceForwardOffset,
    -density.diceSideOffset
  );

  const tabletOffset = buildOffset(
    seatFacing,
    density.tabletForwardOffset,
    density.tabletSideOffset
  );

  const TABLET_BASE_ROTATION = 30;

  return {
    diceX: diceOffset.x,
    diceY: diceOffset.y,
    diceRotation: facingRotation,

    tabletX: tabletOffset.x,
    tabletY: tabletOffset.y,
    tabletRotation: facingRotation + TABLET_BASE_ROTATION,

    badgeSide: getBadgeSide(seatFacing),
  };
}