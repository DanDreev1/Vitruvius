import { randomUUID } from 'node:crypto';

import { authenticateSessionExitRequest, removeStoragePrefix } from '@/features/session-exit/server';
import type { StudioCharacterPayload } from '@/features/studio/player/types';

export const runtime = 'nodejs';

type Admin = Awaited<ReturnType<typeof authenticateSessionExitRequest>>['admin'];

function validPayload(value: unknown): value is StudioCharacterPayload {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<StudioCharacterPayload>;
  return Boolean(
    typeof draft.name === 'string' && draft.name.trim() && draft.name.trim().length <= 32 &&
    typeof draft.description === 'string' && draft.description.trim() &&
    Array.isArray(draft.attributes) && draft.attributes.length === 6 &&
    Array.isArray(draft.parameters) && draft.parameters.length >= 3 &&
    Array.isArray(draft.domains) && draft.domains.length > 0 && draft.domains.length <= 5 &&
    Array.isArray(draft.inventoryItems) && Array.isArray(draft.notes) && Array.isArray(draft.experiences)
  );
}

async function authorize(request: Request, characterId?: string | null) {
  const auth = await authenticateSessionExitRequest(request);
  if (auth.user.is_anonymous) throw new Response(JSON.stringify({ error: 'A permanent account is required.' }), { status: 403 });
  if (characterId) {
    const { data, error } = await auth.admin.from('characters').select('id').eq('id', characterId).eq('owner_user_id', auth.user.id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Response(JSON.stringify({ error: 'Character not found.' }), { status: 404 });
  }
  return auth;
}

async function loadCharacter(admin: Admin, characterId: string) {
  const [character, attributes, parameters, domains, inventoryItems, notes, experiences] = await Promise.all([
    admin.from('characters').select('id, name, description, avatar_url').eq('id', characterId).single(),
    admin.from('character_attributes').select('id, attribute_key, label, icon_key, value, sort_order').eq('character_id', characterId).order('sort_order'),
    admin.from('character_parameters').select('id, parameter_key, label, icon_key, current_value, max_value, sort_order').eq('character_id', characterId).order('sort_order'),
    admin.from('character_domains').select('id, domain_key, name, description, icon_key, level, sort_order, metadata').eq('character_id', characterId).order('sort_order'),
    admin.from('character_inventory_items').select('id, name, description, category, quantity, image_url, sort_order').eq('character_id', characterId).order('sort_order'),
    admin.from('character_notes').select('id, title, content, position_x, position_y, sort_order').eq('character_id', characterId).order('sort_order'),
    admin.from('character_experiences').select('id, headline, description, xp, tag, session_label, happened_at, sort_order, metadata').eq('character_id', characterId).order('sort_order'),
  ]);
  const failed = [character, attributes, parameters, domains, inventoryItems, notes, experiences].find((result) => result.error);
  if (failed?.error) throw failed.error;
  if (!character.data) throw new Error('Character not found.');

  const domainRows = domains.data ?? [];
  const domainIds = domainRows.map((domain) => domain.id);
  const skills = domainIds.length
    ? await admin.from('character_domain_skills').select('id, domain_id, skill_key, name, description, is_primary, level, sort_order, metadata').in('domain_id', domainIds).order('sort_order')
    : { data: [], error: null };
  if (skills.error) throw skills.error;

  return {
    id: character.data.id,
    name: character.data.name,
    description: character.data.description ?? '',
    portraitFile: null,
    portraitPreviewUrl: null,
    avatarUrl: character.data.avatar_url,
    attributes: (attributes.data ?? []).map((item) => ({ id: item.id, key: item.attribute_key, label: item.label, iconKey: item.icon_key, value: item.value, sortOrder: item.sort_order })),
    parameters: (parameters.data ?? []).map((item) => ({ id: item.id, key: item.parameter_key, label: item.label, iconKey: item.icon_key, currentValue: item.current_value, maxValue: item.max_value, sortOrder: item.sort_order })),
    domains: domainRows.map((domain) => ({
      id: domain.id, key: domain.domain_key, name: domain.name, description: domain.description,
      iconKey: domain.icon_key, level: domain.level, sortOrder: domain.sort_order,
      metadata: domain.metadata ?? {}, isDraft: false,
      skills: (skills.data ?? []).filter((skill) => skill.domain_id === domain.id).map((skill) => ({
        id: skill.id, key: skill.skill_key, name: skill.name, description: skill.description,
        iconKey: typeof skill.metadata?.icon_key === 'string' ? skill.metadata.icon_key : 'book',
        isPrimary: skill.is_primary, level: skill.level, sortOrder: skill.sort_order,
        metadata: skill.metadata ?? {}, isDraft: false,
      })),
    })),
    inventoryItems: (inventoryItems.data ?? []).map((item) => ({ id: item.id, name: item.name, description: item.description ?? '', category: item.category, quantity: item.quantity, imageUrl: item.image_url, sortOrder: item.sort_order })),
    notes: (notes.data ?? []).map((note) => ({ id: note.id, title: note.title, content: note.content ?? '', positionX: note.position_x, positionY: note.position_y, sortOrder: note.sort_order })),
    experiences: (experiences.data ?? []).map((item) => ({ id: item.id, headline: item.headline, description: item.description, xp: item.xp, tag: item.tag, sessionLabel: item.session_label, happenedAt: item.happened_at, sortOrder: item.sort_order, metadata: item.metadata ?? {}, isDraft: false })),
    relationships: [],
  };
}

async function replaceCollections(admin: Admin, characterId: string, payload: StudioCharacterPayload) {
  const { data: oldDomains, error: domainLookupError } = await admin.from('character_domains').select('id').eq('character_id', characterId);
  if (domainLookupError) throw domainLookupError;
  const domainIds = (oldDomains ?? []).map((domain) => domain.id);
  if (domainIds.length) {
    const { error } = await admin.from('character_domain_skills').delete().in('domain_id', domainIds);
    if (error) throw error;
  }
  for (const table of ['character_attributes', 'character_parameters', 'character_domains', 'character_inventory_items', 'character_notes', 'character_experiences']) {
    const { error } = await admin.from(table).delete().eq('character_id', characterId);
    if (error) throw error;
  }

  const insert = async (table: string, rows: Record<string, unknown>[]) => {
    if (!rows.length) return;
    const { error } = await admin.from(table).insert(rows);
    if (error) throw error;
  };
  await insert('character_attributes', payload.attributes.map((item, index) => ({ character_id: characterId, attribute_key: item.key, label: item.label, icon_key: item.iconKey, value: item.value, sort_order: index, metadata: {} })));
  await insert('character_parameters', payload.parameters.map((item, index) => ({ character_id: characterId, parameter_key: item.key, label: item.label, icon_key: item.iconKey, current_value: item.currentValue, max_value: item.maxValue, sort_order: index, metadata: {} })));
  for (const [domainIndex, domain] of payload.domains.entries()) {
    const { data, error } = await admin.from('character_domains').insert({ character_id: characterId, domain_key: domain.key, name: domain.name.trim(), description: domain.description?.trim() || null, icon_key: domain.iconKey, level: domain.level, sort_order: domainIndex, metadata: domain.metadata ?? {} }).select('id').single();
    if (error) throw error;
    await insert('character_domain_skills', domain.skills.map((skill, skillIndex) => ({ domain_id: data.id, skill_key: skill.key, name: skill.name.trim(), description: skill.description?.trim() || null, is_primary: skill.isPrimary, level: skill.isPrimary ? domain.level : skill.level, sort_order: skillIndex, metadata: { ...(skill.metadata ?? {}), icon_key: skill.iconKey } })));
  }
  await insert('character_inventory_items', payload.inventoryItems.map((item, index) => ({ character_id: characterId, name: item.name.trim(), description: item.description.trim() || null, category: item.category, quantity: item.quantity, image_url: item.imageUrl, sort_order: index, metadata: {} })));
  await insert('character_notes', payload.notes.map((note, index) => ({ character_id: characterId, title: note.title.trim(), content: note.content.trim() || null, position_x: note.positionX, position_y: note.positionY, sort_order: index, metadata: {} })));
  await insert('character_experiences', payload.experiences.map((item, index) => ({ character_id: characterId, headline: item.headline.trim(), description: item.description?.trim() || null, xp: item.xp, tag: item.tag, session_label: item.sessionLabel, happened_at: item.happenedAt, sort_order: index, metadata: item.metadata ?? {} })));
}

async function readPayload(request: Request) {
  const form = await request.formData();
  const payload = JSON.parse(String(form.get('character') ?? '')) as unknown;
  if (!validPayload(payload)) throw new Response(JSON.stringify({ error: 'Complete the required character fields before saving.' }), { status: 400 });
  return { form, payload };
}

async function savePortrait(admin: Admin, characterId: string, form: FormData, currentAvatar: string | null) {
  const portrait = form.get('portrait');
  if (!(portrait instanceof File) || portrait.size === 0) return currentAvatar;
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(portrait.type) || portrait.size > 5 * 1024 * 1024) throw new Error('Portrait must be JPG, PNG, WEBP, or GIF and no larger than 5 MB.');
  const extension = portrait.name.includes('.') ? portrait.name.slice(portrait.name.lastIndexOf('.')).replace(/[^.a-zA-Z0-9]/g, '') : '';
  const path = `characters/${characterId}/avatar/${randomUUID()}${extension}`;
  const { error } = await admin.storage.from('character-avatars').upload(path, portrait, { contentType: portrait.type });
  if (error) throw error;
  return admin.storage.from('character-avatars').getPublicUrl(path).data.publicUrl;
}

export async function GET(request: Request) {
  try {
    const characterId = new URL(request.url).searchParams.get('id');
    if (!characterId) return Response.json({ error: 'Character id is required.' }, { status: 400 });
    const auth = await authorize(request, characterId);
    return Response.json({ character: await loadCharacter(auth.admin, characterId) });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : 'Could not load character.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let characterId: string | null = null;
  let admin: Admin | null = null;
  try {
    const auth = await authorize(request); admin = auth.admin;
    const { form, payload } = await readPayload(request);
    const { data, error } = await admin.from('characters').insert({ owner_user_id: auth.user.id, name: payload.name.trim(), description: payload.description.trim(), avatar_url: null }).select('id, name, avatar_url').single();
    if (error) throw error;
    const createdId = data.id as string;
    characterId = createdId;
    const avatarUrl = await savePortrait(admin, createdId, form, null);
    const { error: updateError } = await admin.from('characters').update({ avatar_url: avatarUrl }).eq('id', createdId);
    if (updateError) throw updateError;
    await replaceCollections(admin, createdId, payload);
    return Response.json({ character: { ...data, avatar_url: avatarUrl } });
  } catch (error) {
    if (admin && characterId) { await admin.from('characters').delete().eq('id', characterId); await removeStoragePrefix(admin, 'character-avatars', `characters/${characterId}`); }
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : 'Could not create character.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const characterId = new URL(request.url).searchParams.get('id');
    if (!characterId) return Response.json({ error: 'Character id is required.' }, { status: 400 });
    const auth = await authorize(request, characterId);
    const { form, payload } = await readPayload(request);
    const current = await loadCharacter(auth.admin, characterId);
    const avatarUrl = await savePortrait(auth.admin, characterId, form, current.avatarUrl);
    const { data, error } = await auth.admin.from('characters').update({ name: payload.name.trim(), description: payload.description.trim(), avatar_url: avatarUrl }).eq('id', characterId).eq('owner_user_id', auth.user.id).select('id, name, avatar_url').single();
    if (error) throw error;
    await replaceCollections(auth.admin, characterId, payload);
    return Response.json({ character: data });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : 'Could not update character.' }, { status: 500 });
  }
}
