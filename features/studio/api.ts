'use client';

import { getOwnedCharacters, getOwnedWorlds } from '@/features/lobby/api';
import { supabase } from '@/lib/supabaseClient';
import type { StudioRole } from './types';

export type StudioEntity = { id: string; name: string; avatarUrl: string | null };

async function getAuth() {
  const { data } = await supabase.auth.getSession();
  if (!data.session || data.session.user.is_anonymous) throw new Error('Log in to use Vitruvius Studio.');
  return data.session;
}

export async function loadStudioEntities(role: StudioRole): Promise<StudioEntity[]> {
  const session = await getAuth();
  const rows = role === 'master' ? await getOwnedWorlds(session.user.id) : await getOwnedCharacters(session.user.id);
  return rows.map((row) => ({ id: row.id, name: row.name, avatarUrl: row.avatar_url }));
}

async function entityRequest<T>(method: 'POST' | 'DELETE', body: object) {
  const session = await getAuth();
  const response = await fetch('/api/studio/entities', { method, headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? 'Studio request failed.');
  return payload as T;
}

export async function createStudioEntity(role: StudioRole) {
  const result = await entityRequest<{ entity: { id: string; name: string; avatar_url: string | null } }>('POST', { kind: role === 'master' ? 'world' : 'character' });
  return { id: result.entity.id, name: result.entity.name, avatarUrl: result.entity.avatar_url } satisfies StudioEntity;
}

export async function deleteStudioEntity(role: StudioRole, id: string) {
  await entityRequest<{ deleted: boolean }>('DELETE', { kind: role === 'master' ? 'world' : 'character', id });
}
