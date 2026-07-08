import { authenticateSessionExitRequest, removeStoragePrefix } from '@/features/session-exit/server';

export const runtime = 'nodejs';

export async function DELETE(request: Request) {
  try {
    const { admin, user } = await authenticateSessionExitRequest(request);
    const body = (await request.json()) as { nickname?: string };
    const nickname = typeof user.user_metadata?.nickname === 'string' ? user.user_metadata.nickname : '';
    if (!nickname || body.nickname !== nickname) {
      return Response.json({ error: 'Nickname confirmation does not match.' }, { status: 400 });
    }

    const { count, error: sessionError } = await admin
      .from('session_participants')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('participation_status', ['active', 'save_pending']);
    if (sessionError) throw sessionError;
    if ((count ?? 0) > 0) {
      return Response.json({ error: 'Exit and resolve all game sessions before deleting your account.' }, { status: 409 });
    }

    const [charactersResult, worldsResult] = await Promise.all([
      admin.from('characters').select('id').eq('owner_user_id', user.id),
      admin.from('worlds').select('id').eq('owner_user_id', user.id),
    ]);
    if (charactersResult.error) throw charactersResult.error;
    if (worldsResult.error) throw worldsResult.error;

    await removeStoragePrefix(admin, 'profile-avatars', user.id);
    for (const character of charactersResult.data ?? []) {
      await Promise.all([
        removeStoragePrefix(admin, 'character-avatars', `characters/${character.id}`),
        removeStoragePrefix(admin, 'asset-images', `characters/${character.id}`),
      ]);
    }
    for (const world of worldsResult.data ?? []) {
      await Promise.all([
        removeStoragePrefix(admin, 'world-avatars', `worlds/${world.id}`),
        removeStoragePrefix(admin, 'asset-images', `worlds/${world.id}`),
        removeStoragePrefix(admin, 'relationship-npc-images', `worlds/${world.id}`),
        removeStoragePrefix(admin, 'scene-images', `worlds/${world.id}`),
        removeStoragePrefix(admin, 'scene-music', `worlds/${world.id}`),
      ]);
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return Response.json({ deleted: true });
  } catch (error) {
    console.error('Account deletion failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Account deletion failed.' }, { status: 500 });
  }
}
