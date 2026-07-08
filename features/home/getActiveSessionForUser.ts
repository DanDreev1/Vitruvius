import { supabase } from '@/lib/supabaseClient';

type ActiveSessionResult = {
  sessionId: string;
  code: string;
} | null;

export async function getActiveSessionForUser(
  userId: string
): Promise<ActiveSessionResult> {
  const { data, error } = await supabase
    .from('session_participants')
    .select(
      `
      session_id,
      live_sessions!inner (
        id,
        code,
        phase
      )
    `
    )
    .eq('user_id', userId)
    .eq('participation_status', 'active')
    .eq('live_sessions.phase', 'active')
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !data.live_sessions) {
    return null;
  }

  const liveSession = Array.isArray(data.live_sessions)
    ? data.live_sessions[0]
    : data.live_sessions;

  if (!liveSession?.code) {
    return null;
  }

  return {
    sessionId: liveSession.id,
    code: liveSession.code,
  };
}
