import type { TabletRole, TabletTab } from './types';

export const PLAYER_TABLET_TABS: Array<{
  key: TabletTab;
  label: string;
  short: string;
}> = [
  { key: 'user', label: 'User', short: 'U' },
  { key: 'skills', label: 'Skills', short: 'S' },
  { key: 'backpack', label: 'Backpack', short: 'B' },
  { key: 'library', label: 'Library', short: 'L' },
  { key: 'relationship', label: 'Relations', short: 'R' },
  { key: 'notes', label: 'Notes', short: 'N' },
  { key: 'settings', label: 'Settings', short: '⚙' },
];

export const MASTER_TABLET_TABS: Array<{
  key: TabletTab;
  label: string;
  short: string;
}> = [
  { key: 'scene', label: 'Scene', short: 'S' },
  { key: 'party', label: 'Party', short: 'P' },
  { key: 'relationship', label: 'Relations', short: 'R' },
  { key: 'assets', label: 'Assets', short: 'A' },
  { key: 'notes', label: 'Notes', short: 'N' },
  { key: 'settings', label: 'Settings', short: '⚙' },
];

export function getDefaultTabletTab(role: TabletRole): TabletTab {
  return role === 'master' ? 'scene' : 'user';
}