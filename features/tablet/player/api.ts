import { supabase } from '@/lib/supabaseClient';

import {
  PLAYER_TABLET_CUSTOM_ICON_STORAGE_FOLDER,
  PLAYER_TABLET_PORTRAIT_STORAGE_BUCKET,
  PLAYER_TABLET_PORTRAIT_STORAGE_FOLDER,
} from './constants';
import type {
  TabletPlayerAttribute,
  TabletPlayerCharacter,
  TabletPlayerDomain,
  TabletPlayerDomainSkill,
  TabletPlayerExperience,
  TabletPlayerParameter,
  TabletPlayerCharacterSavePatch,
} from './types';

type InGameCharacterRow = {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
};

type InGameAttributeRow = {
  id: string;
  attribute_key: string;
  label: string;
  icon_key: string;
  value: number;
  sort_order: number;
};

type InGameParameterRow = {
  id: string;
  parameter_key: string;
  label: string;
  icon_key: string;
  current_value: number;
  max_value: number | null;
  sort_order: number;
};

type InGameDomainRow = {
  id: string;
  domain_key: string;
  name: string;
  description: string | null;
  icon_key: string | null;
  level: number;
  sort_order: number;
  metadata: Record<string, unknown> | null;
};

type InGameDomainSkillRow = {
  id: string;
  in_game_domain_id: string;
  skill_key: string;
  name: string;
  description: string | null;
  is_primary: boolean;
  level: number;
  sort_order: number;
  metadata: Record<string, unknown> | null;
};

type InGameExperienceRow = {
  id: string;
  headline: string;
  description: string | null;
  xp: number;
  tag: string | null;
  session_label: string | null;
  happened_at: string | null;
  sort_order: number;
  metadata: Record<string, unknown> | null;
};

function mapAttribute(row: InGameAttributeRow): TabletPlayerAttribute {
  return {
    id: row.id,
    key: row.attribute_key,
    label: row.label,
    iconKey: row.icon_key,
    value: row.value,
    sortOrder: row.sort_order,
  };
}

function mapParameter(row: InGameParameterRow): TabletPlayerParameter {
  return {
    id: row.id,
    key: row.parameter_key,
    label: row.label,
    iconKey: row.icon_key,
    currentValue: row.current_value,
    maxValue: row.max_value,
    sortOrder: row.sort_order,
  };
}

function mapDomainSkill(row: InGameDomainSkillRow): TabletPlayerDomainSkill {
  const metadata = row.metadata ?? {};
  const iconKey =
    typeof metadata.icon_key === 'string' ? metadata.icon_key : 'book';

  return {
    id: row.id,
    key: row.skill_key,
    name: row.name,
    description: row.description,
    iconKey,
    isPrimary: row.is_primary,
    level: row.level,
    sortOrder: row.sort_order,
    metadata,
  };
}

function mapExperience(row: InGameExperienceRow): TabletPlayerExperience {
  return {
    id: row.id,
    headline: row.headline,
    description: row.description,
    xp: row.xp,
    tag: row.tag,
    sessionLabel: row.session_label,
    happenedAt: row.happened_at,
    sortOrder: row.sort_order,
    metadata: row.metadata ?? {},
  };
}

async function getTabletPlayerDomains(
  characterId: string
): Promise<TabletPlayerDomain[]> {
  const { data: domains, error: domainsError } = await supabase
    .from('in_game_character_domains')
    .select('id, domain_key, name, description, icon_key, level, sort_order, metadata')
    .eq('in_game_character_id', characterId)
    .order('sort_order', { ascending: true });

  if (domainsError) {
    throw new Error(
      `Failed to load tablet character domains: ${domainsError.message}`
    );
  }

  const domainRows = (domains ?? []) as InGameDomainRow[];
  const domainIds = domainRows.map((domain) => domain.id);

  if (!domainIds.length) {
    return [];
  }

  const { data: skills, error: skillsError } = await supabase
    .from('in_game_character_domain_skills')
    .select(
      'id, in_game_domain_id, skill_key, name, description, is_primary, level, sort_order, metadata'
    )
    .in('in_game_domain_id', domainIds)
    .order('sort_order', { ascending: true });

  if (skillsError) {
    throw new Error(
      `Failed to load tablet character domain skills: ${skillsError.message}`
    );
  }

  const skillsByDomainId = new Map<string, TabletPlayerDomainSkill[]>();

  for (const skill of (skills ?? []) as InGameDomainSkillRow[]) {
    const domainSkills = skillsByDomainId.get(skill.in_game_domain_id) ?? [];
    domainSkills.push(mapDomainSkill(skill));
    skillsByDomainId.set(skill.in_game_domain_id, domainSkills);
  }

  return domainRows.map((domain) => ({
    id: domain.id,
    key: domain.domain_key,
    name: domain.name,
    description: domain.description,
    iconKey: domain.icon_key,
    level: domain.level,
    sortOrder: domain.sort_order,
    metadata: domain.metadata ?? {},
    skills: skillsByDomainId.get(domain.id) ?? [],
  }));
}

async function getTabletPlayerExperiences(
  characterId: string
): Promise<TabletPlayerExperience[]> {
  const { data, error } = await supabase
    .from('in_game_character_experiences')
    .select(
      'id, headline, description, xp, tag, session_label, happened_at, sort_order, metadata'
    )
    .eq('in_game_character_id', characterId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(
      `Failed to load tablet character experiences: ${error.message}`
    );
  }

  return ((data ?? []) as InGameExperienceRow[]).map(mapExperience);
}

export async function getTabletPlayerCharacter(
  sessionId: string,
  participantId: string
): Promise<TabletPlayerCharacter | null> {
  const { data: character, error: characterError } = await supabase
    .from('in_game_characters')
    .select('id, name, description, avatar_url')
    .eq('session_id', sessionId)
    .eq('participant_id', participantId)
    .maybeSingle();

  if (characterError) {
    throw new Error(`Failed to load tablet character: ${characterError.message}`);
  }

  if (!character) {
    return null;
  }

  const characterRow = character as InGameCharacterRow;

  const [attributesResult, parametersResult, domains, experiences] =
    await Promise.all([
      supabase
        .from('in_game_character_attributes')
        .select('id, attribute_key, label, icon_key, value, sort_order')
        .eq('in_game_character_id', characterRow.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('in_game_character_parameters')
        .select(
          'id, parameter_key, label, icon_key, current_value, max_value, sort_order'
        )
        .eq('in_game_character_id', characterRow.id)
        .order('sort_order', { ascending: true }),
      getTabletPlayerDomains(characterRow.id),
      getTabletPlayerExperiences(characterRow.id),
    ]);

  if (attributesResult.error) {
    throw new Error(
      `Failed to load tablet character attributes: ${attributesResult.error.message}`
    );
  }

  if (parametersResult.error) {
    throw new Error(
      `Failed to load tablet character parameters: ${parametersResult.error.message}`
    );
  }

  return {
    id: characterRow.id,
    name: characterRow.name,
    description: characterRow.description,
    avatarUrl: characterRow.avatar_url,
    attributes: ((attributesResult.data ?? []) as InGameAttributeRow[]).map(
      mapAttribute
    ),
    parameters: ((parametersResult.data ?? []) as InGameParameterRow[]).map(
      mapParameter
    ),
    domains,
    experiences,
  };
}

function hasCharacterPatch(patch: TabletPlayerCharacterSavePatch) {
  return patch.character && Object.keys(patch.character).length > 0;
}

function isDraftId(id: string) {
  return id.startsWith('draft-');
}

async function saveTabletPlayerDomains(
  characterId: string,
  domains: TabletPlayerDomain[]
) {
  const { data: existingDomains, error: existingDomainsError } = await supabase
    .from('in_game_character_domains')
    .select('id')
    .eq('in_game_character_id', characterId);

  if (existingDomainsError) {
    throw new Error(
      `Failed to load existing domains: ${existingDomainsError.message}`
    );
  }

  const keptDomainIds = new Set(
    domains
      .filter((domain) => !domain.isDraft && !isDraftId(domain.id))
      .map((domain) => domain.id)
  );
  const domainIdsToDelete = (existingDomains ?? [])
    .map((domain) => domain.id as string)
    .filter((domainId) => !keptDomainIds.has(domainId));

  if (domainIdsToDelete.length) {
    const { error: skillsDeleteError } = await supabase
      .from('in_game_character_domain_skills')
      .delete()
      .in('in_game_domain_id', domainIdsToDelete);

    if (skillsDeleteError) {
      throw new Error(
        `Failed to delete domain skills: ${skillsDeleteError.message}`
      );
    }

    const { error: domainsDeleteError } = await supabase
      .from('in_game_character_domains')
      .delete()
      .eq('in_game_character_id', characterId)
      .in('id', domainIdsToDelete);

    if (domainsDeleteError) {
      throw new Error(`Failed to delete domains: ${domainsDeleteError.message}`);
    }
  }

  for (const domain of domains) {
    const domainPayload = {
      domain_key: domain.key,
      name: domain.name,
      description: domain.description,
      icon_key: domain.iconKey,
      level: domain.level,
      sort_order: domain.sortOrder,
      metadata: domain.metadata,
    };
    let domainId = domain.id;

    if (domain.isDraft || isDraftId(domain.id)) {
      const { data, error } = await supabase
        .from('in_game_character_domains')
        .insert({
          ...domainPayload,
          in_game_character_id: characterId,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create domain: ${error.message}`);
      }

      domainId = data.id as string;
    } else {
      const { error } = await supabase
        .from('in_game_character_domains')
        .update(domainPayload)
        .eq('id', domain.id)
        .eq('in_game_character_id', characterId);

      if (error) {
        throw new Error(`Failed to save domain: ${error.message}`);
      }
    }

    const { data: existingSkills, error: existingSkillsError } = await supabase
      .from('in_game_character_domain_skills')
      .select('id')
      .eq('in_game_domain_id', domainId);

    if (existingSkillsError) {
      throw new Error(
        `Failed to load existing skills: ${existingSkillsError.message}`
      );
    }

    const keptSkillIds = new Set(
      domain.skills
        .filter((skill) => !skill.isDraft && !isDraftId(skill.id))
        .map((skill) => skill.id)
    );
    const skillIdsToDelete = (existingSkills ?? [])
      .map((skill) => skill.id as string)
      .filter((skillId) => !keptSkillIds.has(skillId));

    if (skillIdsToDelete.length) {
      const { error: deleteSkillsError } = await supabase
        .from('in_game_character_domain_skills')
        .delete()
        .eq('in_game_domain_id', domainId)
        .in('id', skillIdsToDelete);

      if (deleteSkillsError) {
        throw new Error(`Failed to delete skills: ${deleteSkillsError.message}`);
      }
    }

    for (const skill of domain.skills) {
      const skillPayload = {
        skill_key: skill.key,
        name: skill.name,
        description: skill.description,
        is_primary: skill.isPrimary,
        level: skill.level,
        sort_order: skill.sortOrder,
        metadata: {
          ...skill.metadata,
          icon_key: skill.iconKey,
        },
      };

      if (skill.isDraft || isDraftId(skill.id)) {
        const { error } = await supabase
          .from('in_game_character_domain_skills')
          .insert({
            ...skillPayload,
            in_game_domain_id: domainId,
          });

        if (error) {
          throw new Error(`Failed to create skill: ${error.message}`);
        }

        continue;
      }

      const { error } = await supabase
        .from('in_game_character_domain_skills')
        .update(skillPayload)
        .eq('id', skill.id)
        .eq('in_game_domain_id', domainId);

      if (error) {
        throw new Error(`Failed to save skill: ${error.message}`);
      }
    }
  }

  return getTabletPlayerDomains(characterId);
}

export async function saveTabletPlayerExperiences(
  characterId: string,
  experiences: TabletPlayerExperience[]
) {
  for (const experience of experiences) {
    const experiencePayload = {
      headline: experience.headline,
      description: experience.description,
      xp: experience.xp,
      tag: experience.tag,
      session_label: experience.sessionLabel,
      happened_at: experience.happenedAt,
      sort_order: experience.sortOrder,
      metadata: experience.metadata,
    };

    if (experience.isDraft || isDraftId(experience.id)) {
      const { error } = await supabase
        .from('in_game_character_experiences')
        .insert({
          ...experiencePayload,
          in_game_character_id: characterId,
        });

      if (error) {
        throw new Error(`Failed to create experience: ${error.message}`);
      }

      continue;
    }

    const { error } = await supabase
      .from('in_game_character_experiences')
      .update(experiencePayload)
      .eq('id', experience.id)
      .eq('in_game_character_id', characterId);

    if (error) {
      throw new Error(`Failed to save experience: ${error.message}`);
    }
  }

  return getTabletPlayerExperiences(characterId);
}

export async function deleteTabletPlayerExperience(
  characterId: string,
  experienceId: string
) {
  const { error } = await supabase
    .from('in_game_character_experiences')
    .delete()
    .eq('id', experienceId)
    .eq('in_game_character_id', characterId);

  if (error) {
    throw new Error(`Failed to delete experience: ${error.message}`);
  }

  return getTabletPlayerExperiences(characterId);
}

export async function saveTabletPlayerCharacterPatch(
  patch: TabletPlayerCharacterSavePatch
): Promise<{ domains?: TabletPlayerDomain[] }> {
  const updateTasks: Array<PromiseLike<unknown>> = [];

  if (hasCharacterPatch(patch)) {
    const characterUpdates: Record<string, unknown> = {};

    if (patch.character?.name !== undefined) {
      characterUpdates.name = patch.character.name;
    }

    if (patch.character?.description !== undefined) {
      characterUpdates.description = patch.character.description;
    }

    if (patch.character?.avatarUrl !== undefined) {
      characterUpdates.avatar_url = patch.character.avatarUrl;
    }

    updateTasks.push(
      supabase
        .from('in_game_characters')
        .update(characterUpdates)
        .eq('id', patch.id)
        .then(({ error }) => {
          if (error) {
            throw new Error(`Failed to save character: ${error.message}`);
          }
        })
    );
  }

  for (const attribute of patch.attributes ?? []) {
    updateTasks.push(
      supabase
        .from('in_game_character_attributes')
        .update({ value: attribute.value })
        .eq('id', attribute.id)
        .eq('in_game_character_id', patch.id)
        .then(({ error }) => {
          if (error) {
            throw new Error(`Failed to save attribute: ${error.message}`);
          }
        })
    );
  }

  for (const parameter of patch.parameters ?? []) {
    updateTasks.push(
      supabase
        .from('in_game_character_parameters')
        .update({ current_value: parameter.currentValue })
        .eq('id', parameter.id)
        .eq('in_game_character_id', patch.id)
        .then(({ error }) => {
          if (error) {
            throw new Error(`Failed to save parameter: ${error.message}`);
          }
        })
    );
  }

  if (updateTasks.length) {
    await Promise.all(updateTasks);
  }

  if (!patch.domains) {
    return {};
  }

  return {
    domains: await saveTabletPlayerDomains(patch.id, patch.domains),
  };
}

export async function uploadTabletPlayerPortrait(
  uploaderUserId: string,
  characterId: string,
  file: File
) {
  void uploaderUserId;
  const version = Date.now();
  const { data: character, error: characterError } = await supabase
    .from('in_game_characters')
    .select('session_id')
    .eq('id', characterId)
    .single();
  if (characterError) throw new Error(characterError.message);
  const objectPath = `sessions/${character.session_id}/characters/${characterId}/${PLAYER_TABLET_PORTRAIT_STORAGE_FOLDER}/portrait`;

  const { error: uploadError } = await supabase.storage
    .from(PLAYER_TABLET_PORTRAIT_STORAGE_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '60',
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload portrait: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from(PLAYER_TABLET_PORTRAIT_STORAGE_BUCKET)
    .getPublicUrl(objectPath);

  return `${data.publicUrl}?v=${version}`;
}

export async function uploadTabletPlayerCustomIcon(
  uploaderUserId: string,
  characterId: string,
  ownerId: string,
  iconType: 'domain' | 'skill',
  file: File
) {
  void uploaderUserId;
  const version = Date.now();
  const { data: character, error: characterError } = await supabase
    .from('in_game_characters')
    .select('session_id')
    .eq('id', characterId)
    .single();
  if (characterError) throw new Error(characterError.message);
  const objectPath = `sessions/${character.session_id}/characters/${characterId}/${PLAYER_TABLET_CUSTOM_ICON_STORAGE_FOLDER}/${iconType}s/${ownerId}/icon`;

  const { error: uploadError } = await supabase.storage
    .from(PLAYER_TABLET_PORTRAIT_STORAGE_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '60',
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload icon: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from(PLAYER_TABLET_PORTRAIT_STORAGE_BUCKET)
    .getPublicUrl(objectPath);

  return `${data.publicUrl}?v=${version}`;
}
