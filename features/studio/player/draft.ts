import { createDefaultCharacterCollections } from '@/features/characters/defaults';
import type { TabletPlayerDomain } from '@/features/tablet/player/types';
import type { StudioCharacterDraft } from './types';
import { createId } from '@/lib/createId';

function draftId(prefix: string) {
  return `draft-${prefix}-${createId()}`;
}

export function createStudioCharacterDraft(): StudioCharacterDraft {
  const defaults = createDefaultCharacterCollections();
  return {
    name: '',
    description: '',
    portraitFile: null,
    portraitPreviewUrl: null,
    avatarUrl: null,
    attributes: defaults.attributes.map((item) => ({
      id: draftId('attribute'), key: item.attribute_key, label: item.label,
      iconKey: item.icon_key, value: item.value, sortOrder: item.sort_order,
    })),
    parameters: defaults.parameters.map((item) => ({
      id: draftId('parameter'), key: item.parameter_key, label: item.label,
      iconKey: item.icon_key, currentValue: item.current_value,
      maxValue: item.max_value, sortOrder: item.sort_order,
    })),
    domains: defaults.domains.map((domain) => ({
      id: draftId('domain'), key: domain.domain_key, name: domain.name,
      description: domain.description, iconKey: domain.icon_key, level: domain.level,
      sortOrder: domain.sort_order, metadata: { ...domain.metadata }, isDraft: true,
      skills: domain.skills.map((skill) => ({
        id: draftId('skill'), key: skill.skill_key, name: skill.name,
        description: skill.description,
        iconKey: typeof skill.metadata.icon_key === 'string' ? skill.metadata.icon_key : 'book',
        isPrimary: skill.is_primary, level: skill.level, sortOrder: skill.sort_order,
        metadata: { ...skill.metadata }, isDraft: true,
      })),
    })),
    inventoryItems: [], notes: [], experiences: [], relationships: [],
  };
}

export function createStudioDomain(sortOrder: number): TabletPlayerDomain {
  const key = `domain-${createId()}`;
  return {
    id: draftId('domain'), key, name: 'Name of the Domain', description: null,
    iconKey: 'skills', level: 1, sortOrder, metadata: {}, isDraft: true,
    skills: [
      { id: draftId('skill'), key: `${key}-primary`, name: 'Skill name', description: 'Skill description.', iconKey: 'book', isPrimary: true, level: 1, sortOrder: 0, metadata: { icon_key: 'book' }, isDraft: true },
      { id: draftId('skill'), key: `${key}-skill-1`, name: 'Skill name', description: 'Skill description.', iconKey: 'book', isPrimary: false, level: 1, sortOrder: 1, metadata: { icon_key: 'book' }, isDraft: true },
    ],
  };
}
