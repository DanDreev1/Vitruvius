import {
  calculateCharacterHealth,
  createDefaultCharacterCollections,
  createInGameCharacterPlaceholder,
  DEFAULT_CHARACTER_PARAMETERS,
} from '@/features/characters/defaults';
import type {
  CharacterAttributeKey,
  CharacterDomainTemplate,
} from '@/features/characters/defaults';
import type { SessionParticipant } from '@/features/lobby/types';
import { supabase } from '@/lib/supabaseClient';

type PlayerParticipant = Pick<
  SessionParticipant,
  | 'id'
  | 'session_id'
  | 'user_id'
  | 'selected_character_id'
>;

type SavedCharacter = {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
};

type SavedAttribute = {
  id: string;
  attribute_key: CharacterAttributeKey;
  label: string;
  icon_key: string;
  value: number;
  sort_order: number;
  metadata: Record<string, unknown>;
};

type SavedParameter = {
  id: string;
  parameter_key: string;
  label: string;
  icon_key: string;
  current_value: number;
  max_value: number | null;
  sort_order: number;
  metadata: Record<string, unknown>;
};

type SavedDomain = {
  id: string;
  domain_key: string;
  name: string;
  description: string | null;
  icon_key: string | null;
  level: number;
  sort_order: number;
  metadata: Record<string, unknown>;
};

type SavedDomainSkill = {
  id: string;
  domain_id: string;
  skill_key: string;
  name: string;
  description: string | null;
  is_primary: boolean;
  level: number;
  sort_order: number;
  metadata: Record<string, unknown>;
};

type SavedInventoryItem = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  quantity: number;
  image_url: string | null;
  sort_order: number;
  metadata: Record<string, unknown>;
  asset_key: string | null;
};

type SavedNote = {
  id: string;
  title: string;
  content: string | null;
  canvas_x: number;
  canvas_y: number;
  sort_order: number;
  metadata: Record<string, unknown>;
};

type SavedExperience = {
  id: string;
  headline: string;
  description: string | null;
  xp: number;
  tag: string | null;
  session_label: string | null;
  happened_at: string | null;
  sort_order: number;
  metadata: Record<string, unknown>;
};

async function insertRows(table: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;

  const { error } = await supabase.from(table).insert(rows);

  if (error) {
    throw new Error(`Failed to insert ${table}: ${error.message}`);
  }
}

async function insertInGameDomainTemplates(
  inGameCharacterId: string,
  domains: CharacterDomainTemplate[]
) {
  if (!domains.length) return;

  const { data, error } = await supabase
    .from('in_game_character_domains')
    .insert(
      domains.map((domain) => ({
        in_game_character_id: inGameCharacterId,
        domain_key: domain.domain_key,
        name: domain.name,
        description: domain.description,
        icon_key: domain.icon_key,
        level: domain.level,
        sort_order: domain.sort_order,
        metadata: domain.metadata,
      }))
    )
    .select('id, domain_key');

  if (error) {
    throw new Error(`Failed to insert in-game domains: ${error.message}`);
  }

  const domainIdByKey = new Map(
    (data ?? []).map((domain) => [
      domain.domain_key as string,
      domain.id as string,
    ])
  );
  const skillRows = domains.flatMap((domain) => {
    const inGameDomainId = domainIdByKey.get(domain.domain_key);

    if (!inGameDomainId) {
      return [];
    }

    return domain.skills.map((skill) => ({
      in_game_domain_id: inGameDomainId,
      skill_key: skill.skill_key,
      name: skill.name,
      description: skill.description,
      is_primary: skill.is_primary,
      level: skill.level,
      sort_order: skill.sort_order,
      metadata: skill.metadata,
    }));
  });

  await insertRows('in_game_character_domain_skills', skillRows);
}

async function removeInGameCharacter(inGameCharacterId: string) {
  const { data: domains, error: domainsError } = await supabase
    .from('in_game_character_domains')
    .select('id')
    .eq('in_game_character_id', inGameCharacterId);

  if (domainsError) {
    console.error(domainsError);
  }

  const domainIds = (domains ?? []).map((domain) => domain.id as string);

  if (domainIds.length) {
    const { error } = await supabase
      .from('in_game_character_domain_skills')
      .delete()
      .in('in_game_domain_id', domainIds);

    if (error) {
      console.error(error);
    }
  }

  const childTables = [
    'in_game_character_attributes',
    'in_game_character_parameters',
    'in_game_character_domains',
    'in_game_character_inventory_items',
    'in_game_character_notes',
    'in_game_character_experiences',
  ];

  for (const table of childTables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('in_game_character_id', inGameCharacterId);

    if (error) {
      console.error(error);
    }
  }

  const { error } = await supabase
    .from('in_game_characters')
    .delete()
    .eq('id', inGameCharacterId);

  if (error) {
    console.error(error);
  }
}

async function removeInGameCharactersForSession(sessionId: string) {
  const { data: existingCharacters, error: loadError } = await supabase
    .from('in_game_characters')
    .select('id')
    .eq('session_id', sessionId);

  if (loadError) {
    throw new Error(`Failed to load existing in-game characters: ${loadError.message}`);
  }

  const characterIds = (existingCharacters ?? []).map((character) => character.id as string);

  if (!characterIds.length) {
    return;
  }

  const { data: existingDomains, error: domainsError } = await supabase
    .from('in_game_character_domains')
    .select('id')
    .in('in_game_character_id', characterIds);

  if (domainsError) {
    throw new Error(`Failed to load existing in-game domains: ${domainsError.message}`);
  }

  const domainIds = (existingDomains ?? []).map((domain) => domain.id as string);

  if (domainIds.length) {
    const { error } = await supabase
      .from('in_game_character_domain_skills')
      .delete()
      .in('in_game_domain_id', domainIds);

    if (error) {
      throw new Error(`Failed to clear in-game domain skills: ${error.message}`);
    }
  }

  const childTables = [
    'in_game_character_attributes',
    'in_game_character_parameters',
    'in_game_character_domains',
    'in_game_character_inventory_items',
    'in_game_character_notes',
    'in_game_character_experiences',
  ];

  for (const table of childTables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .in('in_game_character_id', characterIds);

    if (error) {
      throw new Error(`Failed to clear ${table}: ${error.message}`);
    }
  }

  const { error } = await supabase
    .from('in_game_characters')
    .delete()
    .in('id', characterIds);

  if (error) {
    throw new Error(`Failed to clear in-game characters: ${error.message}`);
  }
}

async function getPlayerParticipants(sessionId: string) {
  const { data, error } = await supabase
    .from('session_participants')
    .select('id, session_id, user_id, selected_character_id')
    .eq('session_id', sessionId)
    .eq('role', 'player')
    .order('joined_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load lobby players: ${error.message}`);
  }

  return (data ?? []) as PlayerParticipant[];
}

async function createPlaceholderInGameCharacter(participant: PlayerParticipant) {
  let inGameCharacterId: string | null = null;

  try {
    const { data, error } = await supabase
      .from('in_game_characters')
      .insert(createInGameCharacterPlaceholder(participant))
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create placeholder character: ${error.message}`);
    }

    inGameCharacterId = data.id as string;

    const defaults = createDefaultCharacterCollections();

    await insertRows(
      'in_game_character_attributes',
      defaults.attributes.map((attribute) => ({
        ...attribute,
        in_game_character_id: inGameCharacterId,
      }))
    );

    await insertRows(
      'in_game_character_parameters',
      defaults.parameters.map((parameter) => ({
        ...parameter,
        in_game_character_id: inGameCharacterId,
      }))
    );

    await insertInGameDomainTemplates(inGameCharacterId, defaults.domains);
  } catch (error) {
    if (inGameCharacterId) {
      await removeInGameCharacter(inGameCharacterId);
    }

    throw error;
  }
}

async function getSavedCharacter(characterId: string) {
  const { data, error } = await supabase
    .from('characters')
    .select('id, name, description, avatar_url')
    .eq('id', characterId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load selected character: ${error.message}`);
  }

  return (data as SavedCharacter | null) ?? null;
}

async function getSavedCharacterCollections(characterId: string) {
  const [
    attributesResult,
    parametersResult,
    domainsResult,
    inventoryItemsResult,
    notesResult,
    experiencesResult,
  ] = await Promise.all([
    supabase
      .from('character_attributes')
      .select('id, attribute_key, label, icon_key, value, sort_order, metadata')
      .eq('character_id', characterId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('character_parameters')
      .select('id, parameter_key, label, icon_key, current_value, max_value, sort_order, metadata')
      .eq('character_id', characterId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('character_domains')
      .select('id, domain_key, name, description, icon_key, level, sort_order, metadata')
      .eq('character_id', characterId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('character_inventory_items')
      .select('id, name, description, category, quantity, image_url, sort_order, metadata, asset_key')
      .eq('character_id', characterId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('character_notes')
      .select('id, title, content, canvas_x, canvas_y, sort_order, metadata')
      .eq('character_id', characterId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('character_experiences')
      .select('id, headline, description, xp, tag, session_label, happened_at, sort_order, metadata')
      .eq('character_id', characterId)
      .order('sort_order', { ascending: true }),
  ]);

  const results = [
    attributesResult,
    parametersResult,
    domainsResult,
    inventoryItemsResult,
    notesResult,
    experiencesResult,
  ];
  const failedResult = results.find((result) => result.error);

  if (failedResult?.error) {
    throw new Error(`Failed to load selected character data: ${failedResult.error.message}`);
  }

  return {
    attributes: (attributesResult.data ?? []) as SavedAttribute[],
    parameters: (parametersResult.data ?? []) as SavedParameter[],
    domains: (domainsResult.data ?? []) as SavedDomain[],
    inventoryItems: (inventoryItemsResult.data ?? []) as SavedInventoryItem[],
    notes: (notesResult.data ?? []) as SavedNote[],
    experiences: (experiencesResult.data ?? []) as SavedExperience[],
  };
}

async function copySavedDomains(inGameCharacterId: string, domains: SavedDomain[]) {
  if (!domains.length) return;

  const { data, error } = await supabase
    .from('in_game_character_domains')
    .insert(
      domains.map((domain) => ({
        in_game_character_id: inGameCharacterId,
        source_domain_id: domain.id,
        domain_key: domain.domain_key,
        name: domain.name,
        description: domain.description,
        icon_key: domain.icon_key,
        level: domain.level,
        sort_order: domain.sort_order,
        metadata: domain.metadata,
      }))
    )
    .select('id, source_domain_id');

  if (error) {
    throw new Error(`Failed to copy character domains: ${error.message}`);
  }

  const sourceDomainIds = domains.map((domain) => domain.id);
  const inGameDomainIdBySourceId = new Map(
    (data ?? []).map((domain) => [domain.source_domain_id as string, domain.id as string])
  );

  const { data: skills, error: skillsError } = await supabase
    .from('character_domain_skills')
    .select(
      'id, domain_id, skill_key, name, description, is_primary, level, sort_order, metadata'
    )
    .in('domain_id', sourceDomainIds)
    .order('sort_order', { ascending: true });

  if (skillsError) {
    throw new Error(`Failed to load character domain skills: ${skillsError.message}`);
  }

  const skillRows: Array<Record<string, unknown>> = [];

  for (const skill of (skills ?? []) as SavedDomainSkill[]) {
    const inGameDomainId = inGameDomainIdBySourceId.get(skill.domain_id);

    if (!inGameDomainId) {
      continue;
    }

    skillRows.push({
      in_game_domain_id: inGameDomainId,
      source_skill_id: skill.id,
      skill_key: skill.skill_key,
      name: skill.name,
      description: skill.description,
      is_primary: skill.is_primary,
      level: skill.level,
      sort_order: skill.sort_order,
      metadata: skill.metadata,
    });
  }

  await insertRows('in_game_character_domain_skills', skillRows);
}

function createFallbackParameters(attributes: SavedAttribute[]) {
  const healthValue = calculateCharacterHealth(attributes);

  return DEFAULT_CHARACTER_PARAMETERS.map((parameter) =>
    parameter.parameter_key === 'health'
      ? {
          ...parameter,
          current_value: healthValue,
          max_value: healthValue,
        }
      : { ...parameter }
  );
}

async function createSelectedInGameCharacter(
  participant: PlayerParticipant,
  selectedCharacter: SavedCharacter
) {
  let inGameCharacterId: string | null = null;

  try {
    const { data, error } = await supabase
      .from('in_game_characters')
      .insert({
        session_id: participant.session_id,
        participant_id: participant.id,
        user_id: participant.user_id,
        source_character_id: selectedCharacter.id,
        name: selectedCharacter.name,
        description: selectedCharacter.description,
        avatar_url: selectedCharacter.avatar_url,
        is_placeholder: false,
        save_status: 'temporary',
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create in-game character: ${error.message}`);
    }

    inGameCharacterId = data.id as string;

    const collections = await getSavedCharacterCollections(selectedCharacter.id);
    const fallbackDefaults = createDefaultCharacterCollections();
    const attributes =
      collections.attributes.length > 0
        ? collections.attributes
        : fallbackDefaults.attributes.map((attribute) => ({
            ...attribute,
            id: '',
          }));
    const parameters =
      collections.parameters.length > 0
        ? collections.parameters
        : createFallbackParameters(attributes).map((parameter) => ({
            ...parameter,
            id: '',
          }));

    await insertRows(
      'in_game_character_attributes',
      attributes.map((attribute) => ({
        in_game_character_id: inGameCharacterId,
        source_attribute_id: attribute.id || null,
        attribute_key: attribute.attribute_key,
        label: attribute.label,
        icon_key: attribute.icon_key,
        value: attribute.value,
        sort_order: attribute.sort_order,
        metadata: attribute.metadata,
      }))
    );

    await insertRows(
      'in_game_character_parameters',
      parameters.map((parameter) => ({
        in_game_character_id: inGameCharacterId,
        source_parameter_id: parameter.id || null,
        parameter_key: parameter.parameter_key,
        label: parameter.label,
        icon_key: parameter.icon_key,
        current_value: parameter.current_value,
        max_value: parameter.max_value,
        sort_order: parameter.sort_order,
        metadata: parameter.metadata,
      }))
    );

    if (collections.domains.length) {
      await copySavedDomains(inGameCharacterId, collections.domains);
    } else {
      await insertInGameDomainTemplates(
        inGameCharacterId,
        fallbackDefaults.domains
      );
    }

    await insertRows(
      'in_game_character_inventory_items',
      collections.inventoryItems.map((item) => ({
        in_game_character_id: inGameCharacterId,
        source_item_id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        image_url: item.image_url,
        sort_order: item.sort_order,
        metadata: item.metadata,
        asset_key: item.asset_key,
      }))
    );

    await insertRows(
      'in_game_character_notes',
      collections.notes.map((note) => ({
        in_game_character_id: inGameCharacterId,
        source_note_id: note.id,
        title: note.title,
        content: note.content,
        canvas_x: note.canvas_x,
        canvas_y: note.canvas_y,
        sort_order: note.sort_order,
        metadata: note.metadata,
      }))
    );

    await insertRows(
      'in_game_character_experiences',
      collections.experiences.map((experience) => ({
        in_game_character_id: inGameCharacterId,
        source_experience_id: experience.id,
        headline: experience.headline,
        description: experience.description,
        xp: experience.xp,
        tag: experience.tag,
        session_label: experience.session_label,
        happened_at: experience.happened_at,
        sort_order: experience.sort_order,
        metadata: experience.metadata,
      }))
    );
  } catch (error) {
    if (inGameCharacterId) {
      await removeInGameCharacter(inGameCharacterId);
    }

    throw error;
  }
}

async function createInGameCharacterForParticipant(participant: PlayerParticipant) {
  if (!participant.selected_character_id) {
    await createPlaceholderInGameCharacter(participant);
    return 'placeholder' as const;
  }

  const selectedCharacter = await getSavedCharacter(participant.selected_character_id);

  if (!selectedCharacter) {
    await createPlaceholderInGameCharacter(participant);
    return 'placeholder' as const;
  }

  await createSelectedInGameCharacter(participant, selectedCharacter);
  return 'selected' as const;
}

async function copyInventoryVisibilityForSession(sessionId: string) {
  const { data: characters, error: characterError } = await supabase
    .from('in_game_characters')
    .select('id, source_character_id')
    .eq('session_id', sessionId);
  if (characterError) throw new Error(`Failed to load visibility characters: ${characterError.message}`);
  const characterIdBySource = new Map(
    (characters ?? []).flatMap((character) => character.source_character_id
      ? [[character.source_character_id as string, character.id as string] as const]
      : [])
  );
  const characterIds = (characters ?? []).map((character) => character.id as string);
  if (!characterIds.length) return;
  const { data: items, error: itemError } = await supabase
    .from('in_game_character_inventory_items')
    .select('id, source_item_id')
    .in('in_game_character_id', characterIds)
    .not('source_item_id', 'is', null);
  if (itemError) throw new Error(`Failed to load visibility items: ${itemError.message}`);
  const itemIdBySource = new Map((items ?? []).map((item) => [item.source_item_id as string, item.id as string]));
  const sourceItemIds = [...itemIdBySource.keys()];
  if (!sourceItemIds.length) return;
  const { data: visibility, error: visibilityError } = await supabase
    .from('character_inventory_item_visibility')
    .select('inventory_item_id, viewer_character_id')
    .in('inventory_item_id', sourceItemIds);
  if (visibilityError) throw new Error(`Failed to load saved item visibility: ${visibilityError.message}`);
  await insertRows('in_game_character_inventory_item_visibility', (visibility ?? []).flatMap((row) => {
    const inventoryItemId = itemIdBySource.get(row.inventory_item_id as string);
    const viewerId = characterIdBySource.get(row.viewer_character_id as string);
    return inventoryItemId && viewerId ? [{ inventory_item_id: inventoryItemId, viewer_in_game_character_id: viewerId }] : [];
  }));
}

export async function prepareInGameCharactersForSession(sessionId: string) {
  try {
    const participants = await getPlayerParticipants(sessionId);
    let createdCount = 0;
    let placeholderCount = 0;
    let selectedCount = 0;

    await removeInGameCharactersForSession(sessionId);

    for (const participant of participants) {
      const createdType = await createInGameCharacterForParticipant(participant);

      createdCount += 1;

      if (createdType === 'selected') {
        selectedCount += 1;
      } else {
        placeholderCount += 1;
      }
    }

    await copyInventoryVisibilityForSession(sessionId);

    return {
      playerCount: participants.length,
      createdCount,
      placeholderCount,
      selectedCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to prepare in-game characters: ${message}`);
  }
}
