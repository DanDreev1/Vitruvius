import type { TabletViewMode } from '@/lib/game/types';
import type { TabletRole, TabletTab } from './types';

export type TabletTabConfig = {
  key: TabletTab;
  label: string;
  short: string;
  iconSrc?: string;
};

export const PLAYER_TABLET_TABS: TabletTabConfig[] = [
  { key: 'user', label: 'User', short: 'U', iconSrc: '/navigation-imgs/player/User.png' },
  { key: 'skills', label: 'Skills', short: 'S', iconSrc: '/navigation-imgs/player/Skills.png' },
  { key: 'backpack', label: 'Backpack', short: 'B', iconSrc: '/navigation-imgs/player/Backpack.png' },
  { key: 'library', label: 'Library', short: 'L', iconSrc: '/navigation-imgs/player/Diary.png' },
  {
    key: 'relationship',
    label: 'Relations',
    short: 'R',
    iconSrc: '/navigation-imgs/player/Relationships.png',
  },
  { key: 'notes', label: 'Notes', short: 'N', iconSrc: '/navigation-imgs/player/Notes.png' },
  { key: 'settings', label: 'Settings', short: 'G', iconSrc: '/navigation-imgs/player/Gear.png' },
];

export const MASTER_TABLET_TABS: TabletTabConfig[] = [
  { key: 'scene', label: 'Scene', short: 'S' },
  { key: 'party', label: 'Party', short: 'P' },
  { key: 'relationship', label: 'Relations', short: 'R' },
  { key: 'assets', label: 'Assets', short: 'A' },
  { key: 'notes', label: 'Notes', short: 'N' },
  { key: 'settings', label: 'Settings', short: 'G' },
];

export function getVisibleTabletTabs(
  targetRole: TabletRole,
  mode: TabletViewMode
) {
  if (targetRole === 'master') {
    return MASTER_TABLET_TABS;
  }

  if (mode === 'self') {
    return PLAYER_TABLET_TABS;
  }

  return PLAYER_TABLET_TABS.filter(
    (tab) => tab.key !== 'notes' && tab.key !== 'settings'
  );
}

export function isTabletTabAllowed(
  tab: TabletTab,
  targetRole: TabletRole,
  mode: TabletViewMode
) {
  return getVisibleTabletTabs(targetRole, mode).some(
    (visibleTab) => visibleTab.key === tab
  );
}

export function getDefaultTabletTab(
  targetRole: TabletRole,
  mode: TabletViewMode
): TabletTab {
  return getVisibleTabletTabs(targetRole, mode)[0].key;
}

export function canEditTablet(
  targetRole: TabletRole,
  mode: TabletViewMode
) {
  if (targetRole === 'master') {
    return mode === 'self';
  }

  return mode === 'self' || mode === 'master';
}
