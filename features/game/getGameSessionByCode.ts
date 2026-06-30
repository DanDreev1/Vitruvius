import { supabase } from '@/lib/supabaseClient';
import type { GameParticipant } from '@/lib/game/types';

type GameSessionData = {
  id: string;
  code: string;
  phase: string;
  created_by: string;
};

export async function getGameSessionByCode(code: string): Promise<{
  session: GameSessionData;
  participants: GameParticipant[];
}> {
  const { data: session, error: sessionError } = await supabase
    .from('live_sessions')
    .select('id, code, phase, created_by')
    .eq('code', code)
    .single();

  if (sessionError || !session) {
    throw new Error('Game session was not found.');
  }

  let participantsQuery = supabase
    .from('session_participants')
    .select(
      'id, session_id, user_id, role, display_name, avatar_url, joined_at, connection_status, last_seen_at'
    )
    .eq('session_id', session.id)
    .order('joined_at', { ascending: true });

  if (session.phase !== 'ended') {
    participantsQuery = participantsQuery.eq('participation_status', 'active');
  }

  const { data: participantsRaw, error: participantsError } = await participantsQuery;

  if (participantsError) {
    console.error('session_participants error:', participantsError);
    throw new Error(participantsError.message);
  }

  if (!participantsRaw) {
    throw new Error('Participants data is null.');
  }

  const participants: GameParticipant[] = participantsRaw.map((participant) => ({
    id: participant.id,
    userId: participant.user_id,
    role: participant.role,
    displayName:
      participant.display_name ??
      (participant.role === 'master' ? 'Master' : 'Player'),
    avatarUrl: participant.avatar_url ?? null,
    joinedAt: participant.joined_at,
    connectionStatus:
      participant.connection_status === 'offline' ? 'offline' : 'online',
    lastSeenAt: participant.last_seen_at ?? null,
  }));

  return {
    session,
    participants,
  };
}
