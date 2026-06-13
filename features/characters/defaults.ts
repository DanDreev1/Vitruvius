import type { SessionParticipant } from '@/features/lobby/types';

export const CHARACTER_PLACEHOLDER_NAME = 'Unnamed adventurer';
export const CHARACTER_PLACEHOLDER_DESCRIPTION =
  'Temporary character created for this game session.';

export const IN_GAME_CHARACTER_SAVE_STATUS = {
  temporary: 'temporary',
  savedAsNew: 'saved_as_new',
  overwritten: 'overwritten',
  discarded: 'discarded',
} as const;

export type InGameCharacterSaveStatus =
  (typeof IN_GAME_CHARACTER_SAVE_STATUS)[keyof typeof IN_GAME_CHARACTER_SAVE_STATUS];

export const CHARACTER_ATTRIBUTE_KEYS = [
  'constitution',
  'awareness',
  'agility',
  'thinking',
  'charisma',
  'will',
] as const;

export type CharacterAttributeKey = (typeof CHARACTER_ATTRIBUTE_KEYS)[number];

export const CHARACTER_HEALTH_ATTRIBUTE_KEY: CharacterAttributeKey = 'constitution';
export const CHARACTER_HEALTH_MULTIPLIER = 5;
export const CHARACTER_MIN_ATTRIBUTE_VALUE = 1;
export const CHARACTER_MAX_ATTRIBUTE_VALUE = 6;
export const CHARACTER_MIN_DOMAIN_LEVEL = 1;
export const CHARACTER_MAX_DOMAIN_LEVEL = 6;

export type CharacterAttributeTemplate = {
  attribute_key: CharacterAttributeKey;
  label: string;
  icon_key: string;
  value: number;
  sort_order: number;
  metadata: Record<string, unknown>;
};

export type CharacterDomainSkillTemplate = {
  skill_key: string;
  name: string;
  description: string | null;
  is_primary: boolean;
  level: number;
  sort_order: number;
  metadata: Record<string, unknown>;
};

export type CharacterDomainTemplate = {
  domain_key: string;
  name: string;
  description: string | null;
  icon_key: string | null;
  level: number;
  sort_order: number;
  metadata: Record<string, unknown>;
  skills: CharacterDomainSkillTemplate[];
};

export type CharacterInventoryItemTemplate = {
  name: string;
  description: string | null;
  category: string;
  quantity: number;
  image_url: string | null;
  sort_order: number;
  metadata: Record<string, unknown>;
};

export type CharacterNoteTemplate = {
  title: string;
  content: string | null;
  canvas_x: number;
  canvas_y: number;
  sort_order: number;
  metadata: Record<string, unknown>;
};

export type CharacterExperienceTemplate = {
  headline: string;
  description: string | null;
  xp: number;
  tag: string | null;
  session_label: string | null;
  happened_at: string | null;
  sort_order: number;
  metadata: Record<string, unknown>;
};

export type CharacterNpcTemplate = {
  name: string;
  description: string | null;
  avatar_url: string | null;
  disposition: string;
  metadata: Record<string, unknown>;
};

export type InGameCharacterPlaceholder = {
  session_id: string;
  participant_id: string;
  user_id: string;
  source_character_id: string | null;
  name: string;
  description: string;
  avatar_url: string | null;
  is_placeholder: boolean;
  save_status: InGameCharacterSaveStatus;
};

export const DEFAULT_CHARACTER_ATTRIBUTES: CharacterAttributeTemplate[] = [
  {
    attribute_key: 'constitution',
    label: 'Constitution',
    icon_key: 'heart-pulse',
    value: 1,
    sort_order: 0,
    metadata: {},
  },
  {
    attribute_key: 'awareness',
    label: 'Awareness',
    icon_key: 'user-alert',
    value: 1,
    sort_order: 1,
    metadata: {},
  },
  {
    attribute_key: 'awareness',
    label: 'Agility',
    icon_key: 'running',
    value: 1,
    sort_order: 2,
    metadata: {},
  },
  {
    attribute_key: 'thinking',
    label: 'Thinking',
    icon_key: 'brain',
    value: 1,
    sort_order: 3,
    metadata: {},
  },
  {
    attribute_key: 'charisma',
    label: 'Charisma',
    icon_key: 'mask',
    value: 1,
    sort_order: 4,
    metadata: {},
  },
  {
    attribute_key: 'will',
    label: 'Will',
    icon_key: 'fist',
    value: 1,
    sort_order: 5,
    metadata: {},
  },
];

export const DEFAULT_CHARACTER_DOMAINS: CharacterDomainTemplate[] = [];
export const DEFAULT_CHARACTER_INVENTORY_ITEMS: CharacterInventoryItemTemplate[] = [];
export const DEFAULT_CHARACTER_NOTES: CharacterNoteTemplate[] = [];
export const DEFAULT_CHARACTER_EXPERIENCES: CharacterExperienceTemplate[] = [];
export const DEFAULT_CHARACTER_NPCS: CharacterNpcTemplate[] = [];

function cloneRows<T extends { metadata: Record<string, unknown> }>(rows: T[]): T[] {
  return rows.map((row) => ({
    ...row,
    metadata: { ...row.metadata },
  }));
}

function cloneDomains(domains: CharacterDomainTemplate[]): CharacterDomainTemplate[] {
  return domains.map((domain) => ({
    ...domain,
    metadata: { ...domain.metadata },
    skills: cloneRows(domain.skills),
  }));
}

export function createDefaultCharacterCollections() {
  return {
    attributes: cloneRows(DEFAULT_CHARACTER_ATTRIBUTES),
    domains: cloneDomains(DEFAULT_CHARACTER_DOMAINS),
    inventory_items: cloneRows(DEFAULT_CHARACTER_INVENTORY_ITEMS),
    notes: cloneRows(DEFAULT_CHARACTER_NOTES),
    experiences: cloneRows(DEFAULT_CHARACTER_EXPERIENCES),
    npcs: cloneRows(DEFAULT_CHARACTER_NPCS),
  };
}

export function calculateCharacterHealth(
  attributes: Array<Pick<CharacterAttributeTemplate, 'attribute_key' | 'value'>>
) {
  const healthAttribute = attributes.find(
    (attribute) => attribute.attribute_key === CHARACTER_HEALTH_ATTRIBUTE_KEY
  );

  return (healthAttribute?.value ?? CHARACTER_MIN_ATTRIBUTE_VALUE) * CHARACTER_HEALTH_MULTIPLIER;
}

export function getPlaceholderCharacterName(displayName: string | null | undefined) {
  const trimmedDisplayName = displayName?.trim();

  return trimmedDisplayName || CHARACTER_PLACEHOLDER_NAME;
}

export function createInGameCharacterPlaceholder(
  participant: SessionParticipant
): InGameCharacterPlaceholder {
  return {
    session_id: participant.session_id,
    participant_id: participant.id,
    user_id: participant.user_id,
    source_character_id: null,
    name: getPlaceholderCharacterName(participant.display_name),
    description: CHARACTER_PLACEHOLDER_DESCRIPTION,
    avatar_url: participant.avatar_url,
    is_placeholder: true,
    save_status: IN_GAME_CHARACTER_SAVE_STATUS.temporary,
  };
}
