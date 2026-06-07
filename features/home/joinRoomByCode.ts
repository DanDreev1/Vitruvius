import { supabase } from '@/lib/supabaseClient';
import { getOrCreateGuestUser } from './getOrCreateGuestUser';

type JoinRoomResult = {
  sessionId: string;
  code: string;
};

export async function joinRoomByCode(rawCode: string): Promise<JoinRoomResult> {
  const code = rawCode.trim();

  if (!/^\d{6}$/.test(code)) {
    throw new Error('Room code must contain exactly 6 digits');
  }

  const user = await getOrCreateGuestUser();

  const { data: session, error: sessionError } = await supabase
    .from('live_sessions')
    .select('id, code, phase, cleanup_at')
    .eq('code', code)
    .single();

  if (sessionError || !session) {
    throw new Error('Room not found');
  }

  if (session.phase === 'ended') {
    throw new Error('This room is no longer available');
  }

  if (session.cleanup_at && Date.parse(session.cleanup_at) <= Date.now()) {
    throw new Error('This room is no longer available');
  }

  if (session.phase === 'active') {
    throw new Error('This game has already started');
  }

  const { error: insertParticipantError } = await supabase
    .from('session_participants')
    .insert({
      session_id: session.id,
      user_id: user.id,
      role: 'player',
      is_ready: false,
    });

  if (insertParticipantError) {
    throw new Error(insertParticipantError.message);
  }

  return {
    sessionId: session.id,
    code: session.code,
  };
}
