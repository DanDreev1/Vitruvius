'use client';

import { useTranslations } from 'next-intl';

import type { InventoryCategory } from '@/features/tablet/inventory/types';
import { INVENTORY_CATEGORIES } from '@/features/tablet/inventory/constants';

export function CategoryTabs({ value, onChange }: { value: 'all' | InventoryCategory; onChange: (value: 'all' | InventoryCategory) => void }) {
  const t = useTranslations('TabletPlayer.backpack');
  return (
    <div className="grid grid-cols-4 gap-[9px]">
      {INVENTORY_CATEGORIES.map((category) => (
        <button key={category.key} type="button" onClick={() => onChange(category.key)}
          className={['h-[84px] rounded-[8px] border-[2px] font-montserrat-alt text-[17px] font-extrabold transition', value === category.key ? 'border-white bg-white text-black' : 'border-white/65 bg-transparent text-white hover:bg-white/5'].join(' ')}>
          {t(category.key === 'all' ? 'all' : category.key)}
        </button>
      ))}
    </div>
  );
}

export function ItemTile({ item, selected, draggable, onClick, onDragStart, onDrop }: {
  item: { id: string; name: string; imageUrl: string | null; category: InventoryCategory; quantity?: number };
  selected: boolean; draggable?: boolean; onClick: () => void; onDragStart?: () => void; onDrop?: () => void;
}) {
  return (
    <button type="button" draggable={draggable} onDragStart={onDragStart}
      onDragOver={(event) => draggable && event.preventDefault()}
      onDrop={(event) => { if (draggable) { event.preventDefault(); onDrop?.(); } }}
      onClick={onClick} title={item.name}
      className={['group relative h-full min-h-[72px] overflow-hidden rounded-[8px] border-[2px] bg-[#10192A] transition', selected ? 'border-[#D6B25E] shadow-[0_0_0_2px_rgba(214,178,94,0.25)]' : 'border-white/65 hover:border-white'].join(' ')}>
      {item.imageUrl ? <span className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]" style={{ backgroundImage: `url(${item.imageUrl})` }} /> : null}
      <span className="absolute inset-x-0 bottom-0 bg-black/70 px-[7px] py-[6px] text-left font-montserrat text-[12px] font-bold text-white">{item.name}</span>
      {item.category === 'consumable' && (item.quantity ?? 0) > 1 ? (
        <span className="absolute right-[5px] top-[5px] flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-white px-[5px] font-montserrat-alt text-[10px] font-extrabold text-black">{item.quantity}</span>
      ) : null}
    </button>
  );
}

export function EmptyItemTile({ onClick, label }: { onClick?: () => void; label?: string }) {
  if (!onClick) {
    return <div aria-hidden="true" className="h-full min-h-[72px] rounded-[8px] border-[2px] border-white/65 bg-transparent" />;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group flex h-full min-h-[72px] items-center justify-center rounded-[8px] border-[2px] border-white/65 bg-transparent text-white/40 transition hover:border-white hover:bg-white/[0.03] hover:text-white"
    >
      <span className="font-montserrat-alt text-[28px] font-light leading-none transition-transform group-hover:scale-110">+</span>
    </button>
  );
}

export function ItemPortrait({ imageUrl, name, compact = true, onCompactChange }: { imageUrl: string | null; name: string; compact?: boolean; onCompactChange?: (compact: boolean) => void }) {
  return <div onWheel={(event) => { if (!onCompactChange || Math.abs(event.deltaY) < 8) return; event.stopPropagation(); onCompactChange(event.deltaY < 0); }} className={['relative w-full shrink-0 overflow-hidden rounded-[8px] border-[2px] border-white/20 bg-[#0F1724] bg-cover bg-center transition-[height] duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)]', compact ? 'h-[118px]' : 'h-[280px]'].join(' ')} style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined} aria-label={name}>
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.82))]" />
    <span className="absolute inset-x-[10px] bottom-[8px] truncate font-montserrat-alt text-[16px] font-extrabold text-white">{name}</span>
  </div>;
}
