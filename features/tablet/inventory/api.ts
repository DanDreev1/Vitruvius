import { supabase } from '@/lib/supabaseClient';

import { ASSET_IMAGE_BUCKET, ASSET_IMAGE_MAX_BYTES, SAVED_ASSET_IMAGE_BUCKET } from './constants';
import type {
  AssetDraft,
  AssetItem,
  InventoryAudienceMember,
  InventoryItem,
  InventoryMessage,
} from './types';

export const INVENTORY_CHANGED_EVENT = 'inventory-changed';
export const INVENTORY_MESSAGE_EVENT = 'inventory-message';
export const INVENTORY_LOCAL_MESSAGE_EVENT = 'inventory-local-message';

export function getInventoryChannelName(sessionId: string, inGameCharacterId: string) {
  return `inventory-${sessionId}-${inGameCharacterId}`;
}

export function getInventoryMessagesChannelName(sessionId: string) {
  return `inventory-messages-${sessionId}`;
}

async function sendBroadcast(
  channelName: string,
  event: string,
  payload: Record<string, unknown>
) {
  const channel = supabase.channel(channelName);
  try {
    const ready = await new Promise<boolean>((resolve) => {
      const timeoutId = window.setTimeout(() => resolve(false), 2500);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          window.clearTimeout(timeoutId);
          resolve(true);
        }
      });
    });
    if (ready) await channel.send({ type: 'broadcast', event, payload });
  } finally {
    void supabase.removeChannel(channel);
  }
}

export async function broadcastInventoryChanged(
  sessionId: string,
  characterIds: string[]
) {
  await Promise.all(
    [...new Set(characterIds)].map((characterId) =>
      sendBroadcast(
        getInventoryChannelName(sessionId, characterId),
        INVENTORY_CHANGED_EVENT,
        { sessionId, characterId, changedAt: Date.now() }
      )
    )
  );
}

export async function publishInventoryMessage(
  sessionId: string,
  text: string
) {
  const message: InventoryMessage = {
    id: crypto.randomUUID(),
    sessionId,
    text,
    createdAt: Date.now(),
  };
  window.dispatchEvent(
    new CustomEvent(INVENTORY_LOCAL_MESSAGE_EVENT, { detail: message })
  );
  await sendBroadcast(
    getInventoryMessagesChannelName(sessionId),
    INVENTORY_MESSAGE_EVENT,
    message as unknown as Record<string, unknown>
  );
}

async function resolveImageUrl(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  for (const bucket of [ASSET_IMAGE_BUCKET, SAVED_ASSET_IMAGE_BUCKET]) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);
    if (!error) return data.signedUrl;
  }
  throw new Error('Failed to load item image.');
}

export async function getInventoryAudience(sessionId: string) {
  const { data: participants, error } = await supabase
    .from('session_participants')
    .select('id, display_name, avatar_url, joined_at')
    .eq('session_id', sessionId)
    .eq('participation_status', 'active')
    .eq('role', 'player')
    .order('joined_at');
  if (error) throw new Error(`Failed to load inventory players: ${error.message}`);
  const ids = (participants ?? []).map((row) => row.id as string);
  if (!ids.length) return [];
  const { data: characters, error: characterError } = await supabase
    .from('in_game_characters')
    .select('id, participant_id')
    .eq('session_id', sessionId)
    .in('participant_id', ids);
  if (characterError) throw new Error(`Failed to load inventory characters: ${characterError.message}`);
  const byParticipant = new Map(
    (characters ?? []).map((row) => [row.participant_id as string, row.id as string])
  );
  return (participants ?? []).flatMap((participant) => {
    const characterId = byParticipant.get(participant.id as string);
    if (!characterId) return [];
    return [{
      participantId: participant.id as string,
      inGameCharacterId: characterId,
      displayName: (participant.display_name as string | null) ?? 'Nickname',
      avatarUrl: (participant.avatar_url as string | null) ?? null,
    } satisfies InventoryAudienceMember];
  });
}

export async function getAssets(inGameWorldId: string): Promise<AssetItem[]> {
  const { data, error } = await supabase
    .from('in_game_worlds_assets')
    .select('id, asset_key, name, description, category, image_url, sort_order')
    .eq('in_game_world_id', inGameWorldId)
    .order('sort_order');
  if (error) throw new Error(`Failed to load assets: ${error.message}`);
  return Promise.all((data ?? []).map(async (row) => ({
    id: row.id as string,
    assetKey: row.asset_key as string,
    name: row.name as string,
    description: row.description as string,
    category: row.category as AssetItem['category'],
    imagePath: row.image_url as string,
    imageUrl: await resolveImageUrl(row.image_url as string),
    sortOrder: row.sort_order as number,
  })));
}

function safeFileName(name: string) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9.\-_]/g, '-').toLowerCase();
}

async function uploadAssetImage(sessionId: string, worldId: string, file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Item image must be JPEG, PNG, or WebP.');
  }
  if (file.size > ASSET_IMAGE_MAX_BYTES) throw new Error('Item image must be 5 MB or smaller.');
  const path = `sessions/${sessionId}/worlds/${worldId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(ASSET_IMAGE_BUCKET).upload(path, file);
  if (error) throw new Error(`Failed to upload item image: ${error.message}`);
  return path;
}

async function removeAssetImage(path: string | null) {
  if (!path || /^https?:\/\//i.test(path)) return;
  const { error } = await supabase.storage.from(ASSET_IMAGE_BUCKET).remove([path]);
  if (error) throw new Error(`Failed to delete item image: ${error.message}`);
}

export async function saveAssets(
  inGameWorldId: string,
  sessionId: string,
  drafts: AssetDraft[]
) {
  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index];
    let imagePath = draft.imagePath;
    if (draft.imageFile) imagePath = await uploadAssetImage(sessionId, inGameWorldId, draft.imageFile);
    if (!imagePath) throw new Error(`An image is required for ${draft.name}.`);
    const payload = {
      in_game_world_id: inGameWorldId,
      asset_key: draft.assetKey,
      name: draft.name.trim(),
      description: draft.description.trim(),
      category: draft.category,
      image_url: imagePath,
      sort_order: index,
    };
    if (draft.persistedId) {
      const { error } = await supabase.from('in_game_worlds_assets').update(payload).eq('id', draft.persistedId);
      if (error) throw new Error(`Failed to update asset: ${error.message}`);
    } else {
      const { error } = await supabase.from('in_game_worlds_assets').insert(payload);
      if (error) {
        await removeAssetImage(imagePath);
        throw new Error(`Failed to create asset: ${error.message}`);
      }
    }
  }
}

export async function deleteAsset(asset: AssetItem) {
  const { error } = await supabase.from('in_game_worlds_assets').delete().eq('id', asset.id);
  if (error) throw new Error(`Failed to delete asset: ${error.message}`);
}

export async function saveAssetOrder(sessionId: string, assets: AssetDraft[]) {
  const results = await Promise.all(assets.flatMap((asset, index) => asset.persistedId
    ? [supabase.from('in_game_worlds_assets').update({ sort_order: index }).eq('id', asset.persistedId)]
    : []));
  const failure = results.find((result) => result.error);
  if (failure?.error) throw new Error(`Failed to save asset order: ${failure.error.message}`);
}

export async function grantAsset(assetId: string, characterIds: string[], quantity: number, sessionId: string) {
  const { data, error } = await supabase.rpc('grant_world_asset', {
    p_asset_id: assetId,
    p_character_ids: characterIds,
    p_quantity: quantity,
  });
  if (error) throw new Error(`Failed to give item: ${error.message}`);
  const result = data as Array<{ characterId: string; quantity: number }>;
  await broadcastInventoryChanged(
    sessionId,
    result.filter((item) => item.quantity > 0).map((item) => item.characterId)
  );
  return result;
}

export async function getInventoryItems(inGameCharacterId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('in_game_character_inventory_items')
    .select('id, in_game_character_id, asset_key, name, description, category, quantity, image_url, sort_order')
    .eq('in_game_character_id', inGameCharacterId)
    .order('sort_order');
  if (error) throw new Error(`Failed to load Backpack: ${error.message}`);
  const ids = (data ?? []).map((row) => row.id as string);
  const visibility = ids.length
    ? await supabase.from('in_game_character_inventory_item_visibility')
        .select('inventory_item_id, viewer_in_game_character_id').in('inventory_item_id', ids)
    : { data: [], error: null };
  if (visibility.error) throw new Error(`Failed to load item visibility: ${visibility.error.message}`);
  return Promise.all((data ?? []).map(async (row) => ({
    id: row.id as string,
    inGameCharacterId: row.in_game_character_id as string,
    assetKey: (row.asset_key as string | null) ?? null,
    name: row.name as string,
    description: (row.description as string | null) ?? '',
    category: row.category as InventoryItem['category'],
    quantity: row.quantity as number,
    imagePath: (row.image_url as string | null) ?? null,
    imageUrl: await resolveImageUrl((row.image_url as string | null) ?? null),
    sortOrder: row.sort_order as number,
    visibleCharacterIds: (visibility.data ?? [])
      .filter((item) => item.inventory_item_id === row.id)
      .map((item) => item.viewer_in_game_character_id as string),
  })));
}

export async function executeUseItem(itemId: string, sessionId: string) {
  const { data, error } = await supabase.rpc('use_inventory_item', { p_item_id: itemId });
  if (error) throw new Error(`Failed to use item: ${error.message}`);
  const result = data as { itemName: string; ownerCharacterId: string };
  await broadcastInventoryChanged(sessionId, [result.ownerCharacterId]);
  return result;
}

export async function discardItem(itemId: string, quantity: number, sessionId: string) {
  const { data, error } = await supabase.rpc('discard_inventory_item', { p_item_id: itemId, p_quantity: quantity });
  if (error) throw new Error(`Failed to throw away item: ${error.message}`);
  const result = data as { itemName: string; quantity: number; ownerCharacterId: string };
  await broadcastInventoryChanged(sessionId, [result.ownerCharacterId]);
  return result;
}

export async function transferItem(itemId: string, recipientId: string, quantity: number, sessionId: string) {
  const { data, error } = await supabase.rpc('transfer_inventory_item', {
    p_item_id: itemId,
    p_recipient_character_id: recipientId,
    p_quantity: quantity,
  });
  if (error) throw new Error(`Failed to give item: ${error.message}`);
  const result = data as { itemName: string; quantity: number; ownerCharacterId: string; recipientCharacterId: string };
  await broadcastInventoryChanged(
    sessionId,
    result.quantity > 0
      ? [result.ownerCharacterId, result.recipientCharacterId]
      : []
  );
  return result;
}

export async function setItemVisibility(
  itemId: string,
  viewerIds: string[],
  sessionId: string,
  ownerCharacterId: string
) {
  const { error } = await supabase.rpc('set_inventory_item_visibility', {
    p_item_id: itemId,
    p_viewer_character_ids: viewerIds,
  });
  if (error) throw new Error(`Failed to update item visibility: ${error.message}`);
  await broadcastInventoryChanged(sessionId, [ownerCharacterId, ...viewerIds]);
}
