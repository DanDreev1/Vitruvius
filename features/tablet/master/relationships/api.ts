import { supabase } from '@/lib/supabaseClient';
import { createId } from '@/lib/createId';

import {
  RELATIONSHIP_NPC_ALLOWED_IMAGE_TYPES,
  RELATIONSHIP_NPC_IMAGE_MAX_BYTES,
  RELATIONSHIP_NPC_STORAGE_BUCKET,
  RELATIONSHIP_NPC_STORAGE_FOLDER,
  SAVED_RELATIONSHIP_NPC_STORAGE_BUCKET,
} from './constants';
import type {
  RelationshipAudienceMember,
  RelationshipLinkDraft,
  RelationshipLinkRecord,
  RelationshipNpcRecord,
  PlayerRelationshipNpc,
  RelationshipSaveNpcInput,
} from './types';

export const RELATIONSHIPS_CHANGED_EVENT = 'relationships-changed';

export function getRelationshipsChannelName(sessionId: string) {
  return `relationships-${sessionId}`;
}

async function broadcastRelationshipsChanged(sessionId: string) {
  const channel = supabase.channel(getRelationshipsChannelName(sessionId));

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

    if (!isSubscribed) return;

    await channel.send({
      type: 'broadcast',
      event: RELATIONSHIPS_CHANGED_EVENT,
      payload: { sessionId, changedAt: Date.now() },
    });
  } finally {
    void supabase.removeChannel(channel);
  }
}

export async function getRelationshipAudience(sessionId: string) {
  const { data: participants, error: participantError } = await supabase
    .from('session_participants')
    .select('id, display_name, avatar_url, joined_at')
    .eq('session_id', sessionId)
    .eq('participation_status', 'active')
    .eq('role', 'player')
    .order('joined_at', { ascending: true });

  if (participantError) {
    throw new Error(`Failed to load relationship players: ${participantError.message}`);
  }

  const participantIds = (participants ?? []).map((participant) => participant.id as string);
  if (!participantIds.length) return [];

  const { data: characters, error: characterError } = await supabase
    .from('in_game_characters')
    .select('id, participant_id, source_character_id')
    .eq('session_id', sessionId)
    .in('participant_id', participantIds);

  if (characterError) {
    throw new Error(`Failed to load relationship characters: ${characterError.message}`);
  }

  const characterByParticipant = new Map(
    (characters ?? []).map((character) => [character.participant_id as string, character])
  );

  return (participants ?? []).flatMap((participant) => {
    const character = characterByParticipant.get(participant.id as string);
    if (!character) return [];

    return [{
      participantId: participant.id as string,
      inGameCharacterId: character.id as string,
      sourceCharacterId: (character.source_character_id as string | null) ?? null,
      displayName: (participant.display_name as string | null) ?? 'Nickname',
      avatarUrl: (participant.avatar_url as string | null) ?? null,
    } satisfies RelationshipAudienceMember];
  });
}

export async function getRelationshipNpcs(inGameWorldId: string) {
  const { data, error } = await supabase
    .from('in_game_worlds_relationship_npcs')
    .select('id, in_game_world_id, source_relationship_npc_id, name, description, avatar_url, sort_order, created_at, updated_at')
    .eq('in_game_world_id', inGameWorldId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load relationship NPCs: ${error.message}`);
  }

  return (data ?? []) as RelationshipNpcRecord[];
}

export async function getRelationshipLinks(npcIds: string[]) {
  if (!npcIds.length) return [];

  const { data, error } = await supabase
    .from('in_game_worlds_relationship_links')
    .select('id, in_game_character_id, character_id, in_game_npc_id, npc_id, relationship_value, is_visible_to_player')
    .in('in_game_npc_id', npcIds);

  if (error) {
    throw new Error(`Failed to load relationship links: ${error.message}`);
  }

  return (data ?? []) as RelationshipLinkRecord[];
}

export async function getVisiblePlayerRelationships({
  inGameWorldId,
  inGameCharacterId,
}: {
  inGameWorldId: string;
  inGameCharacterId: string;
}): Promise<PlayerRelationshipNpc[]> {
  const npcs = await getRelationshipNpcs(inGameWorldId);
  if (!npcs.length) return [];

  const { data: linkRows, error } = await supabase
    .from('in_game_worlds_relationship_links')
    .select('in_game_npc_id, relationship_value, is_visible_to_player')
    .eq('in_game_character_id', inGameCharacterId)
    .eq('is_visible_to_player', true)
    .in('in_game_npc_id', npcs.map((npc) => npc.id));

  if (error) {
    throw new Error(`Failed to load player relationships: ${error.message}`);
  }

  const linkByNpcId = new Map(
    (linkRows ?? []).map((link) => [link.in_game_npc_id as string, link])
  );
  const visibleNpcs = npcs.filter((npc) => linkByNpcId.has(npc.id));
  const avatarUrls = await Promise.all(
    visibleNpcs.map((npc) => getRelationshipAvatarUrl(npc.avatar_url))
  );

  return visibleNpcs.map((npc, index) => ({
    id: npc.id,
    name: npc.name,
    description: npc.description,
    avatarDisplayUrl: avatarUrls[index],
    relationshipValue:
      (linkByNpcId.get(npc.id)?.relationship_value as number | undefined) ?? 0,
    sortOrder: npc.sort_order,
  }));
}

export async function getRelationshipAvatarUrl(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  for (const bucket of [
    RELATIONSHIP_NPC_STORAGE_BUCKET,
    SAVED_RELATIONSHIP_NPC_STORAGE_BUCKET,
  ]) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60);
    if (!error) return data.signedUrl;
  }
  throw new Error('Failed to load NPC image.');
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

async function uploadRelationshipAvatar(
  sessionId: string,
  inGameWorldId: string,
  npcId: string,
  file: File
) {
  if (!RELATIONSHIP_NPC_ALLOWED_IMAGE_TYPES.includes(file.type as never)) {
    throw new Error('NPC image must be a JPEG, PNG, or WebP file.');
  }

  if (file.size > RELATIONSHIP_NPC_IMAGE_MAX_BYTES) {
    throw new Error('NPC image must be 5 MB or smaller.');
  }

  const objectPath = `${RELATIONSHIP_NPC_STORAGE_FOLDER}/${sessionId}/worlds/${inGameWorldId}/${npcId}-${createId()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(RELATIONSHIP_NPC_STORAGE_BUCKET)
    .upload(objectPath, file, { cacheControl: '3600', upsert: false });

  if (error) {
    throw new Error(`Failed to upload NPC image: ${error.message}`);
  }

  return objectPath;
}

async function removeRelationshipAvatar(path: string | null) {
  if (!path || /^https?:\/\//i.test(path)) return;

  const { error } = await supabase.storage
    .from(RELATIONSHIP_NPC_STORAGE_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(`Failed to delete NPC image: ${error.message}`);
  }
}

export async function saveRelationshipChanges({
  inGameWorldId,
  sessionId,
  npcs,
  audience,
  links,
}: {
  inGameWorldId: string;
  sessionId: string;
  npcs: RelationshipSaveNpcInput[];
  audience: RelationshipAudienceMember[];
  links: Record<string, RelationshipLinkDraft>;
}) {
  const persistedIdByDraftId = new Map<string, string>();

  for (const npc of npcs) {
    let persistedId = npc.persistedId;
  const generatedId = persistedId ?? createId();
    let nextAvatarPath = npc.avatarPath;

    if (npc.avatarFile) {
      nextAvatarPath = await uploadRelationshipAvatar(
        sessionId,
        inGameWorldId,
        generatedId,
        npc.avatarFile
      );
    }

    if (!nextAvatarPath) {
      throw new Error(`An image is required for ${npc.name}.`);
    }

    if (!persistedId) {
      const { data, error } = await supabase.rpc('create_in_game_relationship_npc', {
        p_id: generatedId,
        p_in_game_world_id: inGameWorldId,
        p_name: npc.name,
        p_description: npc.description,
        p_avatar_url: nextAvatarPath,
        p_sort_order: npc.sortOrder,
      });

      if (error) {
        await removeRelationshipAvatar(nextAvatarPath);
        throw new Error(`Failed to create NPC: ${error.message}`);
      }

      persistedId = data as string;
    } else {
      const { error } = await supabase
        .from('in_game_worlds_relationship_npcs')
        .update({
          name: npc.name,
          description: npc.description,
          avatar_url: nextAvatarPath,
          sort_order: npc.sortOrder,
        })
        .eq('id', persistedId);

      if (error) {
        if (npc.avatarFile) await removeRelationshipAvatar(nextAvatarPath);
        throw new Error(`Failed to update NPC: ${error.message}`);
      }

      if (npc.avatarFile && npc.avatarPath !== nextAvatarPath) {
        await removeRelationshipAvatar(npc.avatarPath);
      }
    }

    persistedIdByDraftId.set(npc.draftId, persistedId);
  }

  const linkRows = npcs.flatMap((npc) => {
    const inGameNpcId = persistedIdByDraftId.get(npc.draftId);
    if (!inGameNpcId) return [];

    return audience.map((member) => {
      const draft = links[`${npc.draftId}:${member.inGameCharacterId}`] ?? {
        id: null,
        relationshipValue: 0,
        isVisibleToPlayer: false,
      };

      return {
        in_game_npc_id: inGameNpcId,
        in_game_character_id: member.inGameCharacterId,
        relationship_value: draft.relationshipValue,
        is_visible_to_player: draft.isVisibleToPlayer,
      };
    });
  });

  if (linkRows.length) {
    const { error } = await supabase.rpc('save_in_game_relationship_links', {
      p_in_game_world_id: inGameWorldId,
      p_links: linkRows,
    });

    if (error) {
      throw new Error(`Failed to save NPC relationships: ${error.message}`);
    }
  }

  await broadcastRelationshipsChanged(sessionId);
}

export async function saveRelationshipSortOrder(
  sessionId: string,
  rows: Array<{ id: string; sortOrder: number }>
) {
  await Promise.all(
    rows.map(async (row) => {
      const { error } = await supabase
        .from('in_game_worlds_relationship_npcs')
        .update({ sort_order: row.sortOrder })
        .eq('id', row.id);

      if (error) {
        throw new Error(`Failed to save NPC order: ${error.message}`);
      }
    })
  );

  await broadcastRelationshipsChanged(sessionId);
}

export async function deleteRelationshipNpc(
  npcId: string,
  avatarPath: string | null,
  sessionId: string
) {
  await removeRelationshipAvatar(avatarPath);

  const { error } = await supabase
    .from('in_game_worlds_relationship_npcs')
    .delete()
    .eq('id', npcId);

  if (error) {
    throw new Error(`Failed to delete NPC: ${error.message}`);
  }

  await broadcastRelationshipsChanged(sessionId);
}
