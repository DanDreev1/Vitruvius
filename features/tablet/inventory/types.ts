export type InventoryCategory = 'weapon' | 'consumable' | 'quest' | 'other';

export type AssetItem = {
  id: string;
  assetKey: string;
  name: string;
  description: string;
  category: InventoryCategory;
  imagePath: string;
  imageUrl: string | null;
  sortOrder: number;
};

export type AssetDraft = AssetItem & {
  persistedId: string | null;
  imageFile: File | null;
  imagePreviewUrl: string | null;
  isNew: boolean;
};

export type InventoryItem = {
  id: string;
  inGameCharacterId: string;
  assetKey: string | null;
  name: string;
  description: string;
  category: InventoryCategory;
  quantity: number;
  imagePath: string | null;
  imageUrl: string | null;
  sortOrder: number;
  visibleCharacterIds: string[];
};

export type InventoryAudienceMember = {
  participantId: string;
  inGameCharacterId: string;
  displayName: string;
  avatarUrl: string | null;
};

export type InventoryMessage = {
  id: string;
  sessionId: string;
  text: string;
  createdAt: number;
};
