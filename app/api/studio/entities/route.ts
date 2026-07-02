import { authenticateSessionExitRequest, removeStoragePrefix } from '@/features/session-exit/server';

export const runtime = 'nodejs';

type EntityKind = 'character' | 'world';

export async function POST(request: Request) {
  try {
    const { admin, user } = await authenticateSessionExitRequest(request);
    if (user.is_anonymous) return Response.json({ error: 'A permanent account is required.' }, { status: 403 });
    const body = (await request.json()) as { kind?: EntityKind };
    if (body.kind === 'character') return Response.json({ error: 'Characters must be completed before they are created.' }, { status: 400 });
    if (body.kind !== 'world') return Response.json({ error: 'Invalid entity type.' }, { status: 400 });
    const { data, error } = await admin.from('worlds').insert({ owner_user_id: user.id, name: 'New world', avatar_url: null }).select('id, name, avatar_url').single();
    if (error) throw error;
    return Response.json({ entity: data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not create entity.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { admin, user } = await authenticateSessionExitRequest(request);
    if (user.is_anonymous) return Response.json({ error: 'A permanent account is required.' }, { status: 403 });
    const body = (await request.json()) as { kind?: EntityKind; id?: string };
    if ((body.kind !== 'character' && body.kind !== 'world') || !body.id) return Response.json({ error: 'Invalid entity.' }, { status: 400 });
    const table = body.kind === 'world' ? 'worlds' : 'characters';
    const { data: owned, error: ownedError } = await admin.from(table).select('id').eq('id', body.id).eq('owner_user_id', user.id).maybeSingle();
    if (ownedError) throw ownedError;
    if (!owned) return Response.json({ error: 'Entity not found.' }, { status: 404 });

    if (body.kind === 'world') {
      await Promise.all([
        removeStoragePrefix(admin, 'world-avatars', `worlds/${body.id}`),
        removeStoragePrefix(admin, 'asset-images', `worlds/${body.id}`),
        removeStoragePrefix(admin, 'relationship-npc-images', `worlds/${body.id}`),
        removeStoragePrefix(admin, 'scene-images', `worlds/${body.id}`),
        removeStoragePrefix(admin, 'scene-music', `worlds/${body.id}`),
      ]);
    } else {
      await Promise.all([
        removeStoragePrefix(admin, 'character-avatars', `characters/${body.id}`),
        removeStoragePrefix(admin, 'asset-images', `characters/${body.id}`),
      ]);
    }
    const { error } = await admin.from(table).delete().eq('id', body.id).eq('owner_user_id', user.id);
    if (error) throw error;
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not delete entity.' }, { status: 500 });
  }
}
