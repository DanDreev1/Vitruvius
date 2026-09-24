'use client';

import { supabase } from '@/lib/supabaseClient';
import { createStorageReference, resolvePublicStorageUrl } from '@/lib/storageUrl';

export const PROFILE_UPDATED_EVENT = 'vitruvius-profile-updated';
export const PROFILE_AVATAR_BUCKET = 'profile-avatars';

export function getUserProfile(user: { user_metadata?: Record<string, unknown> }) {
  return {
    nickname: typeof user.user_metadata?.nickname === 'string' ? user.user_metadata.nickname : '',
    avatarUrl: typeof user.user_metadata?.avatar_url === 'string'
      ? resolvePublicStorageUrl(user.user_metadata.avatar_url, PROFILE_AVATAR_BUCKET)
      : null,
  };
}

function announceProfileUpdate() {
  window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
}

export async function saveProfileNickname(nickname: string) {
  if (!nickname.trim() || nickname.length > 36) {
    throw new Error('Nickname must be between 1 and 36 characters.');
  }
  const { data: current } = await supabase.auth.getUser();
  const { data, error } = await supabase.auth.updateUser({
    data: { ...(current.user?.user_metadata ?? {}), nickname },
  });
  if (error) throw new Error(error.message);
  announceProfileUpdate();
  return data.user;
}

export async function saveProfileAvatar(userId: string, file: File) {
  const path = `${userId}/avatar`;
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '60' });
  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(path);
  const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;
  const avatarReference = createStorageReference(PROFILE_AVATAR_BUCKET, path);
  const { data: current } = await supabase.auth.getUser();
  const { error } = await supabase.auth.updateUser({
    data: { ...(current.user?.user_metadata ?? {}), avatar_url: avatarReference },
  });
  if (error) throw new Error(error.message);
  announceProfileUpdate();
  return avatarUrl;
}

export async function deleteOwnAccount(nickname: string) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Authentication required.');
  const response = await fetch('/api/profile', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? 'Could not delete account.');
}
