export const RELATIONSHIP_NPC_STORAGE_BUCKET = 'relationship-npc-images';
export const RELATIONSHIP_NPC_STORAGE_FOLDER = 'in-game-worlds';

export const RELATIONSHIP_NPC_NAME_MAX_LENGTH = 80;
export const RELATIONSHIP_NPC_DESCRIPTION_MAX_LENGTH = 2000;
export const RELATIONSHIP_NPC_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const RELATIONSHIP_NPC_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const RELATIONSHIP_SORT_SAVE_DELAY_MS = 10_000;

export const RELATIONSHIP_LEVELS = [
  { value: -5, label: 'Hate' },
  { value: -4, label: 'Hostility' },
  { value: -3, label: 'Tension' },
  { value: -2, label: 'Distrust' },
  { value: -1, label: 'Suspicion' },
  { value: 0, label: 'Indifference' },
  { value: 1, label: 'Curiosity' },
  { value: 2, label: 'Trust' },
  { value: 3, label: 'Closeness' },
  { value: 4, label: 'Friendship' },
  { value: 5, label: 'Loyalty' },
] as const;

export function getRelationshipLabel(value: number) {
  return (
    RELATIONSHIP_LEVELS.find((level) => level.value === value)?.label ??
    'Indifference'
  );
}
