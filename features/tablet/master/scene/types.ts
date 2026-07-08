export type SceneTab = 'images' | 'music';

export type SceneDirection = 1 | -1;

export type SceneAudienceParticipant = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'master' | 'player';
  isAll?: boolean;
};

export type SceneImagesViewMode = 'stack' | 'fit';

export type SceneImageItem = {
  id: string;
  title: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  isAddCard?: boolean;
};

export type SceneImageRecord = {
  id: string;
  in_game_world_id: string;
  title: string;
  image_url: string;
  storage_path?: string | null;
  mime_type?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SceneAudienceTarget = {
  participantId: string;
  inGameCharacterId: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'player';
};

export type SceneAudienceState = {
  participants: SceneAudienceTarget[];
  selectedCharacterIds: string[];
  disabled: boolean;
  onToggleAll: () => void;
  onToggleParticipant: (inGameCharacterId: string) => void;
};

export type SceneMusicItem = {
  id: string;
  title: string;
  audioUrl: string;
  coverUrl: string | null;
  isActive: boolean;
  isPlaying: boolean;
  currentTimeSeconds: number;
  volume: number;
  sortOrder: number;
};

export type SceneMusicRecord = {
  id: string;
  in_game_world_id: string;
  title: string;
  audio_url: string;
  cover_url: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
  sort_order: number;
  is_active: boolean;
  is_playing: boolean;
  current_time_seconds: number;
  volume?: number | null;
  created_at: string;
  updated_at: string;
};
