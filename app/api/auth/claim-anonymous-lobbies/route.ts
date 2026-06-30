import { createSupabaseAdmin, createSupabaseUserClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    const newAccessToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : null;
    const body = (await request.json()) as { anonymousAccessToken?: string };

    if (!newAccessToken || !body.anonymousAccessToken) {
      return Response.json({ error: 'Both authentication sessions are required.' }, { status: 401 });
    }

    const [oldResult, newResult] = await Promise.all([
      createSupabaseUserClient(body.anonymousAccessToken).auth.getUser(),
      createSupabaseUserClient(newAccessToken).auth.getUser(),
    ]);
    const oldUser = oldResult.data.user;
    const newUser = newResult.data.user;

    if (oldResult.error || !oldUser || oldUser.is_anonymous !== true) {
      return Response.json({ error: 'The previous anonymous session is invalid.' }, { status: 403 });
    }
    if (newResult.error || !newUser || newUser.is_anonymous === true) {
      return Response.json({ error: 'The destination account is invalid.' }, { status: 403 });
    }
    if (oldUser.id === newUser.id) return Response.json({ claimed: 0 });

    const admin = createSupabaseAdmin();
    const { data: participations, error: participationError } = await admin
      .from('session_participants')
      .select('id, session_id, role, live_sessions!inner(id, phase)')
      .eq('user_id', oldUser.id)
      .eq('participation_status', 'active')
      .eq('live_sessions.phase', 'lobby');

    if (participationError) throw participationError;

    for (const participation of participations ?? []) {
      const { data: existing } = await admin
        .from('session_participants')
        .select('id')
        .eq('session_id', participation.session_id)
        .eq('user_id', newUser.id)
        .maybeSingle();

      if (existing && existing.id !== participation.id) {
        const { error } = await admin.from('session_participants').delete().eq('id', existing.id);
        if (error) throw error;
      }

      const { error: participantUpdateError } = await admin
        .from('session_participants')
        .update({ user_id: newUser.id })
        .eq('id', participation.id)
        .eq('user_id', oldUser.id);
      if (participantUpdateError) throw participantUpdateError;

      if (participation.role === 'master') {
        const { error: sessionUpdateError } = await admin
          .from('live_sessions')
          .update({ created_by: newUser.id })
          .eq('id', participation.session_id)
          .eq('created_by', oldUser.id);
        if (sessionUpdateError) throw sessionUpdateError;
      }
    }

    return Response.json({ claimed: participations?.length ?? 0 });
  } catch (error) {
    console.error('Anonymous lobby claim failed:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not transfer the lobby.' },
      { status: 500 }
    );
  }
}
