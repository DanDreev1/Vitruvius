import { randomUUID } from 'node:crypto';
import { authenticateSessionExitRequest } from '@/features/session-exit/server';

export const runtime = 'nodejs';

const collections = {
  images: { table: 'worlds_scene_images', fields: ['title', 'image_url', 'storage_path', 'mime_type', 'sort_order', 'is_active'] },
  music: { table: 'worlds_scene_music', fields: ['title', 'audio_url', 'cover_url', 'sort_order', 'is_active'] },
  npcs: { table: 'worlds_relationship_npcs', fields: ['name', 'description', 'avatar_url', 'sort_order'] },
  assets: { table: 'worlds_assets', fields: ['asset_key', 'name', 'description', 'category', 'image_url', 'sort_order'] },
  notes: { table: 'worlds_notes', fields: ['title', 'content', 'position_x', 'position_y'] },
} as const;

type Collection = keyof typeof collections;

async function authorize(request: Request, worldId: string) {
  const auth = await authenticateSessionExitRequest(request);
  if (auth.user.is_anonymous) throw new Response('A permanent account is required.', { status: 403 });
  const { data, error } = await auth.admin.from('worlds').select('id, name, avatar_url').eq('id', worldId).eq('owner_user_id', auth.user.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Response('World not found.', { status: 404 });
  return { ...auth, world: data };
}

function pick(data: Record<string, unknown>, fields: readonly string[]) {
  return Object.fromEntries(fields.filter((field) => field in data).map((field) => [field, data[field]]));
}

async function signedUrl(admin: Awaited<ReturnType<typeof authorize>>['admin'], bucket: string, value: string | null) {
  if (!value || /^https?:\/\//i.test(value)) return value;
  return (await admin.storage.from(bucket).createSignedUrl(value, 3600)).data?.signedUrl ?? null;
}

export async function GET(request: Request) {
  try {
    const worldId = new URL(request.url).searchParams.get('worldId');
    if (!worldId) return Response.json({ error: 'World id is required.' }, { status: 400 });
    const { admin, world } = await authorize(request, worldId);
    const [images, music, npcs, assets, notes] = await Promise.all([
      admin.from('worlds_scene_images').select('*').eq('world_id', worldId).order('sort_order'),
      admin.from('worlds_scene_music').select('*').eq('world_id', worldId).order('sort_order'),
      admin.from('worlds_relationship_npcs').select('*').eq('world_id', worldId).order('sort_order'),
      admin.from('worlds_assets').select('*').eq('world_id', worldId).order('sort_order'),
      admin.from('worlds_notes').select('*').eq('world_id', worldId),
    ]);
    for (const result of [images, music, npcs, assets, notes]) if (result.error) throw result.error;
    const npcRows = await Promise.all((npcs.data ?? []).map(async (row) => ({ ...row, display_url: await signedUrl(admin, 'relationship-npc-images', row.avatar_url) })));
    const assetRows = await Promise.all((assets.data ?? []).map(async (row) => ({ ...row, display_url: await signedUrl(admin, 'asset-images', row.image_url) })));
    return Response.json({ world, images: images.data ?? [], music: music.data ?? [], npcs: npcRows, assets: assetRows, notes: notes.data ?? [] });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : 'Could not load world.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { worldId?: string; collection?: Collection | 'world'; id?: string; data?: Record<string, unknown> };
    if (!body.worldId || !body.data) return Response.json({ error: 'Invalid update.' }, { status: 400 });
    const { admin } = await authorize(request, body.worldId);
    if (body.collection === 'world') {
      const { data, error } = await admin.from('worlds').update(pick(body.data, ['name', 'avatar_url'])).eq('id', body.worldId).select('id, name, avatar_url').single();
      if (error) throw error;
      return Response.json({ row: data });
    }
    if (!body.collection || !body.id || !(body.collection in collections)) return Response.json({ error: 'Invalid collection.' }, { status: 400 });
    const config = collections[body.collection];
    const { data, error } = await admin.from(config.table).update(pick(body.data, config.fields)).eq('id', body.id).eq('world_id', body.worldId).select('*').single();
    if (error) throw error;
    return Response.json({ row: data });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : 'Could not update world.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { worldId?: string; collection?: Collection; data?: Record<string, unknown> };
    if (!body.worldId || !body.collection || !(body.collection in collections)) return Response.json({ error: 'Invalid create request.' }, { status: 400 });
    const { admin } = await authorize(request, body.worldId);
    const config = collections[body.collection];
    const values = { ...pick(body.data ?? {}, config.fields), world_id: body.worldId } as Record<string, unknown>;
    if (body.collection === 'assets' && !values.asset_key) values.asset_key = `asset-${randomUUID()}`;
    const { data, error } = await admin.from(config.table).insert(values).select('*').single();
    if (error) throw error;
    return Response.json({ row: data });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : 'Could not create item.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { worldId?: string; collection?: Collection; id?: string };
    if (!body.worldId || !body.collection || !body.id || !(body.collection in collections)) return Response.json({ error: 'Invalid delete request.' }, { status: 400 });
    const { admin } = await authorize(request, body.worldId);
    const { error } = await admin.from(collections[body.collection].table).delete().eq('id', body.id).eq('world_id', body.worldId);
    if (error) throw error;
    return Response.json({ deleted: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : 'Could not delete item.' }, { status: 500 });
  }
}
