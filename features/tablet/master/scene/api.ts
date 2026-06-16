import { supabase } from '@/lib/supabaseClient';
import {
  SCENE_IMAGE_STORAGE_BUCKET,
  SCENE_IMAGE_STORAGE_FOLDER,
} from './constants';
import type { SceneImageRecord } from './types';

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
  file: File
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
}

export async function deleteInGameWorldSceneImage(imageId: string) {
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
}

export async function updateInGameWorldSceneImageActive(
  imageId: string,
  isActive: boolean
) {
  const { error } = await supabase
    .from('in_game_worlds_scene_images')
    .update({ is_active: isActive })
    .eq('id', imageId);

  if (error) {
    throw new Error(`Failed to update scene image visibility: ${error.message}`);
  }
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