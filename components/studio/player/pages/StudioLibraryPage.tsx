'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TabletPlayerExperience } from '@/features/tablet/player/types';
import { createId } from '@/lib/createId';

type SortMode = 'manual' | 'xp-desc' | 'xp-asc';

const tags = ['Battle', 'Quest', 'Discovery', 'Roleplay', 'Mystery', 'Travel', 'Lore', 'Treasure', 'Boss', 'Other'];

function createEntry(sortOrder: number): TabletPlayerExperience {
  const entryId = `draft-experience-${createId()}`;
  return { id: entryId, headline: 'Headline', description: null, xp: 1, tag: 'Battle', sessionLabel: '1', happenedAt: null, sortOrder, metadata: { client_id: entryId }, isDraft: true };
}

function normalize(entries: TabletPlayerExperience[]) {
  return entries.map((entry, index) => ({ ...entry, headline: entry.headline.trim() || 'Headline', description: entry.description?.trim() || null, xp: Math.min(99, Math.max(0, Math.round(entry.xp) || 0)), tag: entry.tag || 'Battle', sessionLabel: entry.sessionLabel?.trim() || null, sortOrder: index, metadata: { ...(entry.metadata ?? {}) } }));
}

export default function StudioLibraryPage({ experiences, onChange }: { experiences: TabletPlayerExperience[]; onChange: (experiences: TabletPlayerExperience[]) => void }) {
  const t = useTranslations('StudioEditor');
  const initial = experiences.length ? experiences : [createEntry(0)];
  const [entries, setEntries] = useState<TabletPlayerExperience[]>(initial);
  const [selectedId, setSelectedId] = useState(initial[0].id);
  const [draft, setDraft] = useState(initial[0]);
  const [sortMode, setSortMode] = useState<SortMode>('manual');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const tagLabels: Record<string, string> = {
    Battle: t('tags.battle'), Quest: t('tags.quest'), Discovery: t('tags.discovery'), Roleplay: t('tags.roleplay'), Mystery: t('tags.mystery'),
    Travel: t('tags.travel'), Lore: t('tags.lore'), Treasure: t('tags.treasure'), Boss: t('tags.boss'), Other: t('tags.other'),
  };
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;
  const sorted = useMemo(() => sortMode === 'manual' ? entries : [...entries].sort((a, b) => sortMode === 'xp-desc' ? b.xp - a.xp : a.xp - b.xp), [entries, sortMode]);
  const hasChanges = !selected || JSON.stringify({ ...selected, metadata: undefined }) !== JSON.stringify({ ...draft, metadata: undefined });

  const select = (entry: TabletPlayerExperience) => { setSelectedId(entry.id); setDraft({ ...entry, metadata: { ...entry.metadata } }); setMessage(null); };
  const add = () => { const next = createEntry(entries.length); setEntries((current) => [...current, next]); setSelectedId(next.id); setDraft(next); setSortMode('manual'); setMessage(null); };
  const save = () => {
    if (!draft.headline.trim() || !draft.description?.trim()) { setMessageIsError(true); setMessage(t('entryRequired')); return; }
    const next = normalize(entries.map((entry) => entry.id === draft.id ? draft : entry));
    setEntries(next); setDraft(next.find((entry) => entry.id === draft.id) ?? next[0]); onChange(next); setMessageIsError(false); setMessage(t('savedToDraft'));
  };
  const remove = () => {
    const next = normalize(entries.filter((entry) => entry.id !== selectedId));
    const visible = next.length ? next : [createEntry(0)];
    setEntries(visible); setSelectedId(visible[0].id); setDraft(visible[0]);
    onChange(next); setSortMode('manual'); setMessage(null);
  };
  const move = (entryId: string, direction: -1 | 1) => {
    const list = [...entries]; const from = list.findIndex((entry) => entry.id === entryId); const to = from + direction;
    if (from < 0 || to < 0 || to >= list.length) return;
    const [entry] = list.splice(from, 1); list.splice(to, 0, entry); const next = normalize(list);
    setEntries(next); onChange(next); setSortMode('manual'); setMessage(null);
  };
  const drop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return setDraggedId(null);
    const list = [...entries]; const from = list.findIndex((entry) => entry.id === draggedId); const to = list.findIndex((entry) => entry.id === targetId);
    if (from >= 0 && to >= 0) { const [entry] = list.splice(from, 1); list.splice(to, 0, entry); const next = normalize(list); setEntries(next); onChange(next); }
    setSortMode('manual'); setDraggedId(null); setMessage(null);
  };

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_320px] gap-[24px] text-white">
      <section className="flex min-h-0 flex-col">
        <div className="mb-[14px] flex h-[44px] items-center justify-between gap-[14px]">
          <div className="flex rounded-[10px] border border-white/45 p-[3px]">
            {[[t('manual'), 'manual'], [t('xpHigh'), 'xp-desc'], [t('xpLow'), 'xp-asc']].map(([label, value]) => <button key={value} type="button" onClick={() => setSortMode(value as SortMode)} className={`h-[32px] rounded-[7px] px-[16px] font-montserrat-alt text-[13px] font-extrabold leading-none transition ${sortMode === value ? 'bg-white text-[#172033]' : 'text-white hover:bg-white/10'}`}>{label}</button>)}
          </div>
          <div className="flex items-center gap-[10px]"><span className="font-montserrat text-[14px] font-semibold text-white/55">{t('entries', {count: entries.length})}</span><button type="button" onClick={add} className="h-[34px] rounded-[8px] border border-white/45 px-[14px] font-montserrat-alt text-[13px] font-extrabold leading-none text-white hover:bg-white/10">{t('addEntry')}</button></div>
        </div>

        <div className="min-h-0 flex-1 space-y-[10px] overflow-y-auto pr-[6px]">
          {sorted.map((entry, index) => <article key={entry.id} draggable onDragStart={() => setDraggedId(entry.id)} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(entry.id)} className={`group grid min-h-[82px] grid-cols-[34px_minmax(0,1fr)_86px] items-center gap-[10px] rounded-[10px] border px-[10px] py-[9px] transition ${selectedId === entry.id ? 'border-white bg-white/8 shadow-[0_0_0_1px_rgba(255,255,255,.22)]' : 'border-white/45 hover:bg-white/[.04]'} ${draggedId === entry.id ? 'opacity-55' : ''}`}>
            <button type="button" onClick={() => select(entry)} className="flex h-[48px] w-[28px] cursor-grab items-center justify-center rounded-[8px] border border-white/25 text-white/70"><span className="grid grid-cols-2 gap-[3px]">{Array.from({ length: 6 }).map((_, dot) => <span key={dot} className="h-[3px] w-[3px] rounded-full bg-current" />)}</span></button>
            <button type="button" onClick={() => select(entry)} className="min-w-0 text-left"><h2 className="truncate font-montserrat-alt text-[19px] font-extrabold leading-none">{entry.headline}</h2><div className="mt-[9px] flex gap-[14px] font-montserrat text-[15px] leading-none text-white/80"><span><strong className="font-montserrat-alt text-white">XP:</strong> {entry.xp}</span><span><strong className="font-montserrat-alt text-white">{t('tag')}:</strong> {tagLabels[entry.tag ?? 'Battle'] ?? entry.tag}</span><span className="truncate"><strong className="font-montserrat-alt text-white">{t('sessionDate')}:</strong> {entry.sessionLabel}</span></div></button>
            <div className="flex justify-end gap-[6px]"><button type="button" onClick={() => move(entry.id, -1)} disabled={index === 0 || sortMode !== 'manual'} className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border border-white/35 font-bold disabled:opacity-30">^</button><button type="button" onClick={() => move(entry.id, 1)} disabled={index === sorted.length - 1 || sortMode !== 'manual'} className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border border-white/35 font-bold disabled:opacity-30">v</button></div>
          </article>)}
        </div>
      </section>

      <aside className="rounded-[12px] border border-white p-[16px]">
        <div className="space-y-[10px]">
          <input value={draft.headline} onChange={(event) => { setDraft({ ...draft, headline: event.target.value }); setMessage(null); }} className="h-[48px] w-full rounded-[8px] bg-white px-[14px] font-montserrat text-[15px] font-semibold text-[#172033] outline-none" placeholder={t('headline')} />
          <textarea value={draft.description ?? ''} onChange={(event) => { setDraft({ ...draft, description: event.target.value }); setMessage(null); }} className="h-[210px] w-full resize-none rounded-[8px] bg-white px-[14px] py-[12px] font-montserrat text-[15px] font-semibold leading-[1.25] text-[#172033] outline-none" placeholder={t('description')} />
          <div className="grid grid-cols-[118px_minmax(0,1fr)] gap-[10px]"><label className="flex items-center gap-[7px] font-montserrat-alt text-[14px] font-extrabold">XP<input type="number" min={0} max={99} value={draft.xp} onChange={(event) => { setDraft({ ...draft, xp: Math.min(99, Math.max(0, Number(event.target.value) || 0)) }); setMessage(null); }} className="h-[44px] min-w-[70px] flex-1 rounded-[8px] bg-white px-[10px] text-center text-[#172033]" /></label><label className="flex items-center gap-[7px] font-montserrat-alt text-[14px] font-extrabold">{t('tag')}<select value={draft.tag ?? 'Battle'} onChange={(event) => { setDraft({ ...draft, tag: event.target.value }); setMessage(null); }} className="h-[44px] min-w-0 flex-1 rounded-[8px] bg-white px-[10px] text-[#172033]">{tags.map((tag) => <option key={tag} value={tag}>{tagLabels[tag]}</option>)}</select></label></div>
          <input value={draft.sessionLabel ?? ''} onChange={(event) => { setDraft({ ...draft, sessionLabel: event.target.value }); setMessage(null); }} className="h-[48px] w-full rounded-[8px] bg-white px-[14px] font-montserrat text-[15px] font-semibold text-[#172033]" placeholder={t('sessionDate')} />
        </div>
        <button type="button" onClick={save} disabled={!hasChanges || !draft.headline.trim() || !draft.description?.trim()} className="mt-[30px] h-[48px] w-full rounded-[8px] bg-white font-montserrat-alt text-[15px] font-extrabold text-black disabled:opacity-35">{t('save')}</button>
        <button type="button" onClick={remove} className="mt-[10px] h-[44px] w-full rounded-[8px] border border-[#FF6B6B] font-montserrat-alt text-[14px] font-extrabold text-[#FFB4B4] hover:bg-[#FF6B6B]/10">{t('delete')}</button>
        {message ? <p className={`mt-[10px] text-center text-[13px] font-semibold ${messageIsError ? 'text-red-300' : 'text-white/70'}`}>{message}</p> : null}
      </aside>
    </div>
  );
}
