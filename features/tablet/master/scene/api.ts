import { supabase } from '@/lib/supabaseClient';
import {
  SCENE_IMAGE_STORAGE_BUCKET,
  SCENE_IMAGE_STORAGE_FOLDER,
  SCENE_MUSIC_STORAGE_BUCKET,
  SCENE_MUSIC_STORAGE_FOLDER,
} from './constants';
import type { SceneImageRecord, SceneMusicRecord } from './types';

import type { SceneAudienceTarget } from './types';

export const SCENE_IMAGES_CHANGED_EVENT = 'scene-images-changed';
export const SCENE_MUSIC_CHANGED_EVENT = 'scene-music-changed';
export const SCENE_MUSIC_LOCAL_CHANGED_EVENT = 'scene-music-local-changed';
export const SCENE_MUSIC_TIME_REQUEST_EVENT = 'scene-music-time-request';
export const SCENE_MUSIC_TIME_RESPONSE_EVENT = 'scene-music-time-response';

export function getSceneImagesRealtimeChannelName(sessionId: string) {
  return `scene-images-${sessionId}`;
}

export function getSceneMusicRealtimeChannelName(sessionId: string) {
  return `scene-music-${sessionId}`;
}

async function sendBroadcast(
  channelName: string,
  event: string,
  payload: Record<string, unknown>
) {
  const channel = supabase.channel(channelName);

  try {
    const isSubscribed = await new Promise<boolean>((resolve) => {
      const timeoutId = window.setTimeout(() => resolve(false), 3000);

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          window.clearTimeout(timeoutId);
          resolve(true);
        }
      });
    });

    if (!isSubscribed) {
      console.warn(`Realtime channel ${channelName} was not ready for broadcast.`);
      return;
    }

    await channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  } finally {
    void supabase.removeChannel(channel);
  }
}

export async function broadcastSceneImagesChanged(sessionId: string) {
  await sendBroadcast(
    getSceneImagesRealtimeChannelName(sessionId),
    SCENE_IMAGES_CHANGED_EVENT,
    {
      sessionId,
      changedAt: Date.now(),
    }
  );
}

type SceneMusicChangedPayload = {
  trackId?: string;
  currentTimeSeconds?: number;
  isPlaying?: boolean;
  isActive?: boolean;
};

export async function broadcastSceneMusicChanged(
  sessionId: string,
  payload: SceneMusicChangedPayload = {}
) {
  window.dispatchEvent(
    new CustomEvent(SCENE_MUSIC_LOCAL_CHANGED_EVENT, {
      detail: {
        sessionId,
        changedAt: Date.now(),
        ...payload,
      },
    })
  );

  await sendBroadcast(
    getSceneMusicRealtimeChannelName(sessionId),
    SCENE_MUSIC_CHANGED_EVENT,
    {
      sessionId,
      changedAt: Date.now(),
      ...payload,
    }
  );
}

export async function broadcastSceneMusicTimeResponse({
  sessionId,
  trackId,
  currentTimeSeconds,
  isPlaying,
}: {
  sessionId: string;
  trackId: string;
  currentTimeSeconds: number;
  isPlaying: boolean;
}) {
  await sendBroadcast(
    getSceneMusicRealtimeChannelName(sessionId),
    SCENE_MUSIC_TIME_RESPONSE_EVENT,
    {
      sessionId,
      trackId,
      currentTimeSeconds,
      isPlaying,
      respondedAt: Date.now(),
    }
  );
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

export async function getSceneMusicTargets(
  inGameSceneMusicId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('in_game_worlds_scene_music_targets')
    .select('in_game_character_id')
    .eq('in_game_scene_music_id', inGameSceneMusicId)
    .not('in_game_character_id', 'is', null);

  if (error) {
    throw new Error(`Failed to load scene music targets: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => row.in_game_character_id as string | null)
    .filter((value): value is string => Boolean(value));
}

export async function addSceneMusicTarget(
  inGameSceneMusicId: string,
  inGameCharacterId: string,
  sessionId: string
) {
  const { data: existingTarget, error: existingTargetError } = await supabase
    .from('in_game_worlds_scene_music_targets')
    .select('id')
    .eq('in_game_scene_music_id', inGameSceneMusicId)
    .eq('in_game_character_id', inGameCharacterId)
    .maybeSingle();

  if (existingTargetError) {
    throw new Error(`Failed to check scene music target: ${existingTargetError.message}`);
  }

  if (existingTarget) {
    await broadcastSceneMusicChanged(sessionId);
    return;
  }

  const { error } = await supabase
    .from('in_game_worlds_scene_music_targets')
    .insert({
      in_game_scene_music_id: inGameSceneMusicId,
      in_game_character_id: inGameCharacterId,
    });

  if (error) {
    throw new Error(`Failed to add scene music target: ${error.message}`);
  }

  await broadcastSceneMusicChanged(sessionId);
}

export async function removeSceneMusicTarget(
  inGameSceneMusicId: string,
  inGameCharacterId: string,
  sessionId: string
) {
  const { error } = await supabase
    .from('in_game_worlds_scene_music_targets')
    .delete()
    .eq('in_game_scene_music_id', inGameSceneMusicId)
    .eq('in_game_character_id', inGameCharacterId);

  if (error) {
    throw new Error(`Failed to remove scene music target: ${error.message}`);
  }

  await broadcastSceneMusicChanged(sessionId);
}

async function getNextSceneMusicSortOrder(inGameWorldId: string) {
  const { data, error } = await supabase
    .from('in_game_worlds_scene_music')
    .select('sort_order')
    .eq('in_game_world_id', inGameWorldId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get next scene music sort order: ${error.message}`);
  }

  return (data?.sort_order ?? -1) + 1;
}

export async function getInGameWorldSceneMusic(
  inGameWorldId: string
): Promise<SceneMusicRecord[]> {
  const { data, error } = await supabase
    .from('in_game_worlds_scene_music')
    .select('id, in_game_world_id, title, audio_url, cover_url, sort_order, is_active, is_playing, current_time_seconds, created_at, updated_at')
    .eq('in_game_world_id', inGameWorldId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to load scene music: ${error.message}`);
  }

  return (data ?? []) as SceneMusicRecord[];
}

async function uploadSceneMusicFile(
  inGameWorldId: string,
  file: File
) {
  const safeName = sanitizeFileName(file.name);
  const objectPath = `${SCENE_MUSIC_STORAGE_FOLDER}/${inGameWorldId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(SCENE_MUSIC_STORAGE_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '3600',
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload scene music: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from(SCENE_MUSIC_STORAGE_BUCKET)
    .getPublicUrl(objectPath);

  return {
    publicUrl: data.publicUrl,
    title: stripExtension(file.name) || 'Untitled track',
  };
}

export async function createInGameWorldSceneMusic(
  inGameWorldId: string,
  file: File,
  sessionId: string
) {
  const [{ publicUrl, title }, sortOrder] = await Promise.all([
    uploadSceneMusicFile(inGameWorldId, file),
    getNextSceneMusicSortOrder(inGameWorldId),
  ]);

  const { error } = await supabase
    .from('in_game_worlds_scene_music')
    .insert({
      in_game_world_id: inGameWorldId,
      title,
      audio_url: publicUrl,
      sort_order: sortOrder,
      is_active: false,
      is_playing: false,
      current_time_seconds: 0,
    });

  if (error) {
    throw new Error(`Failed to create scene music: ${error.message}`);
  }

  await broadcastSceneMusicChanged(sessionId);
}

export async function selectInGameWorldSceneMusic(
  inGameWorldId: string,
  musicId: string,
  sessionId: string
) {
  const { error: resetError } = await supabase
    .from('in_game_worlds_scene_music')
    .update({ is_active: false, is_playing: false })
    .eq('in_game_world_id', inGameWorldId);

  if (resetError) {
    throw new Error(`Failed to reset scene music selection: ${resetError.message}`);
  }

  const { error } = await supabase
    .from('in_game_worlds_scene_music')
    .update({
      is_active: true,
      is_playing: false,
      current_time_seconds: 0,
    })
    .eq('id', musicId)
    .eq('in_game_world_id', inGameWorldId);

  if (error) {
    throw new Error(`Failed to select scene music: ${error.message}`);
  }

  await broadcastSceneMusicChanged(sessionId, {
    trackId: musicId,
    currentTimeSeconds: 0,
    isActive: true,
    isPlaying: false,
  });
}

export async function playInGameWorldSceneMusic(
  inGameWorldId: string,
  musicId: string,
  currentTimeSeconds: number,
  sessionId: string
) {
  const { error: resetError } = await supabase
    .from('in_game_worlds_scene_music')
    .update({ is_active: false, is_playing: false })
    .eq('in_game_world_id', inGameWorldId)
    .neq('id', musicId);

  if (resetError) {
    throw new Error(`Failed to stop previous scene music: ${resetError.message}`);
  }

  const { error } = await supabase
    .from('in_game_worlds_scene_music')
    .update({
      is_active: true,
      is_playing: true,
      current_time_seconds: currentTimeSeconds,
    })
    .eq('id', musicId)
    .eq('in_game_world_id', inGameWorldId);

  if (error) {
    throw new Error(`Failed to play scene music: ${error.message}`);
  }

  await broadcastSceneMusicChanged(sessionId, {
    trackId: musicId,
    currentTimeSeconds,
    isActive: true,
    isPlaying: true,
  });
}

export async function pauseInGameWorldSceneMusic(
  musicId: string,
  currentTimeSeconds: number,
  sessionId: string
) {
  const { error } = await supabase
    .from('in_game_worlds_scene_music')
    .update({
      is_playing: false,
      current_time_seconds: currentTimeSeconds,
    })
    .eq('id', musicId);

  if (error) {
    throw new Error(`Failed to pause scene music: ${error.message}`);
  }

  await broadcastSceneMusicChanged(sessionId, {
    trackId: musicId,
    currentTimeSeconds,
    isActive: true,
    isPlaying: false,
  });
}

export async function updateInGameWorldSceneMusicTime(
  musicId: string,
  currentTimeSeconds: number
) {
  const { error } = await supabase
    .from('in_game_worlds_scene_music')
    .update({
      current_time_seconds: currentTimeSeconds,
    })
    .eq('id', musicId);

  if (error) {
    throw new Error(`Failed to save scene music time: ${error.message}`);
  }
}

function getSceneMusicStoragePathFromPublicUrl(audioUrl: string | null) {
  if (!audioUrl) return null;

  const marker = `/object/public/${SCENE_MUSIC_STORAGE_BUCKET}/`;
  const markerIndex = audioUrl.indexOf(marker);
  if (markerIndex === -1) return null;

  return decodeURIComponent(audioUrl.slice(markerIndex + marker.length));
}

export async function deleteInGameWorldSceneMusic(
  musicId: string,
  sessionId: string
) {
  const { data: musicRow, error: loadError } = await supabase
    .from('in_game_worlds_scene_music')
    .select('id, audio_url')
    .eq('id', musicId)
    .single();

  if (loadError) {
    throw new Error(`Failed to load scene music before delete: ${loadError.message}`);
  }

  const storagePath = getSceneMusicStoragePathFromPublicUrl(
    (musicRow?.audio_url as string | null) ?? null
  );

  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from(SCENE_MUSIC_STORAGE_BUCKET)
      .remove([storagePath]);

    if (storageError) {
      throw new Error(`Failed to delete scene music file: ${storageError.message}`);
    }
  }

  const { error } = await supabase
    .from('in_game_worlds_scene_music')
    .delete()
    .eq('id', musicId);

  if (error) {
    throw new Error(`Failed to delete scene music row: ${error.message}`);
  }

  await broadcastSceneMusicChanged(sessionId);
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

export async function getAvailablePlayerSceneMusic({
  sessionId,
  inGameWorldId,
  participantId,
}: {
  sessionId: string;
  inGameWorldId: string;
  participantId: string;
}): Promise<SceneMusicRecord | null> {
  const { data: characters, error: characterError } = await supabase
    .from('in_game_characters')
    .select('id')
    .eq('session_id', sessionId)
    .eq('participant_id', participantId);

  if (characterError) {
    throw new Error(`Failed to load player character for scene music: ${characterError.message}`);
  }

  const inGameCharacterIds = [
    ...new Set(
      (characters ?? [])
        .map((character) => character.id as string | null)
        .filter((value): value is string => Boolean(value))
    ),
  ];

  if (!inGameCharacterIds.length) {
    return null;
  }

  const { data: targetRows, error: targetsError } = await supabase
    .from('in_game_worlds_scene_music_targets')
    .select('in_game_scene_music_id')
    .in('in_game_character_id', inGameCharacterIds)
    .not('in_game_scene_music_id', 'is', null);

  if (targetsError) {
    throw new Error(`Failed to load available scene music targets: ${targetsError.message}`);
  }

  const musicIds = [
    ...new Set(
      (targetRows ?? [])
        .map((row) => row.in_game_scene_music_id as string | null)
        .filter((value): value is string => Boolean(value))
    ),
  ];

  if (!musicIds.length) {
    return null;
  }

  const { data, error } = await supabase
    .from('in_game_worlds_scene_music')
    .select('id, in_game_world_id, title, audio_url, cover_url, sort_order, is_active, is_playing, current_time_seconds, created_at, updated_at')
    .eq('in_game_world_id', inGameWorldId)
    .eq('is_active', true)
    .eq('is_playing', true)
    .in('id', musicIds)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load available scene music: ${error.message}`);
  }

  return (data as SceneMusicRecord | null) ?? null;
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

async function getSessionPlayerInGameCharacterIds(sessionId: string) {
  const { data, error } = await supabase
    .from('in_game_characters')
    .select('id')
    .eq('session_id', sessionId)
    .not('participant_id', 'is', null);

  if (error) {
    throw new Error(`Failed to load player character targets: ${error.message}`);
  }

  return (data ?? [])
    .map((character) => character.id as string | null)
    .filter((value): value is string => Boolean(value));
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

  const { data: image, error } = await supabase
    .from('in_game_worlds_scene_images')
    .insert({
      in_game_world_id: inGameWorldId,
      title,
      image_url: publicUrl,
      storage_path: storagePath,
      mime_type: mimeType,
      sort_order: sortOrder,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create scene image: ${error.message}`);
  }

  const characterIds = await getSessionPlayerInGameCharacterIds(sessionId);

  if (characterIds.length) {
    const { error: targetsError } = await supabase
      .from('in_game_worlds_scene_image_targets')
      .insert(
        characterIds.map((inGameCharacterId) => ({
          in_game_scene_image_id: image.id,
          in_game_character_id: inGameCharacterId,
        }))
      );

    if (targetsError) {
      throw new Error(`Failed to create scene image targets: ${targetsError.message}`);
    }
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
