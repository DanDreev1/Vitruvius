'use client';

import { supabase } from '@/lib/supabaseClient';

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session?.access_token ?? null;
}

export async function sessionExitRequest<T>(
  method: 'GET' | 'POST',
  body?: Record<string, unknown>
): Promise<T | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const response = await fetch('/api/session-exit', {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? 'Session exit request failed.');
  }
  return payload;
}

