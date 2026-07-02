export type StudioRole = 'player' | 'master';

export type PlayerStudioTab =
  | 'character'
  | 'skills'
  | 'backpack'
  | 'library'
  | 'relationships'
  | 'notes'
  | 'settings';

export type MasterStudioTab =
  | 'scene'
  | 'relationships'
  | 'assets'
  | 'notes'
  | 'settings';

export type StudioTab = PlayerStudioTab | MasterStudioTab;

export type StudioTabConfig<TTab extends StudioTab = StudioTab> = {
  key: TTab;
  label: string;
  iconSrc: string;
};
