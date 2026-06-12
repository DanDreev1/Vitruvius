export type TabletRole = 'player' | 'master';

export type PlayerTabletTab =
  | 'user'
  | 'skills'
  | 'backpack'
  | 'library'
  | 'relationship'
  | 'notes'
  | 'settings';

export type MasterTabletTab =
  | 'scene'
  | 'party'
  | 'relationship'
  | 'assets'
  | 'notes'
  | 'settings';

export type TabletTab = PlayerTabletTab | MasterTabletTab;