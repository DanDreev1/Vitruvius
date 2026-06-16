export type TabletRole = 'player' | 'master';

export type TabletParticipant = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: TabletRole;
};

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
