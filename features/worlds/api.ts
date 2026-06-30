import { createInGameWorldPlaceholder } from '@/features/worlds/defaults';
import type { SessionParticipant } from '@/features/lobby/types';
import { supabase } from '@/lib/supabaseClient';

type MasterParticipant = Pick<
  SessionParticipant,
  'id' | 'session_id' | 'user_id' | 'selected_world_id' | 'role'
>;

type SavedWorld = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type SavedSceneImage = {
  id: string;
  title: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};

type SavedSceneImageTarget = {
  world_scene_image_id: string;
  character_id: string;
};

type SavedSceneMusic = {
  id: string;
  title: string;
  audio_url: string;
  cover_url: string | null;
  sort_order: number;
  is_active: boolean;
};

type SavedSceneMusicTarget = {
  world_scene_music_id: string;
  character_id: string;
};

type SavedWorldNote = {
  id: string;
  title: string;
  content: string;
  position_x: number;
  position_y: number;
};

type SavedRelationshipNpc = {
  id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  sort_order: number;
};

type SavedRelationshipLink = {
  id: string;
  world_relationship_npc_id: string;
  character_id: string;
  relationship_value: number;
  is_visible_to_player: boolean;
};

type SavedAsset = {
  id: string;
  asset_key: string;
  name: string;
  description: string;
  category: string;
  image_url: string;
  sort_order: number;
};

type PrepareInGameWorldResult = {
  createdType: 'placeholder' | 'selected';
  selectedWorldId: string | null;
};

async function insertRows(table: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;

  const { error } = await supabase.from(table).insert(rows);

  if (error) {
    throw new Error(`Failed to insert ${table}: ${error.message}`);
  }
}

async function getMasterParticipant(sessionId: string) {
  const { data, error } = await supabase
    .from('session_participants')
    .select('id, session_id, user_id, selected_world_id, role')
    .eq('session_id', sessionId)
    .eq('participation_status', 'active')
    .eq('role', 'master')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load session master: ${error.message}`);
  }

  return (data as MasterParticipant | null) ?? null;
}

async function removeInGameWorldForSession(sessionId: string) {
  const { error } = await supabase
    .from('in_game_worlds')
    .delete()
    .eq('live_session_id', sessionId);

  if (error) {
    throw new Error(`Failed to clear in-game world: ${error.message}`);
  }
}

async function createPlaceholderInGameWorld(masterParticipant: MasterParticipant) {
  const { data, error } = await supabase
    .from('in_game_worlds')
    .insert(createInGameWorldPlaceholder(masterParticipant))
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create placeholder in-game world: ${error.message}`);
  }

  return data.id as string;
}

async function getSavedWorld(worldId: string) {
  const { data, error } = await supabase
    .from('worlds')
    .select('id, name, avatar_url')
    .eq('id', worldId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load selected world: ${error.message}`);
  }

  return (data as SavedWorld | null) ?? null;
}

async function getSavedWorldCollections(worldId: string) {
  const { data: imageIdsData, error: imageIdsError } = await supabase
    .from('worlds_scene_images')
    .select('id')
    .eq('world_id', worldId);

  if (imageIdsError) {
    throw new Error(`Failed to load world image ids: ${imageIdsError.message}`);
  }

  const worldSceneImageIds = (imageIdsData ?? []).map((row) => row.id as string);

  const { data: musicIdsData, error: musicIdsError } = await supabase
    .from('worlds_scene_music')
    .select('id')
    .eq('world_id', worldId);

  if (musicIdsError) {
    throw new Error(`Failed to load world music ids: ${musicIdsError.message}`);
  }

  const worldSceneMusicIds = (musicIdsData ?? []).map((row) => row.id as string);

  const { data: npcIdsData, error: npcIdsError } = await supabase
    .from('worlds_relationship_npcs')
    .select('id')
    .eq('world_id', worldId);

  if (npcIdsError) {
    throw new Error(`Failed to load world npc ids: ${npcIdsError.message}`);
  }

  const worldRelationshipNpcIds = (npcIdsData ?? []).map((row) => row.id as string);

  const [
    sceneImagesResult,
    sceneImageTargetsResult,
    sceneMusicResult,
    sceneMusicTargetsResult,
    notesResult,
    relationshipNpcsResult,
    relationshipLinksResult,
    assetsResult,
  ] = await Promise.all([
    supabase
      .from('worlds_scene_images')
      .select('id, title, image_url, sort_order, is_active')
      .eq('world_id', worldId)
      .order('sort_order', { ascending: true }),

    worldSceneImageIds.length
      ? supabase
          .from('worlds_scene_image_targets')
          .select('world_scene_image_id, character_id')
          .in('world_scene_image_id', worldSceneImageIds)
      : Promise.resolve({ data: [], error: null }),

    supabase
      .from('worlds_scene_music')
      .select('id, title, audio_url, cover_url, sort_order, is_active')
      .eq('world_id', worldId)
      .order('sort_order', { ascending: true }),

    worldSceneMusicIds.length
      ? supabase
          .from('worlds_scene_music_targets')
          .select('world_scene_music_id, character_id')
          .in('world_scene_music_id', worldSceneMusicIds)
      : Promise.resolve({ data: [], error: null }),

    supabase
      .from('worlds_notes')
      .select('id, title, content, position_x, position_y')
      .eq('world_id', worldId),

    supabase
      .from('worlds_relationship_npcs')
      .select('id, name, description, avatar_url, sort_order')
      .eq('world_id', worldId)
      .order('sort_order', { ascending: true }),

    worldRelationshipNpcIds.length
      ? supabase
          .from('worlds_relationship_links')
          .select(
            'id, world_relationship_npc_id, character_id, relationship_value, is_visible_to_player'
          )
          .in('world_relationship_npc_id', worldRelationshipNpcIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('worlds_assets')
      .select('id, asset_key, name, description, category, image_url, sort_order')
      .eq('world_id', worldId)
      .order('sort_order', { ascending: true }),
  ]);

  const results = [
    sceneImagesResult,
    sceneImageTargetsResult,
    sceneMusicResult,
    sceneMusicTargetsResult,
    notesResult,
    relationshipNpcsResult,
    relationshipLinksResult,
    assetsResult,
  ];

  const failedResult = results.find((result) => result?.error);

  if (failedResult?.error) {
    throw new Error(`Failed to load selected world data: ${failedResult.error.message}`);
  }

  return {
    sceneImages: (sceneImagesResult.data ?? []) as SavedSceneImage[],
    sceneImageTargets: (sceneImageTargetsResult.data ?? []) as SavedSceneImageTarget[],
    sceneMusic: (sceneMusicResult.data ?? []) as SavedSceneMusic[],
    sceneMusicTargets: (sceneMusicTargetsResult.data ?? []) as SavedSceneMusicTarget[],
    notes: (notesResult.data ?? []) as SavedWorldNote[],
    relationshipNpcs: (relationshipNpcsResult.data ?? []) as SavedRelationshipNpc[],
    relationshipLinks: (relationshipLinksResult.data ?? []) as SavedRelationshipLink[],
    assets: (assetsResult.data ?? []) as SavedAsset[],
  };
}

async function getInGameCharacterIdBySourceCharacterId(sessionId: string) {
  const { data, error } = await supabase
    .from('in_game_characters')
    .select('id, source_character_id')
    .eq('session_id', sessionId);

  if (error) {
    throw new Error(`Failed to load in-game characters: ${error.message}`);
  }

  return new Map(
    (data ?? [])
      .filter((row) => row.source_character_id)
      .map((row) => [row.source_character_id as string, row.id as string])
  );
}

async function createSelectedInGameWorld(
  masterParticipant: MasterParticipant,
  selectedWorld: SavedWorld
) {
  let inGameWorldId: string | null = null;

  try {
    const { data, error } = await supabase
      .from('in_game_worlds')
      .insert({
        live_session_id: masterParticipant.session_id,
        source_world_id: selectedWorld.id,
        name: selectedWorld.name,
        avatar_url: selectedWorld.avatar_url,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create in-game world: ${error.message}`);
    }

    inGameWorldId = data.id as string;

    const collections = await getSavedWorldCollections(selectedWorld.id);
    const inGameCharacterIdBySourceCharacterId =
      await getInGameCharacterIdBySourceCharacterId(masterParticipant.session_id);

    const { data: insertedImages, error: imagesError } = await supabase
      .from('in_game_worlds_scene_images')
      .insert(
        collections.sceneImages.map((image) => ({
          in_game_world_id: inGameWorldId,
          source_scene_image_id: image.id,
          title: image.title,
          image_url: image.image_url,
          sort_order: image.sort_order,
          is_active: image.is_active,
        }))
      )
      .select('id, source_scene_image_id');

    if (imagesError) {
      throw new Error(`Failed to copy world images: ${imagesError.message}`);
    }

    const inGameImageIdBySourceImageId = new Map(
      (insertedImages ?? []).map((row) => [
        row.source_scene_image_id as string,
        row.id as string,
      ])
    );

    const { data: insertedMusic, error: musicError } = await supabase
      .from('in_game_worlds_scene_music')
      .insert(
        collections.sceneMusic.map((music) => ({
          in_game_world_id: inGameWorldId,
          source_scene_music_id: music.id,
          title: music.title,
          audio_url: music.audio_url,
          cover_url: music.cover_url,
          sort_order: music.sort_order,
          is_active: music.is_active,
          is_playing: false,
          current_time_seconds: 0,
        }))
      )
      .select('id, source_scene_music_id');

    if (musicError) {
      throw new Error(`Failed to copy world music: ${musicError.message}`);
    }

    const inGameMusicIdBySourceMusicId = new Map(
      (insertedMusic ?? []).map((row) => [
        row.source_scene_music_id as string,
        row.id as string,
      ])
    );

    await insertRows(
      'in_game_worlds_notes',
      collections.notes.map((note) => ({
        in_game_world_id: inGameWorldId,
        title: note.title,
        content: note.content,
        position_x: note.position_x,
        position_y: note.position_y,
      }))
    );

    await insertRows(
      'in_game_worlds_assets',
      collections.assets.map((asset) => ({
        in_game_world_id: inGameWorldId,
        source_asset_id: asset.id,
        asset_key: asset.asset_key,
        name: asset.name,
        description: asset.description,
        category: asset.category,
        image_url: asset.image_url,
        sort_order: asset.sort_order,
      }))
    );

    const { data: insertedNpcs, error: npcsError } = await supabase
      .from('in_game_worlds_relationship_npcs')
      .insert(
        collections.relationshipNpcs.map((npc) => ({
          in_game_world_id: inGameWorldId,
          source_relationship_npc_id: npc.id,
          name: npc.name,
          description: npc.description,
          avatar_url: npc.avatar_url,
          sort_order: npc.sort_order,
        }))
      )
      .select('id, source_relationship_npc_id');

    if (npcsError) {
      throw new Error(`Failed to copy world NPCs: ${npcsError.message}`);
    }

    const inGameNpcIdBySourceNpcId = new Map(
      (insertedNpcs ?? []).map((row) => [
        row.source_relationship_npc_id as string,
        row.id as string,
      ])
    );

    await insertRows(
      'in_game_worlds_scene_image_targets',
      collections.sceneImageTargets.flatMap((target) => {
        const inGameImageId = inGameImageIdBySourceImageId.get(target.world_scene_image_id);
        const inGameCharacterId = inGameCharacterIdBySourceCharacterId.get(target.character_id);

        if (!inGameImageId || !inGameCharacterId) {
          return [];
        }

        return [
          {
            in_game_scene_image_id: inGameImageId,
            in_game_character_id: inGameCharacterId,
          },
        ];
      })
    );

    await insertRows(
      'in_game_worlds_scene_music_targets',
      collections.sceneMusicTargets.flatMap((target) => {
        const inGameMusicId = inGameMusicIdBySourceMusicId.get(target.world_scene_music_id);
        const inGameCharacterId = inGameCharacterIdBySourceCharacterId.get(target.character_id);

        if (!inGameMusicId || !inGameCharacterId) {
          return [];
        }

        return [
          {
            in_game_scene_music_id: inGameMusicId,
            in_game_character_id: inGameCharacterId,
          },
        ];
      })
    );

    const relationshipLinkRows = collections.relationshipLinks.flatMap((link) => {
        const inGameNpcId = inGameNpcIdBySourceNpcId.get(link.world_relationship_npc_id);
        const inGameCharacterId = inGameCharacterIdBySourceCharacterId.get(link.character_id);

        if (!inGameNpcId || !inGameCharacterId) {
          return [];
        }

        return [
          {
            in_game_npc_id: inGameNpcId,
            in_game_character_id: inGameCharacterId,
            relationship_value: link.relationship_value,
            is_visible_to_player: link.is_visible_to_player,
          },
        ];
      });

    if (relationshipLinkRows.length) {
      const { error: relationshipLinksError } = await supabase
        .from('in_game_worlds_relationship_links')
        .upsert(relationshipLinkRows, {
          onConflict: 'in_game_npc_id,in_game_character_id',
        });

      if (relationshipLinksError) {
        throw new Error(
          `Failed to copy world relationship links: ${relationshipLinksError.message}`
        );
      }
    }
  } catch (error) {
    if (inGameWorldId) {
      await removeInGameWorldForSession(masterParticipant.session_id);
    }

    throw error;
  }
}

async function createInGameWorldForSession(masterParticipant: MasterParticipant) {
  if (!masterParticipant.selected_world_id) {
    await createPlaceholderInGameWorld(masterParticipant);
    return 'placeholder' as const;
  }

  const selectedWorld = await getSavedWorld(masterParticipant.selected_world_id);

  if (!selectedWorld) {
    await createPlaceholderInGameWorld(masterParticipant);
    return 'placeholder' as const;
  }

  await createSelectedInGameWorld(masterParticipant, selectedWorld);
  return 'selected' as const;
}

export async function prepareInGameWorldForSession(
  sessionId: string
): Promise<PrepareInGameWorldResult> {
  try {
    const masterParticipant = await getMasterParticipant(sessionId);

    if (!masterParticipant) {
      throw new Error('Master participant was not found');
    }

    await removeInGameWorldForSession(sessionId);

    const createdType = await createInGameWorldForSession(masterParticipant);

    return {
      createdType,
      selectedWorldId: masterParticipant.selected_world_id ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to prepare in-game world: ${message}`);
  }
}

export async function getInGameWorldBySessionId(sessionId: string) {
  const { data, error } = await supabase
    .from('in_game_worlds')
    .select('id, live_session_id')
    .eq('live_session_id', sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}
