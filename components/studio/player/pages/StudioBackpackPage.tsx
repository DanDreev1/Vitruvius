'use client';

import { useMemo, useState } from 'react';

import {
  CategoryTabs,
  EmptyItemTile,
  ItemPortrait,
  ItemTile,
} from '@/components/tablet/inventory/InventoryPrimitives';
import type { InventoryCategory } from '@/features/tablet/inventory/types';
import type { StudioInventoryItem } from '@/features/studio/player/types';

export default function StudioBackpackPage({ items }: { items: StudioInventoryItem[] }) {
  const [category, setCategory] = useState<'all' | InventoryCategory>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isImageCompact, setIsImageCompact] = useState(false);
  const filtered = useMemo(
    () => items.filter((item) => category === 'all' || item.category === category),
    [category, items]
  );
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const emptySlotCount = items.length ? Math.max(0, 16 - filtered.length) : 0;

  return (
    <div className="relative left-1/2 top-1/2 grid h-[calc(100%-70px)] min-h-0 w-[calc(100%-100px)] -translate-x-1/2 -translate-y-1/2 grid-cols-[minmax(0,1fr)_280px] gap-[28px] text-white">
      <div className="flex min-h-0 flex-col gap-[40px]">
        <CategoryTabs
          value={category}
          onChange={(value) => {
            setCategory(value);
            setSelectedId(null);
            setIsImageCompact(false);
          }}
        />

        {items.length ? (
          <div className="grid min-h-0 flex-1 auto-rows-[calc((100%-27px)/4)] grid-cols-4 gap-[9px] overflow-y-auto pr-[4px]">
            {filtered.map((item) => (
              <ItemTile
                key={item.id}
                item={item}
                selected={selected?.id === item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setIsImageCompact(false);
                }}
              />
            ))}
            {Array.from({ length: emptySlotCount }).map((_, index) => (
              <EmptyItemTile key={`empty-${index}`} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 place-items-center rounded-[8px] border-[2px] border-white/65 px-[50px] text-center">
            <div className="max-w-[620px]">
              <h2 className="font-montserrat-alt text-[28px] font-extrabold text-white">
                Your inventory is empty
              </h2>
              <p className="mt-[12px] font-montserrat text-[15px] font-semibold leading-[1.55] text-white/60">
                Your Backpack is managed by the Master during a game. As you explore,
                the Master can give your character weapons, consumables, quest items,
                and other useful gear. Those items will appear here automatically.
              </p>
            </div>
          </div>
        )}
      </div>

      <aside className="flex min-h-0 flex-col rounded-[8px] border-[2px] border-white/70 p-[14px]">
        <ItemPortrait
          imageUrl={selected?.imageUrl ?? null}
          name={selected?.name ?? 'Name'}
          compact={!selected || isImageCompact}
          onCompactChange={selected ? setIsImageCompact : undefined}
        />
        <div className="mt-[8px] flex items-center justify-between gap-[8px]">
          <p className="font-montserrat text-[11px] uppercase text-[#D6B25E]">
            {selected?.category ?? 'Item'}
          </p>
          {selected?.category === 'consumable' ? (
            <span className="rounded-full bg-white px-[8px] py-[4px] font-montserrat-alt text-[11px] font-bold text-black">
              ×{selected.quantity}
            </span>
          ) : null}
        </div>
        <p className={[
          'min-h-0 overflow-y-auto font-montserrat text-[13px] leading-[1.5] text-white/75 transition-[opacity,margin] duration-500',
          !selected || isImageCompact ? 'mt-[9px] flex-1 opacity-100' : 'h-0 opacity-0',
        ].join(' ')}>
          {selected?.description ?? 'Select an item to view its description.'}
        </p>
        <div className="mt-auto rounded-[8px] border border-white/10 bg-white/[.03] px-[12px] py-[10px] text-center font-montserrat text-[10px] leading-relaxed text-white/40">
          Item actions become available during a game.
        </div>
      </aside>
    </div>
  );
}
