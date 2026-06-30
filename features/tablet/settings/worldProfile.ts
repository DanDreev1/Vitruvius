'use client';

import { supabase } from '@/lib/supabaseClient';

const WORLD_AVATAR_BUCKET = 'temporary-avatars';

export async function loadInGameWorldProfile(worldId: string) {
  const { data, error } = await supabase
    .from('in_game_worlds')
    .select('name, avatar_url')
    .eq('id', worldId)
    .single();

  if (error) throw new Error(error.message);
  return { name: data.name as string, avatarUrl: data.avatar_url as string | null };
}

export async function saveInGameWorldName(worldId: string, name: string) {
  const { error } = await supabase
    .from('in_game_worlds')
    .update({ name })
    .eq('id', worldId);

  if (error) throw new Error(error.message);
}

export async function saveInGameWorldAvatar({
  sessionId,
  worldId,
  file,
}: {
  sessionId: string;
  worldId: string;
  file: File;
}) {
  const objectPath = `sessions/${sessionId}/worlds/${worldId}/avatar`;
  const { error: uploadError } = await supabase.storage
    .from(WORLD_AVATAR_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '60',
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) throw new Error(`Failed to upload world image: ${uploadError.message}`);

  const { data } = supabase.storage.from(WORLD_AVATAR_BUCKET).getPublicUrl(objectPath);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
  const { error: updateError } = await supabase
    .from('in_game_worlds')
    .update({ avatar_url: avatarUrl })
    .eq('id', worldId);

  if (updateError) throw new Error(updateError.message);
  return avatarUrl;
}
