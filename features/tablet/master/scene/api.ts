import { supabase } from '@/lib/supabaseClient';
import {
  SCENE_IMAGE_STORAGE_BUCKET,
  SCENE_IMAGE_STORAGE_FOLDER,
} from './constants';
import type { SceneImageRecord } from './types';

import type { SceneAudienceTarget } from './types';

export const SCENE_IMAGES_CHANGED_EVENT = 'scene-images-changed';

export function getSceneImagesRealtimeChannelName(sessionId: string) {
  return `scene-images-${sessionId}`;
}

export async function broadcastSceneImagesChanged(sessionId: string) {
  const channel = supabase.channel(getSceneImagesRealtimeChannelName(sessionId));

  try {
    await new Promise<void>((resolve) => {
      const timeoutId = window.setTimeout(resolve, 800);

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          window.clearTimeout(timeoutId);
          resolve();
        }
      });
    });

    await channel.send({
      type: 'broadcast',
      event: SCENE_IMAGES_CHANGED_EVENT,
      payload: {
        sessionId,
        changedAt: Date.now(),
      },
    });
  } finally {
    void supabase.removeChannel(channel);
  }
}

export async function getSceneImageAudience(
  sessionId: string
): Promise<SceneAudienceTarget[]> {
  const { data: participants, error: participantsError } = await supabase
    .from('session_participants')
    .select('id, display_name, avatar_url, role, joined_at')
    .eq('session_id', sessionId)
    .eq('role', 'player')
    .order('joined_at', { ascending: true });

  if (participantsError) {
    throw new Error(`Failed to load scene audience: ${participantsError.message}`);
  }

  const participantIds = (participants ?? []).map((participant) => participant.id as string);

  if (!participantIds.length) {
    return [];
  }

  const { data: inGameCharacters, error: charactersError } = await supabase
    .from('in_game_characters')
    .select('id, participant_id')
    .eq('session_id', sessionId)
    .in('participant_id', participantIds);

  if (charactersError) {
    throw new Error(`Failed to load in-game characters for scene audience: ${charactersError.message}`);
  }

  const characterIdByParticipantId = new Map(
    (inGameCharacters ?? []).map((character) => [
      character.participant_id as string,
      character.id as string,
    ])
  );

  return (participants ?? []).flatMap((participant) => {
    const inGameCharacterId = characterIdByParticipantId.get(participant.id as string);

    if (!inGameCharacterId) {
      return [];
    }

    return [
      {
        participantId: participant.id as string,
        inGameCharacterId,
        displayName: (participant.display_name as string | null) ?? 'Nickname',
        avatarUrl: (participant.avatar_url as string | null) ?? null,
        role: 'player' as const,
      },
    ];
  });
}

export async function getSceneImageTargets(
  inGameSceneImageId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('in_game_worlds_scene_image_targets')
    .select('in_game_character_id')
    .eq('in_game_scene_image_id', inGameSceneImageId)
    .not('in_game_character_id', 'is', null);

  if (error) {
    throw new Error(`Failed to load scene image targets: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => row.in_game_character_id as string | null)
    .filter((value): value is string => Boolean(value));
}

export async function addSceneImageTarget(
  inGameSceneImageId: string,
  inGameCharacterId: string,
  sessionId: string
) {
  const { error } = await supabase
    .from('in_game_worlds_scene_image_targets')
    .upsert(
        {
            in_game_scene_image_id: inGameSceneImageId,
            in_game_character_id: inGameCharacterId,
        },
        {
            onConflict: 'in_game_scene_image_id,in_game_character_id',
            ignoreDuplicates: true,
        }
    );

  if (error) {
    throw new Error(`Failed to add scene image target: ${error.message}`);
  }

  await broadcastSceneImagesChanged(sessionId);
}

export async function removeSceneImageTarget(
  inGameSceneImageId: string,
  inGameCharacterId: string,
  sessionId: string
) {
  const { error } = await supabase
    .from('in_game_worlds_scene_image_targets')
    .delete()
    .eq('in_game_scene_image_id', inGameSceneImageId)
    .eq('in_game_character_id', inGameCharacterId);

  if (error) {
    throw new Error(`Failed to remove scene image target: ${error.message}`);
  }

  await broadcastSceneImagesChanged(sessionId);
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '').toLowerCase();
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '');
}

async function getNextSceneImageSortOrder(inGameWorldId: string) {
  const { data, error } = await supabase
    .from('in_game_worlds_scene_images')
    .select('sort_order')
    .eq('in_game_world_id', inGameWorldId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get next scene image sort order: ${error.message}`);
  }

  return (data?.sort_order ?? -1) + 1;
}

export async function getInGameWorldSceneImages(
  inGameWorldId: string
): Promise<SceneImageRecord[]> {
  const { data, error } = await supabase
    .from('in_game_worlds_scene_images')
    .select('id, in_game_world_id, title, image_url, sort_order, is_active, created_at, updated_at')
    .eq('in_game_world_id', inGameWorldId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to load scene images: ${error.message}`);
  }

  return (data ?? []) as SceneImageRecord[];
}

export async function getAvailablePlayerSceneImages({
  sessionId,
  inGameWorldId,
  participantId,
}: {
  sessionId: string;
  inGameWorldId: string;
  participantId: string;
}): Promise<SceneImageRecord[]> {
  const { data: characters, error: characterError } = await supabase
    .from('in_game_characters')
    .select('id')
    .eq('session_id', sessionId)
    .eq('participant_id', participantId);

  if (characterError) {
    throw new Error(`Failed to load player character for scene images: ${characterError.message}`);
  }

  const inGameCharacterIds = [
    ...new Set(
      (characters ?? [])
        .map((character) => character.id as string | null)
        .filter((value): value is string => Boolean(value))
    ),
  ];

  if (!inGameCharacterIds.length) {
    return [];
  }

  const { data: targetRows, error: targetsError } = await supabase
    .from('in_game_worlds_scene_image_targets')
    .select('in_game_scene_image_id')
    .in('in_game_character_id', inGameCharacterIds)
    .not('in_game_scene_image_id', 'is', null);

  if (targetsError) {
    throw new Error(`Failed to load available scene image targets: ${targetsError.message}`);
  }

  const imageIds = [
    ...new Set(
      (targetRows ?? [])
        .map((row) => row.in_game_scene_image_id as string | null)
        .filter((value): value is string => Boolean(value))
    ),
  ];

  if (!imageIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('in_game_worlds_scene_images')
    .select('id, in_game_world_id, title, image_url, sort_order, is_active, created_at, updated_at')
    .eq('in_game_world_id', inGameWorldId)
    .eq('is_active', true)
    .in('id', imageIds)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to load available scene images: ${error.message}`);
  }

  return (data ?? []) as SceneImageRecord[];
}

async function uploadSceneImageFile(
  inGameWorldId: string,
  file: File
) {
  const safeName = sanitizeFileName(file.name);
  const objectPath = `${SCENE_IMAGE_STORAGE_FOLDER}/${inGameWorldId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(SCENE_IMAGE_STORAGE_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload scene image: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from(SCENE_IMAGE_STORAGE_BUCKET)
    .getPublicUrl(objectPath);

  return {
    publicUrl: data.publicUrl,
    storagePath: objectPath,
    mimeType: file.type || null,
    title: stripExtension(file.name) || 'Untitled image',
  };
}

export async function createInGameWorldSceneImage(
  inGameWorldId: string,
  file: File,
  sessionId: string
) {
  const [{ publicUrl, storagePath, mimeType, title }, sortOrder] = await Promise.all([
    uploadSceneImageFile(inGameWorldId, file),
    getNextSceneImageSortOrder(inGameWorldId),
  ]);

  const { error } = await supabase
    .from('in_game_worlds_scene_images')
    .insert({
      in_game_world_id: inGameWorldId,
      title,
      image_url: publicUrl,
      storage_path: storagePath,
      mime_type: mimeType,
      sort_order: sortOrder,
      is_active: false,
    });

  if (error) {
    throw new Error(`Failed to create scene image: ${error.message}`);
  }

  await broadcastSceneImagesChanged(sessionId);
}

export async function deleteInGameWorldSceneImage(
  imageId: string,
  sessionId: string
) {
  const { data: imageRow, error: loadError } = await supabase
    .from('in_game_worlds_scene_images')
    .select('id, storage_path')
    .eq('id', imageId)
    .single();

  if (loadError) {
    throw new Error(`Failed to load scene image before delete: ${loadError.message}`);
  }

  if (imageRow?.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(SCENE_IMAGE_STORAGE_BUCKET)
      .remove([imageRow.storage_path]);

    if (storageError) {
      throw new Error(`Failed to delete scene image file: ${storageError.message}`);
    }
  }

  const { error } = await supabase
    .from('in_game_worlds_scene_images')
    .delete()
    .eq('id', imageId);

  if (error) {
    throw new Error(`Failed to delete scene image row: ${error.message}`);
  }

  await broadcastSceneImagesChanged(sessionId);
}

export async function updateInGameWorldSceneImageActive(
  imageId: string,
  isActive: boolean,
  sessionId: string
) {
  const { error } = await supabase
    .from('in_game_worlds_scene_images')
    .update({ is_active: isActive })
    .eq('id', imageId);

  if (error) {
    throw new Error(`Failed to update scene image visibility: ${error.message}`);
  }

  await broadcastSceneImagesChanged(sessionId);
}

export async function getInGameWorldBySessionId(sessionId: string) {
  const { data, error } = await supabase
    .from('in_game_worlds')
    .select('id, live_session_id')
    .eq('live_session_id', sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ?? null;
}
