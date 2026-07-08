'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { useTranslations } from 'next-intl';

import { useNotes } from '@/features/tablet/notes/useNotes';
import type { NoteDraft, NotesOwner, TabletNote } from '@/features/tablet/notes/types';
import { createId } from '@/lib/createId';

const CARD_WIDTH = 250;
const CARD_HEIGHT = 174;
const MIN_SCALE = 0.45;
const MAX_SCALE = 2;
const EMPTY_DRAFT: NoteDraft = { title: '', content: '' };
const DEFAULT_CAMERA: Camera = { x: 380, y: 240, scale: 1 };
const CAMERA_SAVE_DELAY_MS = 250;

type Camera = { x: number; y: number; scale: number };
type DragState =
  | { type: 'camera'; startX: number; startY: number; originX: number; originY: number }
  | { type: 'note'; id: string; startX: number; startY: number; originX: number; originY: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getCameraStorageKey(owner: NotesOwner) {
  return `vitruvius:notes-camera:${owner.kind}:${owner.id}`;
}

function readStoredCamera(key: string): Camera | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? 'null') as Partial<Camera> | null;
    if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y) || !Number.isFinite(value.scale)) return null;
    return { x: value.x as number, y: value.y as number, scale: clamp(value.scale as number, MIN_SCALE, MAX_SCALE) };
  } catch {
    return null;
  }
}

function NotesCard({
  note,
  scale,
  selected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  note: TabletNote;
  scale: number;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (event: PointerEvent<HTMLButtonElement>) => void;
  onDragMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onDragEnd: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  const t = useTranslations('TabletPlayer.notes');
  return (
    <article
      className={`absolute select-none overflow-hidden rounded-[18px] border bg-[#253249] shadow-[0_18px_45px_rgba(3,8,18,.32)] transition-[border-color,box-shadow] ${selected ? 'border-white/35 shadow-[0_0_0_2px_rgba(255,255,255,.08),0_18px_45px_rgba(3,8,18,.4)]' : 'border-white/10'}`}
      style={{ left: note.x, top: note.y, width: CARD_WIDTH, minHeight: CARD_HEIGHT }}
      onClick={(event) => { event.stopPropagation(); onSelect(); }}
    >
      <button
        type="button"
        aria-label={t('moveNote', { name: note.title })}
        className="flex h-[38px] w-full cursor-grab touch-none items-center justify-center border-b border-white/8 bg-white/[.025] text-white/38 active:cursor-grabbing"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <span className="grid grid-cols-3 gap-[4px]" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => <i key={index} className="h-[3px] w-[3px] rounded-full bg-current" />)}
        </span>
      </button>
      <div className="p-[18px]">
        <h3 className="font-montserrat-alt truncate text-[18px] font-bold text-white/90">{note.title}</h3>
        <p className="mt-[10px] line-clamp-4 whitespace-pre-wrap text-[14px] leading-[1.55] text-white/70">{note.content || t('emptyNote')}</p>
      </div>
      {scale < 0.65 ? <div className="pointer-events-none absolute inset-0 bg-[#253249]/10" /> : null}
    </article>
  );
}

function DeleteNoteDialog({
  note,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  note: TabletNote;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations('TabletPlayer.notes');
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-note-title"
      onPointerDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget && !isDeleting) onCancel();
      }}
    >
      <div
        className="w-[390px] rounded-[8px] border border-white/25 bg-[#172033] p-[16px]"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <h2 id="delete-note-title" className="font-montserrat-alt text-[18px] font-extrabold text-white">
          {t('deleteNoteTitle', { name: note.title || t('thisNote') })}
        </h2>
        <p className="mt-[8px] font-montserrat text-[12px] text-white/65">
          {t('deleteNoteDescription')}
        </p>

        <div className="mt-[15px] flex justify-end gap-[8px]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-[12px] py-[7px] text-[11px] text-white disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-[5px] bg-red-500 px-[14px] py-[7px] text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? t('deleting') : t('deleteNote')}
          </button>
        </div>
      </div>
    </div>
  );
}

type TabletNotesPageProps = {
  owner?: NotesOwner | null;
  draftNotes?: TabletNote[];
  onDraftNotesChange?: (notes: TabletNote[]) => void;
  cameraStorageKey?: string;
};

export default function TabletNotesPage({ owner = null, draftNotes, onDraftNotesChange, cameraStorageKey: providedCameraStorageKey }: TabletNotesPageProps) {
  const t = useTranslations('TabletPlayer.notes');
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const movedRef = useRef(false);
  const restoredCameraKeyRef = useRef<string | null>(null);
  const remote = useNotes(owner);
  const isLocalDraft = Boolean(draftNotes && onDraftNotesChange);
  const notes = draftNotes ?? remote.notes;
  const isLoading = isLocalDraft ? false : remote.isLoading;
  const isSaving = isLocalDraft ? false : remote.isSaving;
  const error = isLocalDraft ? null : remote.error;
  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NoteDraft>(EMPTY_DRAFT);
  const [notePendingDelete, setNotePendingDelete] = useState<TabletNote | null>(null);

  const selected = useMemo(() => notes.find((note) => note.id === selectedId) ?? null, [notes, selectedId]);
  const hasFormChanges = selected
    ? draft.title !== selected.title || draft.content !== selected.content
    : Boolean(draft.title || draft.content);
  const canSave = Boolean(draft.title.trim()) && hasFormChanges && !isSaving;
  const cameraStorageKey = providedCameraStorageKey ?? (owner ? getCameraStorageKey(owner) : null);

  const saveNote = async (noteId: string | null, noteDraft: NoteDraft, position: { x: number; y: number }) => {
    if (!isLocalDraft) return remote.save(noteId, noteDraft, position);
    const nextNote: TabletNote = noteId
      ? { ...(notes.find((note) => note.id === noteId) as TabletNote), ...noteDraft }
      : { id: `draft-note-${createId()}`, ...noteDraft, ...position };
    onDraftNotesChange?.(noteId ? notes.map((note) => note.id === noteId ? nextNote : note) : [...notes, nextNote]);
    return nextNote;
  };

  const moveNote = async (noteId: string, position: { x: number; y: number }) => {
    if (!isLocalDraft) return remote.move(noteId, position);
    onDraftNotesChange?.(notes.map((note) => note.id === noteId ? { ...note, ...position } : note));
  };

  const removeNote = async (noteId: string) => {
    if (!isLocalDraft) return remote.remove(noteId);
    onDraftNotesChange?.(notes.filter((note) => note.id !== noteId));
    return true;
  };

  useEffect(() => {
    if (!cameraStorageKey) return;
    const timeoutId = window.setTimeout(() => {
      setCamera(readStoredCamera(cameraStorageKey) ?? DEFAULT_CAMERA);
      restoredCameraKeyRef.current = cameraStorageKey;
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [cameraStorageKey]);

  useEffect(() => {
    if (!cameraStorageKey || restoredCameraKeyRef.current !== cameraStorageKey) return;
    const timeoutId = window.setTimeout(() => {
      try { window.localStorage.setItem(cameraStorageKey, JSON.stringify(camera)); }
      catch { /* Camera persistence is optional when storage is unavailable. */ }
    }, CAMERA_SAVE_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [camera, cameraStorageKey]);

  useEffect(() => {
    if (!notePendingDelete || isSaving) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotePendingDelete(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, notePendingDelete]);

  function beginNew() {
    setSelectedId(null);
    setDraft(EMPTY_DRAFT);
  }

  function selectNote(note: TabletNote) {
    if (movedRef.current) return;
    setSelectedId(note.id);
    setDraft({ title: note.title, content: note.content });
  }

  function startCameraDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { type: 'camera', startX: event.clientX, startY: event.clientY, originX: camera.x, originY: camera.y };
    movedRef.current = false;
  }

  function startNoteDrag(note: TabletNote, event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { type: 'note', id: note.id, startX: event.clientX, startY: event.clientY, originX: note.x, originY: note.y };
    movedRef.current = false;
  }

  function handleCameraPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.type !== 'camera') return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) movedRef.current = true;
    setCamera((value) => ({ ...value, x: drag.originX + dx, y: drag.originY + dy }));
  }

  function finishCameraDrag() {
    const drag = dragRef.current;
    if (!drag || drag.type !== 'camera') return;
    dragRef.current = null;
    window.setTimeout(() => { movedRef.current = false; }, 0);
  }

  function moveNoteDrag(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const drag = dragRef.current;
    if (!drag || drag.type !== 'note') return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) movedRef.current = true;
    const card = document.querySelector<HTMLElement>(`[data-note-id="${drag.id}"]`);
    if (card) {
      card.style.left = `${Math.round(drag.originX + dx / camera.scale)}px`;
      card.style.top = `${Math.round(drag.originY + dy / camera.scale)}px`;
    }
  }

  function finishNoteDrag(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const drag = dragRef.current;
    if (!drag || drag.type !== 'note') return;
    if (movedRef.current) {
      const dx = (event.clientX - drag.startX) / camera.scale;
      const dy = (event.clientY - drag.startY) / camera.scale;
      void moveNote(drag.id, { x: Math.round(drag.originX + dx), y: Math.round(drag.originY + dy) });
    }
    dragRef.current = null;
    window.setTimeout(() => { movedRef.current = false; }, 0);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const bounds = viewportRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const pointX = event.clientX - bounds.left;
    const pointY = event.clientY - bounds.top;
    setCamera((current) => {
      const nextScale = clamp(current.scale * Math.exp(-event.deltaY * 0.0012), MIN_SCALE, MAX_SCALE);
      const worldX = (pointX - current.x) / current.scale;
      const worldY = (pointY - current.y) / current.scale;
      return { scale: nextScale, x: pointX - worldX * nextScale, y: pointY - worldY * nextScale };
    });
  }

  function zoom(factor: number) {
    const bounds = viewportRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;
    setCamera((current) => {
      const nextScale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE);
      return {
        scale: nextScale,
        x: centerX - ((centerX - current.x) / current.scale) * nextScale,
        y: centerY - ((centerY - current.y) / current.scale) * nextScale,
      };
    });
  }

  async function handleSubmit() {
    if (!canSave) return;
    const bounds = viewportRef.current?.getBoundingClientRect();
    const position = {
      x: Math.round(((bounds?.width ?? 800) / 2 - camera.x) / camera.scale - CARD_WIDTH / 2),
      y: Math.round(((bounds?.height ?? 600) / 2 - camera.y) / camera.scale - CARD_HEIGHT / 2),
    };
    const saved = await saveNote(selectedId, draft, position);
    if (saved) beginNew();
  }

  async function handleDelete() {
    if (!notePendingDelete) return;
    if (await removeNote(notePendingDelete.id)) {
      setNotePendingDelete(null);
      beginNew();
    }
  }

  return (
    <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)_318px] gap-[16px]">
      <section className="relative min-h-0 overflow-hidden rounded-[24px] border border-white/8 bg-[#111927]">
        <div
          ref={viewportRef}
          className="absolute inset-0 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.12) 1.2px, transparent 1.2px)', backgroundSize: `${24 * camera.scale}px ${24 * camera.scale}px`, backgroundPosition: `${camera.x}px ${camera.y}px` }}
          onPointerDown={startCameraDrag}
          onPointerMove={handleCameraPointerMove}
          onPointerUp={finishCameraDrag}
          onPointerCancel={finishCameraDrag}
          onWheel={handleWheel}
          onClick={() => { if (!movedRef.current) beginNew(); }}
        >
          <div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }}>
            {notes.map((note) => (
              <div key={note.id} data-note-id={note.id} className="pointer-events-auto absolute" style={{ left: note.x, top: note.y }}>
                <NotesCard note={{ ...note, x: 0, y: 0 }} scale={camera.scale} selected={selectedId === note.id} onSelect={() => selectNote(note)} onDragStart={(event) => startNoteDrag(note, event)} onDragMove={moveNoteDrag} onDragEnd={finishNoteDrag} />
              </div>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute left-[18px] top-[18px]">
          <h2 className="font-montserrat-alt text-[28px] font-extrabold text-white/90">{t('notes')}</h2>
          <p className="mt-[3px] text-[13px] text-white/45">{t('dragZoom')}</p>
        </div>
        <div className="absolute bottom-[18px] left-[18px] flex overflow-hidden rounded-[14px] border border-white/10 bg-[#1A2332]/95 shadow-xl">
          <button type="button" className="h-[42px] w-[44px] text-[22px] text-white/75 hover:bg-white/8" onClick={() => zoom(0.82)} aria-label={t('zoomOut')}>−</button>
          <button type="button" className="w-[60px] border-x border-white/8 text-[12px] font-semibold text-white/60" onClick={() => setCamera(DEFAULT_CAMERA)}>{Math.round(camera.scale * 100)}%</button>
          <button type="button" className="h-[42px] w-[44px] text-[20px] text-white/75 hover:bg-white/8" onClick={() => zoom(1.22)} aria-label={t('zoomIn')}>+</button>
        </div>
        {isLoading ? <div className="absolute inset-0 grid place-items-center bg-[#111927]/70 text-sm text-white/55">{t('loadingNotes')}</div> : null}
        {!isLoading && !notes.length ? <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="text-center"><p className="font-montserrat-alt text-[20px] font-bold text-white/60">{t('emptyBoard')}</p><p className="mt-2 text-[13px] text-white/35">{t('emptyBoardHelp')}</p></div></div> : null}
      </section>

      <aside className="flex min-h-0 flex-col rounded-[24px] border border-white/8 bg-[#1A2332] p-[20px]">
        <div className="flex items-center justify-between">
          <div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-white/35">{selected ? t('editing') : t('newNote')}</p><h3 className="font-montserrat-alt mt-1 text-[22px] font-bold text-white/90">{selected?.title || t('writeItDown')}</h3></div>
          <button type="button" onClick={beginNew} className="grid h-[38px] w-[38px] place-items-center rounded-[12px] border border-white/12 bg-white/8 text-[22px] font-semibold text-white/80 hover:bg-white/12" aria-label={t('newNote')}>+</button>
        </div>
        <label className="mt-[24px] text-[12px] font-semibold text-white/50">{t('title')}</label>
        <input value={draft.title} maxLength={80} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} placeholder={t('noteTitle')} className="mt-[7px] h-[48px] rounded-[14px] border border-white/8 bg-[#111927] px-[14px] text-[14px] text-white outline-none placeholder:text-white/25 focus:border-white/30" />
        <label className="mt-[16px] text-[12px] font-semibold text-white/50">{t('note')}</label>
        <textarea value={draft.content} maxLength={2000} onChange={(event) => setDraft((value) => ({ ...value, content: event.target.value }))} placeholder={t('notePlaceholder')} className="mt-[7px] min-h-0 flex-1 resize-none rounded-[14px] border border-white/8 bg-[#111927] p-[14px] text-[14px] leading-[1.55] text-white outline-none placeholder:text-white/25 focus:border-white/30" />
        <div className="mt-[16px] flex gap-[10px]">
          {selected ? <button type="button" onClick={() => setNotePendingDelete(selected)} disabled={isSaving} className="h-[48px] rounded-[14px] border border-[#E07373]/25 px-[16px] text-[13px] font-bold text-[#E88A8A] disabled:opacity-50">{t('delete')}</button> : null}
          <button type="button" onClick={() => void handleSubmit()} disabled={!canSave} className="h-[48px] flex-1 rounded-[14px] bg-white px-[18px] text-[14px] font-extrabold text-[#172033] transition-opacity disabled:cursor-not-allowed disabled:opacity-25">{isSaving ? t('saving') : selected ? t('saveChanges') : t('createNote')}</button>
        </div>
        {error ? <p className="mt-[12px] text-[12px] leading-relaxed text-[#E88A8A]">{error}</p> : null}
      </aside>

      {notePendingDelete ? (
        <DeleteNoteDialog
          note={notePendingDelete}
          isDeleting={isSaving}
          onCancel={() => setNotePendingDelete(null)}
          onConfirm={() => void handleDelete()}
        />
      ) : null}
    </div>
  );
}
