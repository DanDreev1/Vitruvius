'use client';

import { useMemo, useRef, useState } from 'react';

import { getRelationshipLabel } from '@/features/tablet/master/relationships/constants';
import type { PlayerRelationshipNpc } from '@/features/tablet/master/relationships/types';
import { usePlayerRelationships } from '@/features/tablet/master/relationships/usePlayerRelationships';

type TabletRelationshipPageProps = {
  sessionId: string;
  inGameWorldId: string | null;
  inGameCharacterId: string | null;
};

function PlayerNpcCard({ npc }: { npc: PlayerRelationshipNpc }) {
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
      className="relative flex h-full min-h-0 w-full max-w-[320px] flex-col overflow-hidden rounded-[8px] border border-[#8190A8] bg-[#111A2A] shadow-[0_18px_42px_rgba(0,0,0,0.34)]"
    >
      <div
        className={[
          'relative m-[10px] mb-0 shrink-0 overflow-hidden rounded-[6px] border border-white/20 bg-[#0F1724] bg-cover bg-center transition-[height] duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          isExpanded ? 'h-[165px]' : 'mb-[3px] h-[calc(100%-78px)]',
        ].join(' ')}
        style={
          npc.avatarDisplayUrl
            ? { backgroundImage: `url(${npc.avatarDisplayUrl})` }
            : undefined
        }
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%] bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.8))]" />
        <h3 className="absolute inset-x-[12px] bottom-[10px] select-none truncate font-montserrat-alt text-[19px] font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {npc.name}
        </h3>
      </div>

      <div
        className={[
          'mx-[14px] min-h-0 overflow-hidden transition-[opacity,margin] duration-[550ms] ease-out',
          isExpanded
            ? 'mt-[8px] flex-1 opacity-100 delay-100'
            : 'h-0 opacity-0 delay-0',
        ].join(' ')}
      >
        <p
          data-description-scroll
          className="h-full overflow-y-auto pr-[5px] font-montserrat text-[12px] leading-[1.5] text-white/75"
        >
          {npc.description}
        </p>
      </div>

      <div className="mt-auto border-t border-white/10 bg-[#0D1625] px-[14px] pb-[13px] pt-[10px]">
        <p className="mb-[4px] text-center font-montserrat text-[9px] font-bold uppercase text-white/40">
          Relationship
        </p>
        <p className="select-none truncate text-center font-montserrat-alt text-[15px] font-bold text-[#E8D18A]">
          {getRelationshipLabel(npc.relationshipValue)}
        </p>
      </div>
    </article>
  );
}

export default function TabletRelationshipPage({
  sessionId,
  inGameWorldId,
  inGameCharacterId,
}: TabletRelationshipPageProps) {
  const relationships = usePlayerRelationships({
    sessionId,
    inGameWorldId,
    inGameCharacterId,
  });
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(relationships.npcs.length / 2));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const visibleNpcs = useMemo(
    () => relationships.npcs.slice(safePageIndex * 2, safePageIndex * 2 + 2),
    [relationships.npcs, safePageIndex]
  );

  if (relationships.isLoading) {
    return (
      <div className="flex h-full items-center justify-center font-montserrat text-[14px] text-white/60">
        Loading relationships...
      </div>
    );
  }

  if (relationships.error) {
    return (
      <div className="flex h-full items-center justify-center px-[30px] text-center font-montserrat text-[14px] text-red-200">
        {relationships.error}
      </div>
    );
  }

  if (!relationships.npcs.length) {
    return (
      <div className="flex h-full items-center justify-center px-[30px] text-center font-montserrat text-[14px] text-white/55">
        No characters have been revealed yet.
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 pb-[28px]">
      <div className="grid h-full min-h-0 grid-cols-[repeat(2,minmax(0,320px))] justify-start gap-[20px]">
        {visibleNpcs.map((npc) => (
          <PlayerNpcCard key={npc.id} npc={npc} />
        ))}
      </div>

      {pageCount > 1 ? (
        <>
          <button
            type="button"
            disabled={safePageIndex === 0}
            onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
            title="Previous NPCs"
            className="absolute -left-[48px] top-1/2 flex h-[38px] w-[38px] -translate-y-1/2 items-center justify-center rounded-full border border-white text-[30px] text-white disabled:opacity-25"
          >
            {'\u2039'}
          </button>
          <button
            type="button"
            disabled={safePageIndex >= pageCount - 1}
            onClick={() => setPageIndex((value) => Math.min(pageCount - 1, value + 1))}
            title="Next NPCs"
            className="absolute right-0 top-1/2 flex h-[38px] w-[38px] -translate-y-1/2 items-center justify-center rounded-full border border-white text-[30px] text-white disabled:opacity-25"
          >
            {'\u203a'}
          </button>
        </>
      ) : null}

      {pageCount > 1 ? (
        <div className="absolute inset-x-0 bottom-[3px] flex justify-center gap-[7px]">
          {Array.from({ length: pageCount }).map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setPageIndex(index)}
              title={`NPC page ${index + 1}`}
              className={[
                'h-[9px] w-[9px] rounded-full border border-white',
                index === safePageIndex ? 'bg-white' : 'bg-transparent',
              ].join(' ')}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
