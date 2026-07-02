import { randomUUID } from 'node:crypto';
import { authenticateSessionExitRequest } from '@/features/session-exit/server';

export const runtime = 'nodejs';

const targets = {
  avatar: { bucket: 'world-avatars', folder: 'avatar', public: true },
  image: { bucket: 'scene-images', folder: 'images', public: true },
  music: { bucket: 'scene-music', folder: 'music', public: true },
  cover: { bucket: 'scene-images', folder: 'music-covers', public: true },
  npc: { bucket: 'relationship-npc-images', folder: 'npcs', public: false },
  asset: { bucket: 'asset-images', folder: 'assets', public: false },
} as const;

export async function POST(request: Request) {
  try {
    const { admin, user } = await authenticateSessionExitRequest(request);
    const form = await request.formData();
    const worldId = String(form.get('worldId') ?? '');
    const kind = String(form.get('kind') ?? '') as keyof typeof targets;
    const file = form.get('file');
    if (!worldId || !(kind in targets) || !(file instanceof File)) return Response.json({ error: 'Invalid file request.' }, { status: 400 });
    const { data: world } = await admin.from('worlds').select('id').eq('id', worldId).eq('owner_user_id', user.id).maybeSingle();
    if (!world) return Response.json({ error: 'World not found.' }, { status: 404 });
    const target = targets[kind];
    const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).replace(/[^.a-zA-Z0-9]/g, '') : '';
    const path = `worlds/${worldId}/${target.folder}/${randomUUID()}${extension}`;
    const { error } = await admin.storage.from(target.bucket).upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const displayUrl = target.public ? admin.storage.from(target.bucket).getPublicUrl(path).data.publicUrl : (await admin.storage.from(target.bucket).createSignedUrl(path, 3600)).data?.signedUrl ?? null;
    return Response.json({ value: target.public ? displayUrl : path, displayUrl, path });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not upload file.' }, { status: 500 });
  }
}
