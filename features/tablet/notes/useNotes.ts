'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createNote, deleteNote, getNotes, updateNote, updateNotePosition } from './api';
import type { NoteDraft, NotesOwner, TabletNote } from './types';

export function useNotes(owner: NotesOwner | null) {
  const [notes, setNotes] = useState<TabletNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ownerKind = owner?.kind ?? null;
  const ownerId = owner?.id ?? null;
  const stableOwner = useMemo<NotesOwner | null>(() => {
    if (!ownerKind || !ownerId) return null;
    return { kind: ownerKind, id: ownerId } as NotesOwner;
  }, [ownerId, ownerKind]);

  const load = useCallback(async () => {
    // The owning world/character can arrive a render later than the tablet.
    // Keep the single initial loading state instead of flashing empty/loading twice.
    if (!stableOwner) return;
    setIsLoading(true); setError(null);
    try { setNotes(await getNotes(stableOwner)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Failed to load notes.'); }
    finally { setIsLoading(false); }
  }, [stableOwner]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const save = useCallback(async (id: string | null, draft: NoteDraft, position: { x: number; y: number }) => {
    if (!stableOwner) return null;
    setIsSaving(true); setError(null);
    try {
      if (id) {
        const current = notes.find((note) => note.id === id);
        if (!current) return null;
        const next = { ...current, ...draft };
        await updateNote(stableOwner, next);
        setNotes((items) => items.map((item) => item.id === id ? next : item));
        return next;
      }
      const created = await createNote(stableOwner, draft, position);
      setNotes((items) => [...items, created]);
      return created;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to save note.');
      return null;
    } finally { setIsSaving(false); }
  }, [notes, stableOwner]);

  const move = useCallback(async (id: string, position: { x: number; y: number }) => {
    if (!stableOwner) return;
    const previous = notes.find((note) => note.id === id);
    setNotes((items) => items.map((item) => item.id === id ? { ...item, ...position } : item));
    try { await updateNotePosition(stableOwner, id, position); }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to move note.');
      if (previous) setNotes((items) => items.map((item) => item.id === id ? previous : item));
    }
  }, [notes, stableOwner]);

  const remove = useCallback(async (id: string) => {
    if (!stableOwner) return false;
    setIsSaving(true); setError(null);
    try { await deleteNote(stableOwner, id); setNotes((items) => items.filter((item) => item.id !== id)); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Failed to delete note.'); return false; }
    finally { setIsSaving(false); }
  }, [stableOwner]);

  return { notes, isLoading, isSaving, error, save, move, remove };
}
