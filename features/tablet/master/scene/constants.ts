import type { SceneTab } from './types';

export const SCENE_TAB_ORDER: SceneTab[] = ['images', 'music'];

export const SCENE_DEFAULT_TAB: SceneTab = 'images';

export const SCENE_TAB_ANIMATION_MS = 260;

export const SCENE_TAB_ICON_PATHS: Record<SceneTab, string> = {
  images: '/tablet/master/scene/tabs/tab-images.svg',
  music: '/tablet/master/scene/tabs/tab-music.svg',
};

export const SCENE_PLACEHOLDER_ICON_PATHS = {
  upload: '/tablet/master/scene/placeholders/upload.svg',
};

export const SCENE_IMAGE_STORAGE_BUCKET = 'scene-images';
export const SCENE_IMAGE_STORAGE_FOLDER = 'in-game-worlds';