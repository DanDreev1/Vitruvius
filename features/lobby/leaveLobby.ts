import { supabase } from '@/lib/supabaseClient';
import { getCurrentUser } from '@/features/auth/getCurrentUser';

type LeaveLobbyParams = {
  sessionId: string;
};

export async function leaveLobby({ sessionId }: LeaveLobbyParams) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('You must be logged in.');
  }

  const { data: participant, error: participantError } = await supabase
    .from('session_participants')
    .select('id, role')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (participantError) {
    throw new Error(participantError.message);
  }

  if (!participant) {
    throw new Error('Participant not found in this lobby.');
  }

  if (participant.role === 'master') {
    const { error: deleteSessionError } = await supabase
      .from('live_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('created_by', user.id);

    if (deleteSessionError) {
      throw new Error(deleteSessionError.message);
    }

    return { deletedRoom: true };
  }

  const { error: deleteParticipantError } = await supabase
    .from('session_participants')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', user.id);

  if (deleteParticipantError) {
    throw new Error(deleteParticipantError.message);
  }

  return { deletedRoom: false };
}