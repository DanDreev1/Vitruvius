import { supabase } from '@/lib/supabaseClient';

import type { NoteDraft, NotesOwner, TabletNote } from './types';
import {
  assertTabletTextLength,
  TABLET_NOTE_CONTENT_MAX_LENGTH,
  TABLET_SHORT_TEXT_MAX_LENGTH,
} from '../textLimits';

function validateNote(title: string, content: string) {
  assertTabletTextLength(title, TABLET_SHORT_TEXT_MAX_LENGTH, 'Note title');
  assertTabletTextLength(content, TABLET_NOTE_CONTENT_MAX_LENGTH, 'Note content');
}

const config = {
  master: {
    table: 'in_game_worlds_notes',
    ownerColumn: 'in_game_world_id',
  },
  player: {
    table: 'in_game_character_notes',
    ownerColumn: 'in_game_character_id',
  },
} as const;

export async function getNotes(owner: NotesOwner): Promise<TabletNote[]> {
  const fields = config[owner.kind];
  const { data, error } = await supabase
    .from(fields.table)
    .select('id, title, content, position_x, position_y')
    .eq(fields.ownerColumn, owner.id);

  if (error) throw new Error(`Failed to load notes: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: ((row.title as string | null) ?? '').slice(0, TABLET_SHORT_TEXT_MAX_LENGTH),
    content: ((row.content as string | null) ?? '').slice(0, TABLET_NOTE_CONTENT_MAX_LENGTH),
    x: Number(row.position_x ?? 0),
    y: Number(row.position_y ?? 0),
  }));
}

export async function createNote(
  owner: NotesOwner,
  draft: NoteDraft,
  position: { x: number; y: number }
) {
  validateNote(draft.title, draft.content);
  const fields = config[owner.kind];
  const { data, error } = await supabase
    .from(fields.table)
    .insert({
      [fields.ownerColumn]: owner.id,
      title: draft.title.trim(),
      content: draft.content.trim(),
      position_x: position.x,
      position_y: position.y,
    })
    .select('id, title, content, position_x, position_y')
    .single();

  if (error) throw new Error(`Failed to create note: ${error.message}`);
  return {
    id: data.id as string,
    title: data.title as string,
    content: (data.content as string | null) ?? '',
    x: Number(data.position_x ?? position.x),
    y: Number(data.position_y ?? position.y),
  } satisfies TabletNote;
}

export async function updateNote(owner: NotesOwner, note: TabletNote) {
  validateNote(note.title, note.content);
  const fields = config[owner.kind];
  const { error } = await supabase
    .from(fields.table)
    .update({
      title: note.title.trim(),
      content: note.content.trim(),
      position_x: note.x,
      position_y: note.y,
    })
    .eq('id', note.id)
    .eq(fields.ownerColumn, owner.id);
  if (error) throw new Error(`Failed to update note: ${error.message}`);
}

export async function updateNotePosition(
  owner: NotesOwner,
  noteId: string,
  position: { x: number; y: number }
) {
  const fields = config[owner.kind];
  const { error } = await supabase
    .from(fields.table)
    .update({ position_x: position.x, position_y: position.y })
    .eq('id', noteId)
    .eq(fields.ownerColumn, owner.id);
  if (error) throw new Error(`Failed to move note: ${error.message}`);
}

export async function deleteNote(owner: NotesOwner, noteId: string) {
  const fields = config[owner.kind];
  const { error } = await supabase
    .from(fields.table)
    .delete()
    .eq('id', noteId)
    .eq(fields.ownerColumn, owner.id);
  if (error) throw new Error(`Failed to delete note: ${error.message}`);
}
