import type {
  TabletPlayerAttribute,
  TabletPlayerDomain,
  TabletPlayerExperience,
  TabletPlayerParameter,
} from '@/features/tablet/player/types';
import type { InventoryCategory } from '@/features/tablet/inventory/types';
import type { PlayerRelationshipNpc } from '@/features/tablet/master/relationships/types';

export type StudioInventoryItem = {
  id: string;
  name: string;
  description: string;
  category: InventoryCategory;
  quantity: number;
  imageUrl: string | null;
  sortOrder: number;
};

export type StudioCharacterNote = {
  id: string;
  title: string;
  content: string;
  positionX: number;
  positionY: number;
  sortOrder: number;
};

export type StudioCharacterDraft = {
  name: string;
  description: string;
  portraitFile: File | null;
  portraitPreviewUrl: string | null;
  avatarUrl: string | null;
  attributes: TabletPlayerAttribute[];
  parameters: TabletPlayerParameter[];
  domains: TabletPlayerDomain[];
  inventoryItems: StudioInventoryItem[];
  notes: StudioCharacterNote[];
  experiences: TabletPlayerExperience[];
  relationships: PlayerRelationshipNpc[];
};

export type StudioCharacterPayload = Omit<
  StudioCharacterDraft,
  'portraitFile' | 'portraitPreviewUrl' | 'relationships'
>;
