'use client';

import { supabase } from '@/lib/supabaseClient';
import type { StudioCharacterDraft, StudioCharacterPayload } from './types';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  if (!data.session || data.session.user.is_anonymous) throw new Error('A permanent account is required.');
  return { Authorization: `Bearer ${data.session.access_token}` };
}

async function parse<T>(response: Response) {
  const value = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(value?.error ?? 'Could not save character.');
  return value as T;
}

export async function saveStudioCharacter(draft: StudioCharacterDraft) {
  const payload: StudioCharacterPayload = {
    name: draft.name, description: draft.description, avatarUrl: draft.avatarUrl,
    attributes: draft.attributes, parameters: draft.parameters, domains: draft.domains,
    inventoryItems: draft.inventoryItems, notes: draft.notes, experiences: draft.experiences,
  };
  const form = new FormData();
  form.set('character', JSON.stringify(payload));
  if (draft.portraitFile) form.set('portrait', draft.portraitFile);
  return parse<{ character: { id: string; name: string; avatar_url: string | null } }>(
    await fetch('/api/studio/character', { method: 'POST', headers: await authHeaders(), body: form })
  );
}
