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

export type CharacterParameterTemplate = {
  parameter_key: string;
  label: string;
  icon_key: string;
  current_value: number;
  max_value: number | null;
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

type InGameCharacterPlaceholderParticipant = Pick<
  SessionParticipant,
  'id' | 'session_id' | 'user_id'
>;

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
    attribute_key: 'agility',
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

export const DEFAULT_CHARACTER_PARAMETERS: CharacterParameterTemplate[] = [
  {
    parameter_key: 'health',
    label: 'Health',
    icon_key: 'heart',
    current_value: CHARACTER_MIN_ATTRIBUTE_VALUE * CHARACTER_HEALTH_MULTIPLIER,
    max_value: CHARACTER_MIN_ATTRIBUTE_VALUE * CHARACTER_HEALTH_MULTIPLIER,
    sort_order: 0,
    metadata: {},
  },
  {
    parameter_key: 'inspiration',
    label: 'Inspiration',
    icon_key: 'star',
    current_value: 6,
    max_value: null,
    sort_order: 1,
    metadata: {},
  },
  {
    parameter_key: 'stress',
    label: 'Stress',
    icon_key: 'stress',
    current_value: 0,
    max_value: null,
    sort_order: 2,
    metadata: {},
  },
];

export const DEFAULT_CHARACTER_DOMAINS: CharacterDomainTemplate[] = [
  {
    domain_key: 'adventuring',
    name: 'Name of the Domain',
    description: null,
    icon_key: 'skills',
    level: CHARACTER_MIN_DOMAIN_LEVEL,
    sort_order: 0,
    metadata: {},
    skills: [
      {
        skill_key: 'adventuring-primary',
        name: 'Skill name',
        description: 'Skill description.',
        is_primary: true,
        level: CHARACTER_MIN_DOMAIN_LEVEL,
        sort_order: 0,
        metadata: { icon_key: 'book' },
      },
      {
        skill_key: 'adventuring-skill-1',
        name: 'Skill name',
        description: 'Skill description.',
        is_primary: false,
        level: CHARACTER_MIN_DOMAIN_LEVEL,
        sort_order: 1,
        metadata: { icon_key: 'book' },
      },
    ],
  },
];
export const DEFAULT_CHARACTER_INVENTORY_ITEMS: CharacterInventoryItemTemplate[] = [];
export const DEFAULT_CHARACTER_NOTES: CharacterNoteTemplate[] = [];
export const DEFAULT_CHARACTER_EXPERIENCES: CharacterExperienceTemplate[] = [];

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
    parameters: cloneRows(DEFAULT_CHARACTER_PARAMETERS),
    domains: cloneDomains(DEFAULT_CHARACTER_DOMAINS),
    inventory_items: cloneRows(DEFAULT_CHARACTER_INVENTORY_ITEMS),
    notes: cloneRows(DEFAULT_CHARACTER_NOTES),
    experiences: cloneRows(DEFAULT_CHARACTER_EXPERIENCES),
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

export function createInGameCharacterPlaceholder(
  participant: InGameCharacterPlaceholderParticipant
): InGameCharacterPlaceholder {
  return {
    session_id: participant.session_id,
    participant_id: participant.id,
    user_id: participant.user_id,
    source_character_id: null,
    name: CHARACTER_PLACEHOLDER_NAME,
    description: CHARACTER_PLACEHOLDER_DESCRIPTION,
    avatar_url: null,
    is_placeholder: true,
    save_status: IN_GAME_CHARACTER_SAVE_STATUS.temporary,
  };
}
