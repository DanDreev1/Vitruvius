import type { MasterStudioTab, PlayerStudioTab, StudioTabConfig } from './types';

export const PLAYER_STUDIO_TABS: StudioTabConfig<PlayerStudioTab>[] = [
  { key: 'character', label: 'Character', iconSrc: '/navigation-imgs/player/User.png' },
  { key: 'skills', label: 'Skills', iconSrc: '/navigation-imgs/player/Skills.png' },
  { key: 'backpack', label: 'Backpack', iconSrc: '/navigation-imgs/player/Backpack.png' },
  { key: 'library', label: 'Library', iconSrc: '/navigation-imgs/player/Diary.png' },
  { key: 'relationships', label: 'Relations', iconSrc: '/navigation-imgs/player/Relationships.png' },
  { key: 'notes', label: 'Notes', iconSrc: '/navigation-imgs/player/Notes.png' },
  { key: 'settings', label: 'Settings', iconSrc: '/navigation-imgs/player/Gear.png' },
];

export const MASTER_STUDIO_TABS: StudioTabConfig<MasterStudioTab>[] = [
  { key: 'scene', label: 'Scene', iconSrc: '/navigation-imgs/master/Scene.png' },
  { key: 'relationships', label: 'Relations', iconSrc: '/navigation-imgs/master/Relationships.png' },
  { key: 'assets', label: 'Assets', iconSrc: '/navigation-imgs/master/Assets.png' },
  { key: 'notes', label: 'Notes', iconSrc: '/navigation-imgs/master/Notes.png' },
  { key: 'settings', label: 'Settings', iconSrc: '/navigation-imgs/master/Gear.png' },
];
