import type { DensityPreset } from './types';

export const densityPresets: Record<'comfortable' | 'compact' | 'dense', DensityPreset> = {
  comfortable: {
    avatarSize: 85,
    diceWidth: 100,
    diceHeight: 100,
    tabletWidth: 100,
    tabletHeight: 15,
    badgeFontSize: 16,

    diceForwardOffset: 175,
    diceSideOffset: 62,
    tabletForwardOffset: 175,
    tabletSideOffset: 78,
    badgeDistance: 104,
    tableImageMaxWidth: 140,
    tableImageMaxHeight: 140,
  },

  compact: {
    avatarSize: 78,
    diceWidth: 100,
    diceHeight: 100,
    tabletWidth: 100,
    tabletHeight: 15,
    badgeFontSize: 15,

    diceForwardOffset: 150,
    diceSideOffset: 54,
    tabletForwardOffset: 150,
    tabletSideOffset: 68,
    badgeDistance: 92,
    tableImageMaxWidth: 150,
    tableImageMaxHeight: 150,
  },

  dense: {
    avatarSize: 68,
    diceWidth: 90,
    diceHeight: 90,
    tabletWidth: 90,
    tabletHeight: 15,
    badgeFontSize: 14,

    diceForwardOffset: 135,
    diceSideOffset: 48,
    tabletForwardOffset: 135,
    tabletSideOffset: 58,
    badgeDistance: 82,
    tableImageMaxWidth: 120,
    tableImageMaxHeight: 120,
  },
};
