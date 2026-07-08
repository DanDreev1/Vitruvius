import type { SceneLayout } from './types';

export const sceneLayouts: Record<number, SceneLayout> = {
  0: {
    table: { width: 1120, height: 560 },
    master: { side: 'right', along: 0.5, gap: 0.15, seatFacing: 'left' },
    density: 'comfortable',
    scaleMultiplier: 0.86,
    playerSeats: [],
  },

  1: {
    table: { width: 1120, height: 560 },
    master: { side: 'right', along: 0.5, gap: 0.15, seatFacing: 'left' },
    density: 'comfortable',
    scaleMultiplier: 0.80,
    playerSeats: [
      { id: 'p1', side: 'left', along: 0.5, gap: 0.15, seatFacing: 'right' },
    ],
  },

  2: {
    table: { width: 1120, height: 560 },
    master: { side: 'right', along: 0.5, gap: 0.15, seatFacing: 'left' },
    density: 'comfortable',
    playerSeats: [
      { id: 'p1', side: 'top', along: 0.5, gap: 0.15, seatFacing: 'down' },
      { id: 'p2', side: 'bottom', along: 0.5, gap: 0.15, seatFacing: 'up' },
    ],
  },

  3: {
    table: { width: 1120, height: 560 },
    master: { side: 'right', along: 0.5, gap: 0.15, seatFacing: 'left' },
    density: 'comfortable',
    playerSeats: [
      { id: 'p1', side: 'left', along: 0.5, gap: 0.15, seatFacing: 'right' },
      { id: 'p2', side: 'top', along: 0.5, gap: 0.15, seatFacing: 'down' },
      { id: 'p3', side: 'bottom', along: 0.5, gap: 0.15, seatFacing: 'up' },
    ],
  },

  4: {
    table: { width: 1140, height: 570 },
    master: { side: 'right', along: 0.5, gap: 0.15, seatFacing: 'left' },
    density: 'comfortable',
    playerSeats: [
      { id: 'p1', side: 'top', along: 0.3, gap: 0.15, seatFacing: 'down' },
      { id: 'p2', side: 'top', along: 0.7, gap: 0.15, seatFacing: 'down' },
      { id: 'p3', side: 'bottom', along: 0.7, gap: 0.15, seatFacing: 'up' },
      { id: 'p4', side: 'bottom', along: 0.3, gap: 0.15, seatFacing: 'up' },
    ],
  },

  5: {
    table: { width: 1160, height: 580 },
    master: { side: 'right', along: 0.5, gap: 0.15, seatFacing: 'left' },
    density: 'comfortable',
    playerSeats: [
      { id: 'p1', side: 'left', along: 0.5, gap: 0.15, seatFacing: 'right' },
      { id: 'p2', side: 'top', along: 0.3, gap: 0.15, seatFacing: 'down' },
      { id: 'p3', side: 'top', along: 0.7, gap: 0.15, seatFacing: 'down' },
      { id: 'p4', side: 'bottom', along: 0.7, gap: 0.15, seatFacing: 'up' },
      { id: 'p5', side: 'bottom', along: 0.3, gap: 0.15, seatFacing: 'up' },
    ],
  },

  6: {
    table: { width: 1180, height: 590 },
    master: { side: 'right', along: 0.5, gap: 0.10, seatFacing: 'left' },
    density: 'compact',
    playerSeats: [
      { id: 'p1', side: 'top', along: 0.25, gap: 0.10, seatFacing: 'down' },
      { id: 'p2', side: 'top', along: 0.50, gap: 0.10, seatFacing: 'down' },
      { id: 'p3', side: 'top', along: 0.75, gap: 0.10, seatFacing: 'down' },
      { id: 'p4', side: 'bottom', along: 0.75, gap: 0.10, seatFacing: 'up' },
      { id: 'p5', side: 'bottom', along: 0.50, gap: 0.10, seatFacing: 'up' },
      { id: 'p6', side: 'bottom', along: 0.25, gap: 0.10, seatFacing: 'up' },
    ],
  },

  7: {
    table: { width: 1190, height: 600 },
    master: { side: 'right', along: 0.5, gap: 0.1, seatFacing: 'left' },
    density: 'compact',
    playerSeats: [
      { id: 'p1', side: 'left', along: 0.5, gap: 0.1, seatFacing: 'right' },
      { id: 'p2', side: 'top', along: 0.75, gap: 0.1, seatFacing: 'down' },
      { id: 'p3', side: 'top', along: 0.5, gap: 0.1, seatFacing: 'down' },
      { id: 'p4', side: 'top', along: 0.25, gap: 0.1, seatFacing: 'down' },
      { id: 'p5', side: 'bottom', along: 0.75, gap: 0.1, seatFacing: 'up' },
      { id: 'p6', side: 'bottom', along: 0.5, gap: 0.1, seatFacing: 'up' },
      { id: 'p7', side: 'bottom', along: 0.25, gap: 0.1, seatFacing: 'up' },
    ],
  },

  8: {
    table: { width: 1400, height: 610 },
    master: { side: 'right', along: 0.5, gap: 0.1, seatFacing: 'left' },
    density: 'dense',
    playerSeats: [
      { id: 'p1', side: 'top', along: 0.20, gap: 0.1, seatFacing: 'down' },
      { id: 'p2', side: 'top', along: 0.40, gap: 0.1, seatFacing: 'down' },
      { id: 'p3', side: 'top', along: 0.60, gap: 0.1, seatFacing: 'down' },
      { id: 'p4', side: 'top', along: 0.80, gap: 0.1, seatFacing: 'down' },
      { id: 'p5', side: 'bottom', along: 0.80, gap: 0.1, seatFacing: 'up' },
      { id: 'p6', side: 'bottom', along: 0.60, gap: 0.1, seatFacing: 'up' },
      { id: 'p7', side: 'bottom', along: 0.40, gap: 0.1, seatFacing: 'up' },
      { id: 'p8', side: 'bottom', along: 0.20, gap: 0.1, seatFacing: 'up' },
    ],
  },

  9: {
    table: { width: 1400, height: 620 },
    master: { side: 'right', along: 0.5, gap: 0.1, seatFacing: 'left' },
    density: 'dense',
    playerSeats: [
      { id: 'p1', side: 'left', along: 0.5, gap: 0.1, seatFacing: 'right' },
      { id: 'p2', side: 'top', along: 0.20, gap: 0.1, seatFacing: 'down' },
      { id: 'p3', side: 'top', along: 0.40, gap: 0.1, seatFacing: 'down' },
      { id: 'p4', side: 'top', along: 0.60, gap: 0.1, seatFacing: 'down' },
      { id: 'p5', side: 'top', along: 0.80, gap: 0.1, seatFacing: 'down' },
      { id: 'p6', side: 'bottom', along: 0.80, gap: 0.1, seatFacing: 'up' },
      { id: 'p7', side: 'bottom', along: 0.60, gap: 0.1, seatFacing: 'up' },
      { id: 'p8', side: 'bottom', along: 0.40, gap: 0.1, seatFacing: 'up' },
      { id: 'p9', side: 'bottom', along: 0.20, gap: 0.1, seatFacing: 'up' },
    ],
  },
};
