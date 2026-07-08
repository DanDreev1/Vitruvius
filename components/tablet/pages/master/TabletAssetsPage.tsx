'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { CategoryTabs, EmptyItemTile, ItemPortrait, ItemTile } from '@/components/tablet/inventory/InventoryPrimitives';
import type { AssetDraft, InventoryCategory } from '@/features/tablet/inventory/types';
import { useAssets } from '@/features/tablet/inventory/useAssets';

export default function TabletAssetsPage({
  sessionId,
  inGameWorldId,
}: {
  sessionId: string;
  inGameWorldId: string | null;
}) {
  const t = useTranslations('TabletMaster.assets');
  const common = useTranslations('TabletMaster.common');
  const assets = useAssets(sessionId, inGameWorldId);
  const [category, setCategory] = useState<'all' | InventoryCategory>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [giveOpen, setGiveOpen] = useState(false);
  const [giveIds, setGiveIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [deleteCandidate, setDeleteCandidate] = useState<AssetDraft | null>(null);

  const filtered = useMemo(
    () => assets.assets.filter((item) => category === 'all' || item.category === category),
    [assets.assets, category]
  );
  const emptySlotCount = Math.max(0, 16 - filtered.length);
  const selected = assets.assets.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  const categoryLabel = (value: InventoryCategory) => t(value);
  const updateSelected = (patch: Partial<AssetDraft>) => {
    if (!selected) return;
    assets.update(selected.id, patch);
  };
  const addItem = () => {
    const id = assets.add();
    setSelectedId(id);
  };
  const chooseItem = (id: string) => {
    setSelectedId(id);
    assets.setIsEditing(true);
  };
  const removeSelected = async () => {
    if (!selected) return;

    if (selected.isNew) {
      await assets.remove(selected);
      setSelectedId(null);
      return;
    }

    setDeleteCandidate(selected);
  };

  return (
    <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)_280px] gap-[36px] px-[70px] pb-[72px] pt-[73px]">
      <div className="flex min-h-0 flex-col gap-[45px]">
        <div className="flex items-center gap-[10px]">
          <div className="min-w-0 flex-1">
            <CategoryTabs value={category} onChange={setCategory} />
          </div>
        </div>

        <div className="grid min-h-0 flex-1 auto-rows-[84px] grid-cols-4 gap-[9px] overflow-y-auto pr-[4px]">
          {filtered.map((item) => (
            <ItemTile
              key={item.id}
              item={item}
              selected={selected?.id === item.id}
              draggable
              onClick={() => chooseItem(item.id)}
              onDragStart={() => setDraggedId(item.id)}
              onDrop={() => {
                if (draggedId) assets.move(draggedId, item.id);
                setDraggedId(null);
              }}
            />
          ))}
          {Array.from({ length: emptySlotCount }).map((_, index) => (
            <EmptyItemTile key={`empty-${index}`} onClick={addItem} label={common('add')} />
          ))}
        </div>
      </div>

      <aside className="flex min-h-0 flex-col rounded-[8px] border-[2px] border-white/70 p-[14px]">
        {selected ? (
          <>
            <div className="relative">
              <ItemPortrait
                imageUrl={selected.imagePreviewUrl ?? selected.imageUrl}
                name={selected.name}
              />
              <label className="absolute right-[8px] top-[8px] cursor-pointer rounded-[5px] border border-white/25 bg-black/75 px-[9px] py-[6px] text-center font-montserrat text-[10px] font-bold text-white">
                {common('chooseImage')}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => assets.selectImage(selected.id, event.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <input
              value={selected.name}
              maxLength={80}
              placeholder={common('name')}
              onChange={(event) => updateSelected({ name: event.target.value })}
              className="mt-[8px] border-b border-white/30 bg-transparent pb-[5px] font-montserrat-alt text-[16px] font-extrabold text-white outline-none"
            />

            <select
              value={selected.category}
              onChange={(event) => updateSelected({ category: event.target.value as InventoryCategory })}
              className="mt-[8px] rounded-[5px] border border-white/30 bg-[#172033] px-[8px] py-[7px] font-montserrat text-[11px] text-white"
            >
              <option value="weapon">{t('weapon')}</option>
              <option value="consumable">{t('consumable')}</option>
              <option value="quest">{t('quest')}</option>
              <option value="other">{t('other')}</option>
            </select>

            <textarea
              value={selected.description}
              maxLength={2000}
              placeholder={common('description')}
              onChange={(event) => updateSelected({ description: event.target.value })}
              className="mt-[8px] min-h-[80px] flex-1 resize-none rounded-[5px] border border-white/25 bg-transparent p-[8px] font-montserrat text-[11px] text-white outline-none"
            />

            <div className="mt-auto flex flex-col gap-[8px] pt-[10px]">
              <div className="flex gap-[8px]">
                <button
                  type="button"
                  onClick={() => void removeSelected()}
                  disabled={assets.isSaving}
                  className="h-[38px] rounded-[10px] border border-[#E07373]/25 px-[14px] font-montserrat text-[11px] font-bold text-[#E88A8A] disabled:opacity-50"
                >
                  {common('delete')}
                </button>
                {!selected.isNew ? (
                  <button
                    type="button"
                    onClick={() => {
                      setGiveIds([]);
                      setQuantity(1);
                      setGiveOpen(true);
                    }}
                    disabled={assets.hasChanges || assets.isSaving}
                    className="h-[38px] flex-1 rounded-[10px] border border-white/30 px-[12px] font-montserrat text-[11px] font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {t('giveItem')}
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                disabled={!assets.hasChanges || assets.isSaving}
                onClick={() => void assets.save()}
                className="h-[42px] rounded-[10px] bg-white px-[16px] font-montserrat text-[12px] font-extrabold text-[#172033] transition-opacity disabled:cursor-not-allowed disabled:opacity-25"
              >
                {assets.isSaving ? common('saving') : selected.isNew ? t('createItem') : common('saveChanges')}
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={addItem}
            className="flex h-full flex-col items-center justify-center gap-[10px] text-center font-montserrat text-[12px] font-bold text-white/50 transition hover:text-white"
          >
            <span className="font-montserrat-alt text-[38px] font-light leading-none">+</span>
            {t('empty')}
          </button>
        )}
      </aside>

      {assets.error ? (
        <p className="absolute bottom-0 left-0 z-40 rounded bg-red-500/20 px-[8px] py-[5px] text-[10px] text-red-200">
          {assets.error}
        </p>
      ) : null}

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
                  {t('giveItem')}
                </p>
                <h3 className="mt-[3px] truncate font-montserrat-alt text-[21px] font-extrabold text-white">
                  {selected.name}
                </h3>
                <p className="mt-[2px] font-montserrat text-[11px] capitalize text-white/55">
                  {categoryLabel(selected.category)}
                </p>
              </div>
            </div>

            <div className="mt-[15px] flex items-center justify-between gap-[12px]">
              <div>
                <p className="font-montserrat-alt text-[14px] font-extrabold text-white">
                  {t('recipients')}
                </p>
                <p className="mt-[2px] font-montserrat text-[10px] text-white/50">
                  {giveIds.length ? common('selected', { count: giveIds.length }) : t('selectCharacters')}
                </p>
              </div>

              {selected.category === 'consumable' ? (
                <div className="flex items-center gap-[8px]">
                  <span className="font-montserrat text-[11px] font-bold text-white/65">
                    {t('quantity')}
                  </span>
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
                      <p className="mt-[1px] font-montserrat text-[9px] text-white/45">{common('character')}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-[18px] flex justify-end gap-[9px] border-t border-white/10 pt-[14px]">
              <button type="button" onClick={() => setGiveOpen(false)} className="rounded-[7px] border border-white/25 px-[18px] py-[10px] font-montserrat text-[12px] font-bold text-white transition hover:bg-white/5">{common('cancel')}</button>
              <button type="button" disabled={!giveIds.length} onClick={async () => { await assets.give(selected.id, giveIds, quantity); setGiveOpen(false); }} className="rounded-[7px] bg-white px-[22px] py-[10px] font-montserrat text-[12px] font-extrabold text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-35">{t('giveItem')}</button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteCandidate ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75">
          <div className="w-[390px] rounded-[8px] border border-white/25 bg-[#172033] p-[16px]">
            <h3 className="font-montserrat-alt text-[18px] font-extrabold text-white">
              {t('deleteTitle', { name: deleteCandidate.name || t('fallbackItem') })}
            </h3>
            <p className="mt-[8px] font-montserrat text-[12px] text-white/65">
              {t('deleteDescription')}
            </p>
            <div className="mt-[15px] flex justify-end gap-[8px]">
              <button type="button" onClick={() => setDeleteCandidate(null)} className="px-[12px] py-[7px] text-[11px] text-white">
                {common('cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await assets.remove(deleteCandidate);
                  setDeleteCandidate(null);
                  setSelectedId(null);
                }}
                className="rounded-[5px] bg-red-500 px-[14px] py-[7px] text-[11px] font-bold text-white"
              >
                {common('delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
