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

export const SCENE_IMAGE_STORAGE_BUCKET = 'temporary-scene-images';
export const SCENE_IMAGE_STORAGE_FOLDER = 'sessions';

export const SCENE_MUSIC_STORAGE_BUCKET = 'temporary-scene-music';
export const SCENE_MUSIC_STORAGE_FOLDER = 'sessions';
export const SCENE_MUSIC_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const SCENE_MUSIC_ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
];
export const SCENE_MUSIC_FADE_MS = 900;
