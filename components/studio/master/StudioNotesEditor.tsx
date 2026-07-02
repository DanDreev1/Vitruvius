'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from 'react';

import {
  createWorldRow,
  deleteWorldRow,
  updateWorldRow,
} from '@/features/studio/master/api';
import type { StudioWorldData, WorldNote } from '@/features/studio/master/types';

const CARD_WIDTH = 250;
const CARD_HEIGHT = 174;
const MIN_SCALE = 0.45;
const MAX_SCALE = 2;
const DEFAULT_CAMERA: Camera = { x: 380, y: 240, scale: 1 };
const EMPTY_DRAFT = { title: '', content: '' };

type Camera = { x: number; y: number; scale: number };
type DragState =
  | { type: 'camera'; startX: number; startY: number; originX: number; originY: number }
  | { type: 'note'; id: string; startX: number; startY: number; originX: number; originY: number };

type Props = {
  worldId: string;
  data: StudioWorldData;
  reload: () => Promise<void>;
  setError: (message: string | null) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function NoteCard({
  note,
  scale,
  selected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  note: WorldNote;
  scale: number;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (event: PointerEvent<HTMLButtonElement>) => void;
  onDragMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onDragEnd: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <article
      className={`absolute select-none overflow-hidden rounded-[18px] border bg-[#253249] shadow-[0_18px_45px_rgba(3,8,18,.32)] transition-[border-color,box-shadow] ${selected ? 'border-white/35 shadow-[0_0_0_2px_rgba(255,255,255,.08),0_18px_45px_rgba(3,8,18,.4)]' : 'border-white/10'}`}
      style={{ left: 0, top: 0, width: CARD_WIDTH, minHeight: CARD_HEIGHT }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <button
        type="button"
        aria-label={`Move ${note.title}`}
        className="flex h-[38px] w-full cursor-grab touch-none items-center justify-center border-b border-white/8 bg-white/[.025] text-white/38 active:cursor-grabbing"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <span className="grid grid-cols-3 gap-[4px]" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <i key={index} className="h-[3px] w-[3px] rounded-full bg-current" />
          ))}
        </span>
      </button>
      <div className="p-[18px]">
        <h3 className="truncate font-montserrat-alt text-[18px] font-bold text-white/90">
          {note.title}
        </h3>
        <p className="mt-[10px] line-clamp-4 whitespace-pre-wrap text-[14px] leading-[1.55] text-white/70">
          {note.content || 'Empty note'}
        </p>
      </div>
      {scale < 0.65 ? <div className="pointer-events-none absolute inset-0 bg-[#253249]/10" /> : null}
    </article>
  );
}

function DeleteDialog({
  note,
  busy,
  onCancel,
  onConfirm,
}: {
  note: WorldNote;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-world-note-title"
      onPointerDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="w-[390px] rounded-[8px] border border-white/25 bg-[#172033] p-[16px]"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <h2 id="delete-world-note-title" className="font-montserrat-alt text-[18px] font-extrabold text-white">
          Delete {note.title || 'this note'}?
        </h2>
        <p className="mt-[8px] font-montserrat text-[12px] text-white/65">
          This note will be permanently removed.
        </p>
        <div className="mt-[15px] flex justify-end gap-[8px]">
          <button type="button" onClick={onCancel} disabled={busy} className="px-[12px] py-[7px] text-[11px] text-white disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="rounded-[5px] bg-red-500 px-[14px] py-[7px] text-[11px] font-bold text-white disabled:opacity-50">
            {busy ? 'Deleting…' : 'Delete note'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudioNotesEditor({ worldId, data, reload, setError }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const movedRef = useRef(false);
  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<WorldNote | null>(null);
  const [optimisticPositions, setOptimisticPositions] = useState<Record<string, { position_x: number; position_y: number }>>({});

  const selected = useMemo(
    () => data.notes.find((note) => note.id === selectedId) ?? null,
    [data.notes, selectedId],
  );
  const hasChanges = selected
    ? draft.title !== selected.title || draft.content !== (selected.content ?? '')
    : Boolean(draft.title || draft.content);
  const canSave = Boolean(draft.title.trim()) && hasChanges && !busy;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(`vitruvius:studio-notes-camera:${worldId}`) ?? 'null') as Partial<Camera> | null;
        if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y) && Number.isFinite(stored.scale)) {
          setCamera({ x: stored.x as number, y: stored.y as number, scale: clamp(stored.scale as number, MIN_SCALE, MAX_SCALE) });
        } else {
          setCamera(DEFAULT_CAMERA);
        }
      } catch {
        setCamera(DEFAULT_CAMERA);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [worldId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(`vitruvius:studio-notes-camera:${worldId}`, JSON.stringify(camera));
      } catch {
        // Camera persistence is optional.
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [camera, worldId]);

  useEffect(() => {
    if (!pendingDelete || busy) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPendingDelete(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, pendingDelete]);

  function beginNew() {
    setSelectedId(null);
    setDraft(EMPTY_DRAFT);
  }

  function selectNote(note: WorldNote) {
    if (movedRef.current) return;
    setSelectedId(note.id);
    setDraft({ title: note.title, content: note.content ?? '' });
  }

  function startCameraDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { type: 'camera', startX: event.clientX, startY: event.clientY, originX: camera.x, originY: camera.y };
    movedRef.current = false;
  }

  function moveCamera(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.type !== 'camera') return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) movedRef.current = true;
    setCamera((value) => ({ ...value, x: drag.originX + dx, y: drag.originY + dy }));
  }

  function finishCameraDrag() {
    if (dragRef.current?.type !== 'camera') return;
    dragRef.current = null;
    window.setTimeout(() => { movedRef.current = false; }, 0);
  }

  function startNoteDrag(note: WorldNote, event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { type: 'note', id: note.id, startX: event.clientX, startY: event.clientY, originX: note.position_x, originY: note.position_y };
    movedRef.current = false;
  }

  function moveNote(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const drag = dragRef.current;
    if (!drag || drag.type !== 'note') return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) movedRef.current = true;
    const card = document.querySelector<HTMLElement>(`[data-studio-note-id="${drag.id}"]`);
    if (card) {
      card.style.left = `${Math.round(drag.originX + dx / camera.scale)}px`;
      card.style.top = `${Math.round(drag.originY + dy / camera.scale)}px`;
    }
  }

  async function finishNoteDrag(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const drag = dragRef.current;
    if (!drag || drag.type !== 'note') return;
    dragRef.current = null;
    if (movedRef.current) {
      const position_x = Math.round(drag.originX + (event.clientX - drag.startX) / camera.scale);
      const position_y = Math.round(drag.originY + (event.clientY - drag.startY) / camera.scale);
      setOptimisticPositions((positions) => ({ ...positions, [drag.id]: { position_x, position_y } }));
      try {
        await updateWorldRow(worldId, 'notes', drag.id, { position_x, position_y });
      } catch (error) {
        setOptimisticPositions((positions) => {
          const next = { ...positions };
          delete next[drag.id];
          return next;
        });
        setError(error instanceof Error ? error.message : 'Could not move note.');
      }
    }
    window.setTimeout(() => { movedRef.current = false; }, 0);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const bounds = viewportRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const pointX = event.clientX - bounds.left;
    const pointY = event.clientY - bounds.top;
    setCamera((current) => {
      const scale = clamp(current.scale * Math.exp(-event.deltaY * 0.0012), MIN_SCALE, MAX_SCALE);
      const worldX = (pointX - current.x) / current.scale;
      const worldY = (pointY - current.y) / current.scale;
      return { scale, x: pointX - worldX * scale, y: pointY - worldY * scale };
    });
  }

  function zoom(factor: number) {
    const bounds = viewportRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;
    setCamera((current) => {
      const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE);
      return {
        scale,
        x: centerX - ((centerX - current.x) / current.scale) * scale,
        y: centerY - ((centerY - current.y) / current.scale) * scale,
      };
    });
  }

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      if (selected) {
        await updateWorldRow(worldId, 'notes', selected.id, draft);
      } else {
        const bounds = viewportRef.current?.getBoundingClientRect();
        await createWorldRow(worldId, 'notes', {
          ...draft,
          position_x: Math.round(((bounds?.width ?? 800) / 2 - camera.x) / camera.scale - CARD_WIDTH / 2),
          position_y: Math.round(((bounds?.height ?? 600) / 2 - camera.y) / camera.scale - CARD_HEIGHT / 2),
        });
      }
      beginNew();
      await reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save note.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    setBusy(true);
    setError(null);
    try {
      await deleteWorldRow(worldId, 'notes', pendingDelete.id);
      setPendingDelete(null);
      beginNew();
      await reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not delete note.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)_318px] gap-[16px]">
      <section className="relative min-h-0 overflow-hidden rounded-[24px] border border-white/8 bg-[#111927]">
        <div
          ref={viewportRef}
          className="absolute inset-0 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.12) 1.2px, transparent 1.2px)',
            backgroundSize: `${24 * camera.scale}px ${24 * camera.scale}px`,
            backgroundPosition: `${camera.x}px ${camera.y}px`,
          }}
          onPointerDown={startCameraDrag}
          onPointerMove={moveCamera}
          onPointerUp={finishCameraDrag}
          onPointerCancel={finishCameraDrag}
          onWheel={handleWheel}
          onClick={() => { if (!movedRef.current) beginNew(); }}
        >
          <div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }}>
            {data.notes.map((sourceNote) => {
              const note = { ...sourceNote, ...optimisticPositions[sourceNote.id] };
              return (
              <div key={note.id} data-studio-note-id={note.id} className="pointer-events-auto absolute" style={{ left: note.position_x, top: note.position_y }}>
                <NoteCard
                  note={note}
                  scale={camera.scale}
                  selected={selectedId === note.id}
                  onSelect={() => selectNote(note)}
                  onDragStart={(event) => startNoteDrag(note, event)}
                  onDragMove={moveNote}
                  onDragEnd={(event) => void finishNoteDrag(event)}
                />
              </div>
              );
            })}
          </div>
        </div>

        <div className="pointer-events-none absolute left-[18px] top-[18px]">
          <h2 className="font-montserrat-alt text-[28px] font-extrabold text-white/90">Notes</h2>
          <p className="mt-[3px] text-[13px] text-white/45">Drag the board · Scroll to zoom</p>
        </div>
        <div className="absolute bottom-[18px] left-[18px] flex overflow-hidden rounded-[14px] border border-white/10 bg-[#1A2332]/95 shadow-xl">
          <button type="button" className="h-[42px] w-[44px] text-[22px] text-white/75 hover:bg-white/8" onClick={() => zoom(0.82)} aria-label="Zoom out">−</button>
          <button type="button" className="w-[60px] border-x border-white/8 text-[12px] font-semibold text-white/60" onClick={() => setCamera(DEFAULT_CAMERA)}>{Math.round(camera.scale * 100)}%</button>
          <button type="button" className="h-[42px] w-[44px] text-[20px] text-white/75 hover:bg-white/8" onClick={() => zoom(1.22)} aria-label="Zoom in">+</button>
        </div>
        {!data.notes.length ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div><p className="font-montserrat-alt text-[20px] font-bold text-white/60">Your board is empty</p><p className="mt-2 text-[13px] text-white/35">Create a note, then arrange it anywhere.</p></div>
          </div>
        ) : null}
      </section>

      <aside className="flex min-h-0 flex-col rounded-[24px] border border-white/8 bg-[#1A2332] p-[20px]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-white/35">{selected ? 'Editing' : 'New note'}</p>
            <h3 className="mt-1 font-montserrat-alt text-[22px] font-bold text-white/90">{selected?.title || 'Write it down'}</h3>
          </div>
          <button type="button" onClick={beginNew} className="grid h-[38px] w-[38px] place-items-center rounded-[12px] border border-white/12 bg-white/8 text-[22px] font-semibold text-white/80 hover:bg-white/12" aria-label="New note">+</button>
        </div>
        <label className="mt-[24px] text-[12px] font-semibold text-white/50">Title</label>
        <input value={draft.title} maxLength={80} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} placeholder="Note title" className="mt-[7px] h-[48px] rounded-[14px] border border-white/8 bg-[#111927] px-[14px] text-[14px] text-white outline-none placeholder:text-white/25 focus:border-white/30" />
        <label className="mt-[16px] text-[12px] font-semibold text-white/50">Note</label>
        <textarea value={draft.content} maxLength={2000} onChange={(event) => setDraft((value) => ({ ...value, content: event.target.value }))} placeholder="Add details, ideas, clues…" className="mt-[7px] min-h-0 flex-1 resize-none rounded-[14px] border border-white/8 bg-[#111927] p-[14px] text-[14px] leading-[1.55] text-white outline-none placeholder:text-white/25 focus:border-white/30" />
        <div className="mt-[16px] flex gap-[10px]">
          {selected ? <button type="button" onClick={() => setPendingDelete(selected)} disabled={busy} className="h-[48px] rounded-[14px] border border-[#E07373]/25 px-[16px] text-[13px] font-bold text-[#E88A8A] disabled:opacity-50">Delete</button> : null}
          <button type="button" onClick={() => void save()} disabled={!canSave} className="h-[48px] flex-1 rounded-[14px] bg-white px-[18px] text-[14px] font-extrabold text-[#172033] transition-opacity disabled:cursor-not-allowed disabled:opacity-25">{busy ? 'Saving…' : selected ? 'Save changes' : 'Create note'}</button>
        </div>
      </aside>

      {pendingDelete ? <DeleteDialog note={pendingDelete} busy={busy} onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} /> : null}
    </div>
  );
}
