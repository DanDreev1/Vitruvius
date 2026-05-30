import { supabase } from '@/lib/supabaseClient';
import { getOrCreateGuestUser } from './getOrCreateGuestUser';
import { generateUniqueRoomCode } from './generateUniqueRoomCode';

type CreateRoomResult = {
  sessionId: string;
  code: string;
};

export async function createRoom(): Promise<CreateRoomResult> {
  const user = await getOrCreateGuestUser();
  const code = await generateUniqueRoomCode();

  const { data: session, error: sessionError } = await supabase
    .from('live_sessions')
    .insert({
      code,
      created_by: user.id,
      phase: 'lobby',
      ended_at: null,
      cleanup_at: null,
    })
    .select('id, code')
    .single();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const { error: participantError } = await supabase
    .from('session_participants')
    .insert({
      session_id: session.id,
      user_id: user.id,
      role: 'master',
      is_ready: true,
    });

  if (participantError) {
    throw new Error(participantError.message);
  }

  return {
    sessionId: session.id,
    code: session.code,
  };
}