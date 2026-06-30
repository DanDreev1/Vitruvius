import type { Session } from '@supabase/supabase-js';

export async function claimAnonymousLobbies(
  previousSession: Session | null,
  nextSession: Session | null
) {
  if (!previousSession?.user.is_anonymous || !nextSession || nextSession.user.is_anonymous) return;

  const response = await fetch('/api/auth/claim-anonymous-lobbies', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${nextSession.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ anonymousAccessToken: previousSession.access_token }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Could not transfer the anonymous lobby to this account.');
  }
}
