'use client';

import { supabase } from '@/lib/supabaseClient';
import type { StudioWorldData, WorldCollection } from './types';

async function authHeaders(json = true) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Authentication required.');
  return { Authorization: `Bearer ${data.session.access_token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) };
}

async function parse<T>(response: Response) {
  const value = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(value?.error ?? 'Studio request failed.');
  return value as T;
}

export async function loadStudioWorld(worldId: string) {
  return parse<StudioWorldData>(await fetch(`/api/studio/world?worldId=${encodeURIComponent(worldId)}`, { headers: await authHeaders(false) }));
}

export async function updateStudioWorld(worldId: string, data: Record<string, unknown>) {
  return parse<{ row: StudioWorldData['world'] }>(await fetch('/api/studio/world', { method: 'PATCH', headers: await authHeaders(), body: JSON.stringify({ worldId, collection: 'world', data }) }));
}

export async function createWorldRow<T>(worldId: string, collection: WorldCollection, data: Record<string, unknown>) {
  return parse<{ row: T }>(await fetch('/api/studio/world', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ worldId, collection, data }) }));
}

export async function updateWorldRow<T>(worldId: string, collection: WorldCollection, id: string, data: Record<string, unknown>) {
  return parse<{ row: T }>(await fetch('/api/studio/world', { method: 'PATCH', headers: await authHeaders(), body: JSON.stringify({ worldId, collection, id, data }) }));
}

export async function deleteWorldRow(worldId: string, collection: WorldCollection, id: string) {
  await parse<{ deleted: boolean }>(await fetch('/api/studio/world', { method: 'DELETE', headers: await authHeaders(), body: JSON.stringify({ worldId, collection, id }) }));
}

export async function uploadStudioWorldFile(worldId: string, kind: 'avatar' | 'image' | 'music' | 'cover' | 'npc' | 'asset', file: File) {
  const form = new FormData(); form.set('worldId', worldId); form.set('kind', kind); form.set('file', file);
  return parse<{ value: string; displayUrl: string | null; path: string }>(await fetch('/api/studio/world-files', { method: 'POST', headers: await authHeaders(false), body: form }));
}
