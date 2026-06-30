import type { InventoryCategory } from './types';

export const ASSET_IMAGE_BUCKET = 'temporary-asset-images';
export const SAVED_ASSET_IMAGE_BUCKET = 'asset-images';
export const ASSET_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const ASSET_NAME_MAX_LENGTH = 80;
export const ASSET_DESCRIPTION_MAX_LENGTH = 2000;
export const ASSET_SORT_SAVE_DELAY_MS = 10_000;

export const INVENTORY_CATEGORIES: Array<{
  key: 'all' | InventoryCategory;
  label: string;
}> = [
  { key: 'all', label: 'All' },
  { key: 'weapon', label: 'Weapon' },
  { key: 'consumable', label: 'Consumables' },
  { key: 'quest', label: 'Quests' },
];
