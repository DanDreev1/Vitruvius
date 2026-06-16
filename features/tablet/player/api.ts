import { supabase } from '@/lib/supabaseClient';

import {
  PLAYER_TABLET_PORTRAIT_STORAGE_BUCKET,
  PLAYER_TABLET_PORTRAIT_STORAGE_FOLDER,
} from './constants';
import type {
  TabletPlayerAttribute,
  TabletPlayerCharacter,
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

  const [attributesResult, parametersResult] = await Promise.all([
    supabase
      .from('in_game_character_attributes')
      .select('id, attribute_key, label, icon_key, value, sort_order')
      .eq('in_game_character_id', characterRow.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('in_game_character_parameters')
      .select('id, parameter_key, label, icon_key, current_value, max_value, sort_order')
      .eq('in_game_character_id', characterRow.id)
      .order('sort_order', { ascending: true }),
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
  };
}

function hasCharacterPatch(patch: TabletPlayerCharacterSavePatch) {
  return patch.character && Object.keys(patch.character).length > 0;
}

export async function saveTabletPlayerCharacterPatch(
  patch: TabletPlayerCharacterSavePatch
) {
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

  if (!updateTasks.length) {
    return;
  }

  await Promise.all(updateTasks);
}

export async function uploadTabletPlayerPortrait(
  uploaderUserId: string,
  characterId: string,
  file: File
) {
  const version = Date.now();
  const objectPath = `${uploaderUserId}/${PLAYER_TABLET_PORTRAIT_STORAGE_FOLDER}/${characterId}/portrait`;

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
