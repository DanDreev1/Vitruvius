import 'server-only';

import type { User } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

import {
  createSupabaseAdmin,
  createSupabaseUserClient,
} from '@/lib/supabaseAdmin';
import type { PendingSessionExit } from './types';

export async function authenticateSessionExitRequest(request: Request) {
  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;

  if (!accessToken) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return {
    admin,
    userClient: createSupabaseUserClient(accessToken),
    user: data.user,
    accessToken,
  };
}

export function isAnonymousUser(user: User) {
  return user.is_anonymous === true;
}

export async function preserveEndedSessionBeforeUserDeletion(
  admin: ReturnType<typeof createSupabaseAdmin>,
  sessionId: string,
  userId: string
) {
  const { data: session, error: sessionError } = await admin
    .from('live_sessions')
    .select('created_by, phase')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionError) throw new Error(sessionError.message);
  if (!session || session.created_by !== userId || session.phase !== 'ended') return;

  const { data: replacement, error: replacementError } = await admin
    .from('session_participants')
    .select('user_id')
    .eq('session_id', sessionId)
    .neq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (replacementError) throw new Error(replacementError.message);
  if (!replacement) return;

  const { error: updateError } = await admin
    .from('live_sessions')
    .update({ created_by: replacement.user_id })
    .eq('id', sessionId)
    .eq('created_by', userId)
    .eq('phase', 'ended');
  if (updateError) throw new Error(updateError.message);
}

type PendingRow = {
  participant_id: string;
  session_id: string;
  session_code: string;
  role: 'master' | 'player';
  cleanup_at: string;
  in_game_character_id: string | null;
  source_character_id: string | null;
  in_game_world_id: string | null;
  source_world_id: string | null;
};

export function mapPendingSessionExit(row: PendingRow | null): PendingSessionExit | null {
  if (!row) return null;

  return {
    participantId: row.participant_id,
    sessionId: row.session_id,
    sessionCode: row.session_code,
    role: row.role,
    cleanupAt: row.cleanup_at,
    inGameCharacterId: row.in_game_character_id,
    sourceCharacterId: row.source_character_id,
    inGameWorldId: row.in_game_world_id,
    sourceWorldId: row.source_world_id,
  };
}

export async function getPendingSessionExit(
  userClient: ReturnType<typeof createSupabaseUserClient>
) {
  const { data, error } = await userClient.rpc('get_my_pending_session_exit');
  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? (data[0] as PendingRow | undefined) : null;
  return mapPendingSessionExit(row ?? null);
}

export async function removeStoragePrefix(
  admin: ReturnType<typeof createSupabaseAdmin>,
  bucket: string,
  prefix: string
) {
  const paths: string[] = [];
  const folders = [prefix];

  while (folders.length) {
    const folder = folders.pop() as string;
    const { data, error } = await admin.storage.from(bucket).list(folder, {
      limit: 1000,
    });
    if (error) continue;

    for (const entry of data ?? []) {
      const path = `${folder}/${entry.name}`;
      if (entry.id) paths.push(path);
      else folders.push(path);
    }
  }

  if (paths.length) {
    const { error } = await admin.storage.from(bucket).remove(paths);
    if (error) throw new Error(error.message);
  }
}

export async function removeTemporaryExitFiles(
  admin: ReturnType<typeof createSupabaseAdmin>,
  pending: PendingSessionExit
) {
  const temporaryBuckets = [
    'temporary-avatars',
    'temporary-asset-images',
    'temporary-relationship-npc-images',
    'temporary-scene-images',
    'temporary-scene-music',
  ];

  const entityPrefix =
    pending.role === 'master'
      ? `sessions/${pending.sessionId}/worlds/${pending.inGameWorldId}`
      : `sessions/${pending.sessionId}/characters/${pending.inGameCharacterId}`;
  const participantPrefix = `sessions/${pending.sessionId}/participants/${pending.participantId}`;

  await Promise.all(temporaryBuckets.flatMap((bucket) => [
    removeStoragePrefix(admin, bucket, entityPrefix),
    removeStoragePrefix(admin, bucket, participantPrefix),
  ]));
}

export async function removeAllTemporarySessionFiles(
  admin: ReturnType<typeof createSupabaseAdmin>,
  sessionId: string
) {
  const temporaryBuckets = [
    'temporary-avatars',
    'temporary-asset-images',
    'temporary-relationship-npc-images',
    'temporary-scene-images',
    'temporary-scene-music',
  ];
  await Promise.all(
    temporaryBuckets.map((bucket) =>
      removeStoragePrefix(admin, bucket, `sessions/${sessionId}`)
    )
  );
}

export async function cleanupResolvedSessionFiles(
  admin: ReturnType<typeof createSupabaseAdmin>,
  sessionId: string
) {
  const { count, error } = await admin
    .from('session_participants')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);
  if (error) throw new Error(error.message);
  if ((count ?? 0) === 0) {
    await removeAllTemporarySessionFiles(admin, sessionId);
    const { data: queuedFiles, error: queuedError } = await admin
      .from('session_exit_file_deletions')
      .select('bucket_id, object_path')
      .eq('session_id', sessionId);
    if (queuedError) throw new Error(queuedError.message);
    const pathsByBucket = new Map<string, string[]>();
    for (const file of queuedFiles ?? []) {
      pathsByBucket.set(file.bucket_id, [
        ...(pathsByBucket.get(file.bucket_id) ?? []),
        file.object_path,
      ]);
    }
    for (const [bucket, paths] of pathsByBucket) {
      if (paths.length) await admin.storage.from(bucket).remove(paths);
    }
    await admin.from('session_exit_file_deletions').delete().eq('session_id', sessionId);
  }
}

export async function queueOverwrittenFiles(
  admin: ReturnType<typeof createSupabaseAdmin>,
  pending: PendingSessionExit,
  destinationId: string
) {
  const files: Array<{ session_id: string; bucket_id: string; object_path: string }> = [];
  const add = (bucket: string, value: string | null | undefined) => {
    if (!value) return;
    const path = getStoragePath(value, bucket);
    if (path) files.push({ session_id: pending.sessionId, bucket_id: bucket, object_path: path });
  };

  if (pending.role === 'player') {
    const [characterResult, itemsResult] = await Promise.all([
      admin.from('characters').select('avatar_url').eq('id', destinationId).maybeSingle(),
      admin.from('character_inventory_items').select('image_url').eq('character_id', destinationId),
    ]);
    add('character-avatars', characterResult.data?.avatar_url);
    for (const item of itemsResult.data ?? []) add('asset-images', item.image_url);
  } else {
    const [worldResult, assetsResult, imagesResult, musicResult, npcsResult] = await Promise.all([
      admin.from('worlds').select('avatar_url').eq('id', destinationId).maybeSingle(),
      admin.from('worlds_assets').select('image_url').eq('world_id', destinationId),
      admin.from('worlds_scene_images').select('image_url').eq('world_id', destinationId),
      admin.from('worlds_scene_music').select('audio_url, cover_url').eq('world_id', destinationId),
      admin.from('worlds_relationship_npcs').select('avatar_url').eq('world_id', destinationId),
    ]);
    add('world-avatars', worldResult.data?.avatar_url);
    for (const asset of assetsResult.data ?? []) add('asset-images', asset.image_url);
    for (const image of imagesResult.data ?? []) add('scene-images', image.image_url);
    for (const music of musicResult.data ?? []) {
      add('scene-music', music.audio_url);
      add('scene-images', music.cover_url);
    }
    for (const npc of npcsResult.data ?? []) add('relationship-npc-images', npc.avatar_url);
  }

  if (files.length) {
    const { error } = await admin.from('session_exit_file_deletions').upsert(files, {
      onConflict: 'session_id,bucket_id,object_path',
    });
    if (error) throw new Error(error.message);
  }
}

function getStoragePath(value: string, bucket: string) {
  if (!/^https?:\/\//i.test(value)) return value;
  const marker = `/object/public/${bucket}/`;
  const markerIndex = value.indexOf(marker);
  if (markerIndex < 0) return null;
  return decodeURIComponent(value.slice(markerIndex + marker.length).split('?')[0]);
}

function getCopiedFileName(value: string) {
  const cleanValue = value.split('?')[0];
  const originalName = cleanValue.slice(cleanValue.lastIndexOf('/') + 1) || 'file';
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '-');
  const digest = createHash('sha256').update(value).digest('hex').slice(0, 16);
  return `${digest}-${safeName}`;
}

function collectStringValues(value: unknown, output = new Set<string>()) {
  if (typeof value === 'string') output.add(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStringValues(item, output));
  else if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) =>
      collectStringValues(item, output)
    );
  }
  return output;
}

function isStorageReference(value: string, buckets: string[]) {
  if (/^https?:\/\//i.test(value)) {
    return buckets.some((bucket) => value.includes(`/object/public/${bucket}/`));
  }
  return value.includes('/');
}

async function copyStorageReference({
  admin,
  value,
  sourceBuckets,
  destinationBucket,
  destinationFolder,
  publicDestination,
}: {
  admin: ReturnType<typeof createSupabaseAdmin>;
  value: string | null;
  sourceBuckets: string[];
  destinationBucket: string;
  destinationFolder: string;
  publicDestination: boolean;
}) {
  if (!value) return null;
  const destinationPath = `${destinationFolder}/${getCopiedFileName(value)}`;
  let lastError: Error | null = null;

  for (const sourceBucket of sourceBuckets) {
    const sourcePath = getStoragePath(value, sourceBucket);
    if (!sourcePath) continue;
    await admin.storage.from(destinationBucket).remove([destinationPath]);
    const { error } = await admin.storage
      .from(sourceBucket)
      .copy(sourcePath, destinationPath, {
        destinationBucket,
      });
    if (!error) {
      return publicDestination
        ? admin.storage.from(destinationBucket).getPublicUrl(destinationPath).data.publicUrl
        : destinationPath;
    }
    const { data: downloaded, error: downloadError } = await admin.storage
      .from(sourceBucket)
      .download(sourcePath);
    if (!downloadError && downloaded) {
      const { error: uploadError } = await admin.storage
        .from(destinationBucket)
        .upload(destinationPath, downloaded, { upsert: true });
      if (!uploadError) {
        return publicDestination
          ? admin.storage.from(destinationBucket).getPublicUrl(destinationPath).data.publicUrl
          : destinationPath;
      }
      lastError = new Error(
        `Could not upload ${destinationBucket}/${destinationPath}: ${uploadError.message}`
      );
      continue;
    }
    lastError = new Error(
      `Could not read ${sourceBucket}/${sourcePath}: ${downloadError?.message ?? error.message}`
    );
  }

  if (/^https?:\/\//i.test(value) && !sourceBuckets.some((bucket) => getStoragePath(value, bucket))) {
    return value;
  }
  throw lastError ?? new Error(`Could not copy ${value}.`);
}

export async function copyPendingExitFiles(
  admin: ReturnType<typeof createSupabaseAdmin>,
  pending: PendingSessionExit,
  destinationId: string
) {
  const replacements: Record<string, string> = {};
  let avatarUrl: string | null = null;

  const rememberCopy = async (options: Omit<Parameters<typeof copyStorageReference>[0], 'admin'>) => {
    const copied = await copyStorageReference({ admin, ...options });
    if (options.value && copied && copied !== options.value) replacements[options.value] = copied;
    return copied;
  };

  if (pending.role === 'player' && pending.inGameCharacterId) {
    const { data: character, error: characterError } = await admin
      .from('in_game_characters')
      .select('avatar_url')
      .eq('id', pending.inGameCharacterId)
      .single();
    if (characterError) throw new Error(characterError.message);

    try {
      avatarUrl = await rememberCopy({
        value: character.avatar_url,
        sourceBuckets: ['temporary-avatars', 'character-avatars'],
        destinationBucket: 'character-avatars',
        destinationFolder: `characters/${destinationId}/${pending.sessionId}`,
        publicDestination: true,
      });
    } catch {
      avatarUrl = null;
    }

    const { data: items, error: itemsError } = await admin
      .from('in_game_character_inventory_items')
      .select('image_url, asset_key')
      .eq('in_game_character_id', pending.inGameCharacterId);
    if (itemsError) throw new Error(itemsError.message);
    for (const item of items ?? []) {
      try {
        await rememberCopy({
          value: item.image_url,
          sourceBuckets: ['temporary-asset-images', 'asset-images'],
          destinationBucket: 'asset-images',
          destinationFolder: `characters/${destinationId}/${pending.sessionId}/items`,
          publicDestination: false,
        });
      } catch (copyError) {
        if (!item.asset_key) throw copyError;
        const { data: savedAsset } = await admin
          .from('worlds_assets')
          .select('image_url')
          .eq('asset_key', item.asset_key)
          .maybeSingle();
        if (!savedAsset?.image_url) throw copyError;
        const copied = await rememberCopy({
          value: savedAsset.image_url,
          sourceBuckets: ['asset-images'],
          destinationBucket: 'asset-images',
          destinationFolder: `characters/${destinationId}/${pending.sessionId}/items`,
          publicDestination: false,
        });
        if (copied && item.image_url) replacements[item.image_url] = copied;
      }
    }

    const [attributes, parameters, domains, notes, experiences] = await Promise.all([
      admin.from('in_game_character_attributes').select('metadata').eq('in_game_character_id', pending.inGameCharacterId),
      admin.from('in_game_character_parameters').select('metadata').eq('in_game_character_id', pending.inGameCharacterId),
      admin.from('in_game_character_domains').select('id, metadata').eq('in_game_character_id', pending.inGameCharacterId),
      admin.from('in_game_character_notes').select('metadata').eq('in_game_character_id', pending.inGameCharacterId),
      admin.from('in_game_character_experiences').select('metadata').eq('in_game_character_id', pending.inGameCharacterId),
    ]);
    const domainIds = (domains.data ?? []).map((domain) => domain.id);
    const skills = domainIds.length
      ? await admin.from('in_game_character_domain_skills').select('metadata').in('in_game_domain_id', domainIds)
      : { data: [], error: null };
    for (const result of [attributes, parameters, domains, notes, experiences, skills]) {
      if (result.error) throw new Error(result.error.message);
    }
    const metadataValues = collectStringValues([
      ...(attributes.data ?? []),
      ...(parameters.data ?? []),
      ...(domains.data ?? []),
      ...(notes.data ?? []),
      ...(experiences.data ?? []),
      ...(skills.data ?? []),
    ]);
    for (const value of metadataValues) {
      const iconBuckets = ['temporary-avatars', 'character-avatars'];
      if (!isStorageReference(value, iconBuckets)) continue;
      try {
        await rememberCopy({
          value,
          sourceBuckets: iconBuckets,
          destinationBucket: 'character-avatars',
          destinationFolder: `characters/${destinationId}/${pending.sessionId}/icons`,
          publicDestination: true,
        });
      } catch {
        // A missing optional custom icon must not block character saving.
      }
    }
  }

  if (pending.role === 'master' && pending.inGameWorldId) {
    const { data: world, error: worldError } = await admin
      .from('in_game_worlds')
      .select('avatar_url')
      .eq('id', pending.inGameWorldId)
      .single();
    if (worldError) throw new Error(worldError.message);
    try {
      avatarUrl = await rememberCopy({
        value: world.avatar_url,
        sourceBuckets: ['temporary-avatars', 'world-avatars'],
        destinationBucket: 'world-avatars',
        destinationFolder: `worlds/${destinationId}/${pending.sessionId}`,
        publicDestination: true,
      });
    } catch {
      avatarUrl = null;
    }

    const [assetsResult, imagesResult, musicResult, npcsResult] = await Promise.all([
      admin.from('in_game_worlds_assets').select('image_url').eq('in_game_world_id', pending.inGameWorldId),
      admin.from('in_game_worlds_scene_images').select('image_url, storage_path').eq('in_game_world_id', pending.inGameWorldId),
      admin.from('in_game_worlds_scene_music').select('audio_url, cover_url').eq('in_game_world_id', pending.inGameWorldId),
      admin.from('in_game_worlds_relationship_npcs').select('avatar_url').eq('in_game_world_id', pending.inGameWorldId),
    ]);
    for (const result of [assetsResult, imagesResult, musicResult, npcsResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    for (const asset of assetsResult.data ?? []) {
      await rememberCopy({ value: asset.image_url, sourceBuckets: ['temporary-asset-images', 'asset-images'], destinationBucket: 'asset-images', destinationFolder: `worlds/${destinationId}/${pending.sessionId}/assets`, publicDestination: false });
    }
    for (const image of imagesResult.data ?? []) {
      const copied = await rememberCopy({ value: image.image_url, sourceBuckets: ['temporary-scene-images', 'scene-images'], destinationBucket: 'scene-images', destinationFolder: `worlds/${destinationId}/${pending.sessionId}/images`, publicDestination: true });
      if (image.storage_path && copied) {
        const copiedPath = getStoragePath(copied, 'scene-images');
        if (copiedPath) replacements[image.storage_path] = copiedPath;
      }
    }
    for (const music of musicResult.data ?? []) {
      await rememberCopy({ value: music.audio_url, sourceBuckets: ['temporary-scene-music', 'scene-music'], destinationBucket: 'scene-music', destinationFolder: `worlds/${destinationId}/${pending.sessionId}/music`, publicDestination: true });
      try {
        await rememberCopy({ value: music.cover_url, sourceBuckets: ['temporary-scene-images', 'scene-images'], destinationBucket: 'scene-images', destinationFolder: `worlds/${destinationId}/${pending.sessionId}/music-covers`, publicDestination: true });
      } catch {
        // Covers are optional and must not prevent the world from being saved.
      }
    }
    for (const npc of npcsResult.data ?? []) {
      await rememberCopy({ value: npc.avatar_url, sourceBuckets: ['temporary-relationship-npc-images', 'relationship-npc-images'], destinationBucket: 'relationship-npc-images', destinationFolder: `worlds/${destinationId}/${pending.sessionId}/npcs`, publicDestination: false });
    }
  }

  return { avatarUrl, replacements };
}
