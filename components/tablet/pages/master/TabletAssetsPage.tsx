'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

import { CategoryTabs, EmptyItemTile, ItemPortrait, ItemTile } from '@/components/tablet/inventory/InventoryPrimitives';
import type { AssetDraft, InventoryCategory } from '@/features/tablet/inventory/types';
import { useAssets } from '@/features/tablet/inventory/useAssets';

export default function TabletAssetsPage({ sessionId, inGameWorldId }: { sessionId: string; inGameWorldId: string | null }) {
  const assets = useAssets(sessionId, inGameWorldId);
  const [category, setCategory] = useState<'all' | InventoryCategory>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [giveOpen, setGiveOpen] = useState(false);
  const [giveIds, setGiveIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [deleteCandidate, setDeleteCandidate] = useState<AssetDraft | null>(null);
  const [isImageCompact, setIsImageCompact] = useState(false);
  const filtered = useMemo(() => assets.assets.filter((item) => category === 'all' || item.category === category), [assets.assets, category]);
  const emptySlotCount = Math.max(0, 16 - filtered.length);
  const selected = assets.assets.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  const updateSelected = (patch: Partial<AssetDraft>) => selected && assets.update(selected.id, patch);

  return (
    <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)_280px] gap-[36px] px-[70px] pb-[45px] pt-[100px]">
      <div className="flex min-h-0 flex-col gap-[45px]">
        <div className="flex items-center gap-[10px]">
          <div className="min-w-0 flex-1"><CategoryTabs value={category} onChange={setCategory} /></div>
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-[84px] grid-cols-4 gap-[9px] overflow-y-auto pr-[4px]">
          {filtered.map((item) => <ItemTile key={item.id} item={item} selected={selected?.id === item.id} draggable={assets.isEditing}
            onClick={() => { setSelectedId(item.id); setIsImageCompact(false); }} onDragStart={() => setDraggedId(item.id)}
            onDrop={() => { if (draggedId) assets.move(draggedId, item.id); setDraggedId(null); }} />)}
          {Array.from({ length: emptySlotCount }).map((_, index) => <EmptyItemTile key={`empty-${index}`} />)}
        </div>
      </div>

      <aside className="flex min-h-0 flex-col rounded-[8px] border-[2px] border-white/70 p-[14px]">
        {selected ? assets.isEditing ? (
          <>
            <div className="relative"><ItemPortrait imageUrl={selected.imagePreviewUrl ?? selected.imageUrl} name={selected.name} />
              <label className="absolute right-[8px] top-[8px] cursor-pointer rounded-[5px] border border-white/25 bg-black/75 px-[9px] py-[6px] text-center font-montserrat text-[10px] font-bold text-white">Choose image<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => assets.selectImage(selected.id, event.target.files?.[0] ?? null)} /></label>
            </div>
            <input value={selected.name} maxLength={80} placeholder="Name" onChange={(event) => updateSelected({ name: event.target.value })} className="mt-[8px] border-b border-white/30 bg-transparent pb-[5px] font-montserrat-alt text-[16px] font-extrabold text-white outline-none" />
            <select value={selected.category} onChange={(event) => updateSelected({ category: event.target.value as InventoryCategory })} className="mt-[8px] rounded-[5px] border border-white/30 bg-[#172033] px-[8px] py-[7px] font-montserrat text-[11px] text-white">
              <option value="weapon">Weapon</option><option value="consumable">Consumable</option><option value="quest">Quest</option><option value="other">Other</option>
            </select>
            <textarea value={selected.description} maxLength={2000} placeholder="Description" onChange={(event) => updateSelected({ description: event.target.value })} className="mt-[8px] min-h-[80px] flex-1 resize-none rounded-[5px] border border-white/25 bg-transparent p-[8px] font-montserrat text-[11px] text-white outline-none" />
            <div className="mt-[10px] flex gap-[8px]">
              {!selected.isNew ? (
                <button type="button" onClick={() => setDeleteCandidate(selected)} disabled={assets.isSaving} className="h-[42px] rounded-[10px] border border-[#E07373]/25 px-[14px] font-montserrat text-[11px] font-bold text-[#E88A8A] disabled:opacity-50">
                  Delete
                </button>
              ) : null}
              <button type="button" disabled={!assets.hasChanges || assets.isSaving} onClick={() => void assets.save()} className="h-[42px] flex-1 rounded-[10px] bg-white px-[16px] font-montserrat text-[12px] font-extrabold text-[#172033] transition-opacity disabled:cursor-not-allowed disabled:opacity-25">
                {assets.isSaving ? 'Saving…' : selected.isNew ? 'Create item' : 'Save changes'}
              </button>
            </div>
          </>
        ) : (
          <><ItemPortrait imageUrl={selected.imageUrl} name={selected.name} compact={isImageCompact} onCompactChange={setIsImageCompact} /><p className="mt-[8px] font-montserrat text-[11px] uppercase text-[#D6B25E]">{selected.category}</p><p className={['min-h-0 overflow-y-auto font-montserrat text-[13px] leading-[1.5] text-white/75 transition-[opacity,margin] duration-500', isImageCompact ? 'mt-[9px] flex-1 opacity-100' : 'h-0 opacity-0'].join(' ')}>{selected.description}</p><button type="button" onClick={() => { setGiveIds([]); setQuantity(1); setGiveOpen(true); }} className="mt-auto rounded-[8px] bg-white py-[10px] font-montserrat text-[14px] font-extrabold text-black">Give item</button></>
        ) : <div className="flex h-full items-center justify-center text-center font-montserrat text-[12px] text-white/50">Add an item to the asset library.</div>}
      </aside>

      <div className="absolute right-[60px] top-[2px] flex h-[54px] items-start gap-[7px]">
        {assets.isEditing ? <><button type="button" onClick={() => { const id = assets.add(); setSelectedId(id); }} className="flex w-[55px] flex-col items-center text-white"><span className="text-[28px] leading-[27px]">+</span><span className="text-[10px] font-bold">Add</span></button><button type="button" onClick={assets.cancel} className="flex w-[55px] flex-col items-center text-white"><span className="text-[27px] leading-[27px]">×</span><span className="text-[10px] font-bold">Cancel</span></button></> : <button type="button" onClick={() => assets.setIsEditing(true)} className="flex w-[55px] flex-col items-center text-white"><Image src="/Edit-icon.png" alt="" width={25} height={25} /><span className="text-[10px] font-bold">Edit</span></button>}
      </div>
      {assets.error ? <p className="absolute bottom-0 left-0 z-40 rounded bg-red-500/20 px-[8px] py-[5px] text-[10px] text-red-200">{assets.error}</p> : null}

      {giveOpen && selected ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-[24px]">
          <div className="w-[520px] rounded-[8px] border border-white/25 bg-[#172033] p-[20px] shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
            <div className="flex items-center gap-[14px] border-b border-white/10 pb-[15px]">
              <div
                className="h-[64px] w-[82px] shrink-0 rounded-[7px] border border-white/25 bg-[#0F1724] bg-cover bg-center"
                style={selected.imageUrl ? { backgroundImage: `url(${selected.imageUrl})` } : undefined}
              />
              <div className="min-w-0">
                <p className="font-montserrat text-[10px] font-bold uppercase text-[#D6B25E]">
                  Give item
                </p>
                <h3 className="mt-[3px] truncate font-montserrat-alt text-[21px] font-extrabold text-white">
                  {selected.name}
                </h3>
                <p className="mt-[2px] font-montserrat text-[11px] capitalize text-white/55">
                  {selected.category}
                </p>
              </div>
            </div>

            <div className="mt-[15px] flex items-center justify-between gap-[12px]">
              <div>
                <p className="font-montserrat-alt text-[14px] font-extrabold text-white">
                  Recipients
                </p>
                <p className="mt-[2px] font-montserrat text-[10px] text-white/50">
                  {giveIds.length ? `${giveIds.length} selected` : 'Select one or more characters'}
                </p>
              </div>

              {selected.category === 'consumable' ? (
                <div className="flex items-center gap-[8px]">
                  <span className="font-montserrat text-[11px] font-bold text-white/65">Quantity</span>
                  <div className="flex items-center rounded-[7px] border border-white/25 bg-[#0F1724] p-[3px]">
                    <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-[28px] w-[28px] items-center justify-center font-montserrat-alt text-[18px] font-bold text-white">-</button>
                    <input type="number" min={1} max={999} value={quantity} onChange={(event) => setQuantity(Math.min(999, Math.max(1, Number(event.target.value))))} className="h-[28px] w-[52px] bg-transparent text-center font-montserrat-alt text-[13px] font-extrabold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    <button type="button" onClick={() => setQuantity((value) => Math.min(999, value + 1))} className="flex h-[28px] w-[28px] items-center justify-center font-montserrat-alt text-[18px] font-bold text-white">+</button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-[12px] grid max-h-[220px] grid-cols-2 gap-[9px] overflow-y-auto pr-[3px]">
              {assets.audience.map((member) => {
                const isSelected = giveIds.includes(member.inGameCharacterId);
                return (
                  <button
                    key={member.inGameCharacterId}
                    type="button"
                    onClick={() => setGiveIds((current) => isSelected ? current.filter((id) => id !== member.inGameCharacterId) : [...current, member.inGameCharacterId])}
                    className={[
                      'flex min-h-[58px] items-center gap-[10px] rounded-[7px] border px-[10px] py-[8px] text-left transition',
                      isSelected ? 'border-[#D6B25E] bg-[#D6B25E]/10' : 'border-white/20 bg-white/[0.03] hover:border-white/45',
                    ].join(' ')}
                  >
                    <div className="relative shrink-0">
                      <div className="h-[38px] w-[38px] rounded-full bg-white/20 bg-cover bg-center" style={{ backgroundImage: `url(${member.avatarUrl ?? '/avatar-placeholder.png'})` }} />
                      {isSelected ? <span className="absolute -bottom-[2px] -right-[2px] flex h-[17px] w-[17px] items-center justify-center rounded-full bg-[#D6B25E] text-[10px] font-bold text-black">{'\u2713'}</span> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-montserrat-alt text-[12px] font-extrabold text-white">{member.displayName}</p>
                      <p className="mt-[1px] font-montserrat text-[9px] text-white/45">Character</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-[18px] flex justify-end gap-[9px] border-t border-white/10 pt-[14px]">
              <button type="button" onClick={() => setGiveOpen(false)} className="rounded-[7px] border border-white/25 px-[18px] py-[10px] font-montserrat text-[12px] font-bold text-white transition hover:bg-white/5">Cancel</button>
              <button type="button" disabled={!giveIds.length} onClick={async () => { await assets.give(selected.id, giveIds, quantity); setGiveOpen(false); }} className="rounded-[7px] bg-white px-[22px] py-[10px] font-montserrat text-[12px] font-extrabold text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-35">Give item</button>
            </div>
          </div>
        </div>
      ) : null}
      {deleteCandidate ? <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75"><div className="w-[390px] rounded-[8px] border border-white/25 bg-[#172033] p-[16px]"><h3 className="font-montserrat-alt text-[18px] font-extrabold text-white">Delete {deleteCandidate.name || 'this item'}?</h3><p className="mt-[8px] font-montserrat text-[12px] text-white/65">Already issued copies will remain in player Backpacks.</p><div className="mt-[15px] flex justify-end gap-[8px]"><button type="button" onClick={() => setDeleteCandidate(null)} className="px-[12px] py-[7px] text-[11px] text-white">Cancel</button><button type="button" onClick={async () => { await assets.remove(deleteCandidate); setDeleteCandidate(null); setSelectedId(null); }} className="rounded-[5px] bg-red-500 px-[14px] py-[7px] text-[11px] font-bold text-white">Delete</button></div></div></div> : null}
    </div>
  );
}
