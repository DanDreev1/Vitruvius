'use client';

import { useMemo, useRef, useState } from 'react';

import { getRelationshipLabel } from '@/features/tablet/master/relationships/constants';
import type { PlayerRelationshipNpc } from '@/features/tablet/master/relationships/types';

function RelationshipCard({ npc }: { npc: PlayerRelationshipNpc }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pointerStartYRef = useRef<number | null>(null);

  return (
    <article
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest('[data-description-scroll]')) return;
        pointerStartYRef.current = event.clientY;
      }}
      onPointerUp={(event) => {
        if (pointerStartYRef.current === null) return;
        const distance = event.clientY - pointerStartYRef.current;
        if (distance < -38) setIsExpanded(true);
        if (distance > 38) setIsExpanded(false);
        pointerStartYRef.current = null;
      }}
      onWheel={(event) => {
        if ((event.target as HTMLElement).closest('[data-description-scroll]')) return;
        if (Math.abs(event.deltaY) < 8) return;
        event.stopPropagation();
        setIsExpanded(event.deltaY < 0);
      }}
      className="relative flex h-full min-h-0 w-full max-w-[320px] flex-col overflow-hidden rounded-[8px] border border-[#8190A8] bg-[#111A2A] shadow-[0_18px_42px_rgba(0,0,0,.34)]"
    >
      <div
        className={[
          'relative m-[10px] mb-0 shrink-0 overflow-hidden rounded-[6px] border border-white/20 bg-[#0F1724] bg-cover bg-center transition-[height] duration-[700ms] ease-[cubic-bezier(.22,1,.36,1)]',
          isExpanded ? 'h-[165px]' : 'mb-[3px] h-[calc(100%-78px)]',
        ].join(' ')}
        style={npc.avatarDisplayUrl ? { backgroundImage: `url(${npc.avatarDisplayUrl})` } : undefined}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%] bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,.8))]" />
        {!npc.avatarDisplayUrl ? <div className="grid h-full place-items-center font-montserrat-alt text-[54px] font-extrabold text-white/12">{npc.name.charAt(0)}</div> : null}
        <h3 className="absolute inset-x-[12px] bottom-[10px] select-none truncate font-montserrat-alt text-[19px] font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,.8)]">{npc.name}</h3>
      </div>

      <div className={`mx-[14px] min-h-0 overflow-hidden transition-[opacity,margin] duration-[550ms] ease-out ${isExpanded ? 'mt-[8px] flex-1 opacity-100 delay-100' : 'h-0 opacity-0'}`}>
        <p data-description-scroll className="h-full overflow-y-auto pr-[5px] font-montserrat text-[12px] leading-[1.5] text-white/75">{npc.description}</p>
      </div>

      <div className="mt-auto border-t border-white/10 bg-[#0D1625] px-[14px] pb-[13px] pt-[10px]">
        <p className="mb-[4px] text-center font-montserrat text-[9px] font-bold uppercase text-white/40">Relationship</p>
        <p className="select-none truncate text-center font-montserrat-alt text-[15px] font-bold text-[#E8D18A]">{getRelationshipLabel(npc.relationshipValue)}</p>
      </div>
    </article>
  );
}

export default function StudioRelationshipsPage({ relationships }: { relationships: PlayerRelationshipNpc[] }) {
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(relationships.length / 2));
  const safePage = Math.min(pageIndex, pageCount - 1);
  const visible = useMemo(() => relationships.slice(safePage * 2, safePage * 2 + 2), [relationships, safePage]);

  if (!relationships.length) {
    return <div className="flex h-full items-center justify-center px-[50px] text-center text-white"><div className="max-w-[620px]"><h2 className="font-montserrat-alt text-[28px] font-extrabold">No relationships yet</h2><p className="mt-[12px] font-montserrat text-[15px] font-semibold leading-[1.55] text-white/60">Characters your hero meets during adventures will appear here when the Master reveals them. You will be able to see how they feel about your character and revisit what you know about them.</p></div></div>;
  }

  return <div className="relative h-full min-h-0 pb-[28px]"><div className="grid h-full min-h-0 grid-cols-[repeat(2,minmax(0,320px))] justify-start gap-[20px]">{visible.map((npc) => <RelationshipCard key={npc.id} npc={npc} />)}</div>{pageCount > 1 ? <><button type="button" disabled={safePage === 0} onClick={() => setPageIndex((value) => Math.max(0, value - 1))} className="absolute -left-[48px] top-1/2 flex h-[38px] w-[38px] -translate-y-1/2 items-center justify-center rounded-full border border-white text-[30px] text-white disabled:opacity-25">‹</button><button type="button" disabled={safePage >= pageCount - 1} onClick={() => setPageIndex((value) => Math.min(pageCount - 1, value + 1))} className="absolute right-0 top-1/2 flex h-[38px] w-[38px] -translate-y-1/2 items-center justify-center rounded-full border border-white text-[30px] text-white disabled:opacity-25">›</button><div className="absolute inset-x-0 bottom-[3px] flex justify-center gap-[7px]">{Array.from({ length: pageCount }).map((_, index) => <button key={index} type="button" onClick={() => setPageIndex(index)} aria-label={`Relationship page ${index + 1}`} className={`h-[9px] w-[9px] rounded-full border border-white ${index === safePage ? 'bg-white' : 'bg-transparent'}`} />)}</div></> : null}</div>;
}
