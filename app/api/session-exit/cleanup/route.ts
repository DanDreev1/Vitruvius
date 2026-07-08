import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  mapPendingSessionExit,
  cleanupResolvedSessionFiles,
  removeStoragePrefix,
  removeTemporaryExitFiles,
  preserveEndedSessionBeforeUserDeletion,
} from '@/features/session-exit/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get('authorization');
  if (!serviceRoleKey || authorization !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const { data: participants, error } = await admin
    .from('session_participants')
    .select('id, session_id, user_id, role, cleanup_at, previous_anonymous_user_id')
    .eq('participation_status', 'save_pending')
    .lte('cleanup_at', new Date().toISOString());

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let cleaned = 0;
  for (const participant of participants ?? []) {
    const [sessionResult, characterResult, worldResult] = await Promise.all([
      admin.from('live_sessions').select('code').eq('id', participant.session_id).maybeSingle(),
      admin.from('in_game_characters').select('id, source_character_id').eq('session_id', participant.session_id).eq('user_id', participant.user_id).maybeSingle(),
      admin.from('in_game_worlds').select('id, source_world_id').eq('live_session_id', participant.session_id).maybeSingle(),
    ]);
    const character = characterResult.data;
    const world = worldResult.data;
    const pending = mapPendingSessionExit({
      participant_id: participant.id,
      session_id: participant.session_id,
      session_code: sessionResult.data?.code ?? '',
      role: participant.role,
      cleanup_at: participant.cleanup_at,
      in_game_character_id: character?.id ?? null,
      source_character_id: character?.source_character_id ?? null,
      in_game_world_id: world?.id ?? null,
      source_world_id: world?.source_world_id ?? null,
    });
    if (!pending) continue;

    if (pending.role === 'player') {
      await removeTemporaryExitFiles(admin, pending);
    }
    await removeStoragePrefix(admin, 'temporary-avatars', participant.user_id);

    if (participant.role === 'master') {
      await admin.from('in_game_worlds').delete().eq('live_session_id', participant.session_id);
    } else {
      await admin
        .from('in_game_characters')
        .delete()
        .eq('session_id', participant.session_id)
        .eq('user_id', participant.user_id);
    }
    await admin.from('session_participants').delete().eq('id', participant.id);
    await cleanupResolvedSessionFiles(admin, participant.session_id);

    const anonymousIds = [participant.user_id, participant.previous_anonymous_user_id]
      .filter((value): value is string => Boolean(value));
    for (const userId of new Set(anonymousIds)) {
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      if (userData.user?.is_anonymous) {
        await preserveEndedSessionBeforeUserDeletion(admin, participant.session_id, userId);
        await admin.auth.admin.deleteUser(userId);
      }
    }
    cleaned += 1;
  }

  const { data: endedSessions } = await admin
    .from('live_sessions')
    .select('id, session_participants(id)')
    .eq('phase', 'ended');
  for (const session of endedSessions ?? []) {
    if (!session.session_participants?.length) {
      await admin.from('live_sessions').delete().eq('id', session.id);
    }
  }

  return Response.json({ cleaned });
}
