import { randomUUID } from 'node:crypto';

import { authenticateSessionExitRequest, removeStoragePrefix } from '@/features/session-exit/server';
import type { StudioCharacterPayload } from '@/features/studio/player/types';

export const runtime = 'nodejs';

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

export async function POST(request: Request) {
  let characterId: string | null = null;
  let admin: Awaited<ReturnType<typeof authenticateSessionExitRequest>>['admin'] | null = null;
  try {
    const auth = await authenticateSessionExitRequest(request);
    admin = auth.admin;
    if (auth.user.is_anonymous) return Response.json({ error: 'A permanent account is required.' }, { status: 403 });

    const form = await request.formData();
    const rawCharacter = String(form.get('character') ?? '');
    const payload = JSON.parse(rawCharacter) as unknown;
    if (!validPayload(payload)) return Response.json({ error: 'Complete the required character fields before saving.' }, { status: 400 });

    const { data: character, error: characterError } = await admin
      .from('characters')
      .insert({ owner_user_id: auth.user.id, name: payload.name.trim(), description: payload.description.trim(), avatar_url: null })
      .select('id, name, avatar_url')
      .single();
    if (characterError) throw characterError;
    characterId = character.id as string;

    let avatarUrl: string | null = null;
    const portrait = form.get('portrait');
    if (portrait instanceof File && portrait.size > 0) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(portrait.type) || portrait.size > 5 * 1024 * 1024) {
        throw new Error('Portrait must be JPG, PNG, WEBP, or GIF and no larger than 5 MB.');
      }
      const extension = portrait.name.includes('.') ? portrait.name.slice(portrait.name.lastIndexOf('.')).replace(/[^.a-zA-Z0-9]/g, '') : '';
      const path = `characters/${characterId}/avatar/${randomUUID()}${extension}`;
      const { error } = await admin.storage.from('character-avatars').upload(path, portrait, { contentType: portrait.type });
      if (error) throw error;
      avatarUrl = admin.storage.from('character-avatars').getPublicUrl(path).data.publicUrl;
      const { error: avatarError } = await admin.from('characters').update({ avatar_url: avatarUrl }).eq('id', characterId);
      if (avatarError) throw avatarError;
    }

    const insert = async (table: string, rows: Record<string, unknown>[]) => {
      if (!rows.length) return;
      const { error } = await admin!.from(table).insert(rows);
      if (error) throw error;
    };

    await insert('character_attributes', payload.attributes.map((item, index) => ({
      character_id: characterId, attribute_key: item.key, label: item.label, icon_key: item.iconKey,
      value: item.value, sort_order: index, metadata: {},
    })));
    await insert('character_parameters', payload.parameters.map((item, index) => ({
      character_id: characterId, parameter_key: item.key, label: item.label, icon_key: item.iconKey,
      current_value: item.currentValue, max_value: item.maxValue, sort_order: index, metadata: {},
    })));

    for (const [domainIndex, domain] of payload.domains.entries()) {
      const { data, error } = await admin.from('character_domains').insert({
        character_id: characterId, domain_key: domain.key, name: domain.name.trim(),
        description: domain.description?.trim() || null, icon_key: domain.iconKey,
        level: domain.level, sort_order: domainIndex, metadata: domain.metadata ?? {},
      }).select('id').single();
      if (error) throw error;
      await insert('character_domain_skills', domain.skills.map((skill, skillIndex) => ({
        domain_id: data.id, skill_key: skill.key, name: skill.name.trim(),
        description: skill.description?.trim() || null, is_primary: skill.isPrimary,
        level: skill.isPrimary ? domain.level : skill.level, sort_order: skillIndex,
        metadata: { ...(skill.metadata ?? {}), icon_key: skill.iconKey },
      })));
    }

    await insert('character_inventory_items', payload.inventoryItems.map((item, index) => ({
      character_id: characterId, name: item.name.trim(), description: item.description.trim() || null,
      category: item.category, quantity: item.quantity, image_url: item.imageUrl, sort_order: index, metadata: {},
    })));
    await insert('character_notes', payload.notes.map((note, index) => ({
      character_id: characterId, title: note.title.trim(), content: note.content.trim() || null,
      position_x: note.positionX, position_y: note.positionY, sort_order: index, metadata: {},
    })));
    await insert('character_experiences', payload.experiences.map((item, index) => ({
      character_id: characterId, headline: item.headline.trim(), description: item.description?.trim() || null,
      xp: item.xp, tag: item.tag, session_label: item.sessionLabel, happened_at: item.happenedAt,
      sort_order: index, metadata: item.metadata ?? {},
    })));

    return Response.json({ character: { ...character, avatar_url: avatarUrl } });
  } catch (error) {
    if (admin && characterId) {
      await admin.from('characters').delete().eq('id', characterId);
      await removeStoragePrefix(admin, 'character-avatars', `characters/${characterId}`);
    }
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : 'Could not create character.' }, { status: 500 });
  }
}
