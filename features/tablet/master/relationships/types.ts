export type RelationshipNpcRecord = {
  id: string;
  in_game_world_id: string;
  source_relationship_npc_id: string | null;
  name: string;
  description: string;
  avatar_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type RelationshipLinkRecord = {
  id: string;
  in_game_character_id: string | null;
  character_id: string | null;
  in_game_npc_id: string | null;
  npc_id: string | null;
  relationship_value: number;
  is_visible_to_player: boolean;
};

export type RelationshipAudienceMember = {
  participantId: string;
  inGameCharacterId: string;
  sourceCharacterId: string | null;
  displayName: string;
  avatarUrl: string | null;
};

export type RelationshipLinkDraft = {
  id: string | null;
  relationshipValue: number;
  isVisibleToPlayer: boolean;
};

export type RelationshipNpcDraft = {
  id: string;
  persistedId: string | null;
  sourceRelationshipNpcId: string | null;
  name: string;
  description: string;
  avatarPath: string | null;
  avatarDisplayUrl: string | null;
  avatarFile: File | null;
  avatarPreviewUrl: string | null;
  sortOrder: number;
  isNew: boolean;
};

export type RelationshipSaveNpcInput = {
  draftId: string;
  persistedId: string | null;
  name: string;
  description: string;
  avatarPath: string | null;
  avatarFile: File | null;
  sortOrder: number;
};

export type PlayerRelationshipNpc = {
  id: string;
  name: string;
  description: string;
  avatarDisplayUrl: string | null;
  relationshipValue: number;
  sortOrder: number;
};
