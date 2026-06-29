'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';

import {
  getRelationshipLabel,
  RELATIONSHIP_NPC_DESCRIPTION_MAX_LENGTH,
  RELATIONSHIP_NPC_NAME_MAX_LENGTH,
} from '@/features/tablet/master/relationships/constants';
import type { RelationshipNpcDraft } from '@/features/tablet/master/relationships/types';
import { useMasterRelationships } from '@/features/tablet/master/relationships/useMasterRelationships';

type TabletRelationshipPageProps = {
  sessionId: string;
  inGameWorldId: string | null;
};

function RelationshipAudience({
  relationships,
}: {
  relationships: ReturnType<typeof useMasterRelationships>;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="mb-[12px] font-montserrat-alt text-[18px] font-extrabold text-white">
        Player
      </p>
      <div className="min-h-0 space-y-[12px] overflow-y-auto pr-[5px]">
        {relationships.audience.map((member) => {
          const isSelected = relationships.selectedCharacterId === member.inGameCharacterId;

          return (
            <button
              key={member.inGameCharacterId}
              type="button"
              onClick={() => relationships.setSelectedCharacterId(member.inGameCharacterId)}
              className={[
                'flex min-h-[66px] w-full items-center gap-[15px] rounded-[18px] border border-white px-[14px] py-[10px] text-left transition',
                isSelected ? 'bg-white/10' : 'bg-transparent hover:bg-white/5',
              ].join(' ')}
            >
              <div className="relative shrink-0">
                <div
                  className="h-[44px] w-[44px] rounded-full bg-white/30 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${member.avatarUrl ?? '/avatar-placeholder.png'})`,
                  }}
                />
                {isSelected ? (
                  <span className="absolute -bottom-[2px] -right-[2px] flex h-[19px] w-[19px] items-center justify-center rounded-full bg-white text-[11px] font-bold text-black">
                    {'\u2713'}
                  </span>
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate font-montserrat-alt text-[16px] font-extrabold text-white">
                  {member.displayName}
                </p>
                <p className="font-montserrat text-[12px] text-white/75">Role: Player</p>
              </div>
            </button>
          );
        })}

        {!relationships.audience.length && !relationships.isLoading ? (
          <p className="px-[8px] py-[16px] font-montserrat text-[13px] text-white/55">
            No player characters are available.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function NpcCard({
  npc,
  isEditing,
  disabled,
  link,
  onUpdate,
  onImageSelect,
  onRelationshipChange,
  onVisibilityToggle,
  onDeleteRequest,
  onDragStart,
  onDrop,
}: {
  npc: RelationshipNpcDraft;
  isEditing: boolean;
  disabled: boolean;
  link: { relationshipValue: number; isVisibleToPlayer: boolean } | null;
  onUpdate: (patch: Partial<RelationshipNpcDraft>) => void;
  onImageSelect: (file: File | null) => void;
  onRelationshipChange: (value: number) => void;
  onVisibilityToggle: () => void;
  onDeleteRequest: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pointerStartYRef = useRef<number | null>(null);
  const relationshipValue = link?.relationshipValue ?? 0;
  const imageUrl = npc.avatarPreviewUrl ?? npc.avatarDisplayUrl;

  return (
    <article
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest('button, input, textarea, label')) return;
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
        if (isEditing || (event.target as HTMLElement).closest('[data-description-scroll]')) {
          return;
        }
        if (Math.abs(event.deltaY) < 8) return;
        event.stopPropagation();
        setIsExpanded(event.deltaY < 0);
      }}
      className="relative flex h-full min-h-0 w-full max-w-[320px] flex-col overflow-hidden rounded-[8px] border border-[#8190A8] bg-[#111A2A] shadow-[0_18px_42px_rgba(0,0,0,0.34)]"
    >
      {isEditing ? (
        <div className="absolute right-[19px] top-[19px] z-10 flex gap-[6px]">
          <button
            type="button"
            draggable
            onDragStart={onDragStart}
            title="Drag to reorder"
            className="flex h-[30px] w-[30px] cursor-grab items-center justify-center rounded-full bg-black/65 font-montserrat text-[15px] text-white active:cursor-grabbing"
          >
            {'\u2637'}
          </button>
          <button
            type="button"
            onClick={onDeleteRequest}
            title="Delete NPC"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-black/65 font-montserrat text-[18px] text-white hover:bg-red-500"
          >
            {'\u00d7'}
          </button>
        </div>
      ) : null}

      <div
        className={[
          'relative m-[10px] mb-0 shrink-0 overflow-hidden rounded-[6px] border border-white/20 bg-[#0F1724] bg-cover bg-center transition-[height] duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          isExpanded
            ? 'h-[165px]'
            : isEditing
              ? 'h-[238px]'
              : 'mb-[3px] h-[calc(100%-118px)]',
        ].join(' ')}
        style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      >
        {!imageUrl ? (
          <div className="flex h-full items-center justify-center font-montserrat text-[13px] text-white/50">
            Image required
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[44%] bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.8))]" />
        {isEditing ? (
          <label className="absolute left-[9px] top-[9px] cursor-pointer rounded-[5px] border border-white/25 bg-black/65 px-[10px] py-[6px] text-center font-montserrat text-[10px] font-bold text-white hover:bg-black/85">
            Choose image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => onImageSelect(event.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
        ) : null}
        {isEditing ? (
          <div className="absolute inset-x-[12px] bottom-[10px]">
            <label className="font-montserrat text-[8px] font-bold uppercase text-white/60">
              Name
            </label>
            <input
              value={npc.name}
              maxLength={RELATIONSHIP_NPC_NAME_MAX_LENGTH}
              onChange={(event) => onUpdate({ name: event.target.value })}
              placeholder="Character's name"
              className="mt-[1px] w-full border-b border-white/35 bg-transparent pb-[3px] font-montserrat-alt text-[18px] font-extrabold text-white outline-none placeholder:text-white/45 focus:border-[#D6B25E]"
            />
          </div>
        ) : (
          <h3 className="absolute inset-x-[12px] bottom-[10px] select-none truncate font-montserrat-alt text-[19px] font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {npc.name || "Character's name"}
          </h3>
        )}
      </div>

      {isEditing ? (
        <div className="flex min-h-0 flex-1 flex-col px-[14px] pb-[3px] pt-[9px]">
          <div className="mb-[4px] flex items-center justify-between gap-[8px]">
            <label className="font-montserrat text-[9px] font-bold uppercase text-white/45">
              Description
            </label>
            <span className="font-montserrat text-[9px] text-white/35">
              {npc.description.length}/{RELATIONSHIP_NPC_DESCRIPTION_MAX_LENGTH}
            </span>
          </div>
          <textarea
            value={npc.description}
            maxLength={RELATIONSHIP_NPC_DESCRIPTION_MAX_LENGTH}
            onChange={(event) => onUpdate({ description: event.target.value })}
            placeholder="Character description"
            className="min-h-[70px] w-full flex-1 resize-none overflow-y-auto rounded-[5px] border border-white/15 bg-[#0C1422] p-[8px] font-montserrat text-[11px] leading-[1.45] text-white outline-none placeholder:text-white/25 focus:border-[#D6B25E]"
          />
        </div>
      ) : (
        <div className={[
          'mx-[14px] min-h-0 overflow-hidden transition-[opacity,margin] duration-[550ms] ease-out',
          isExpanded
            ? 'mt-[8px] flex-1 opacity-100 delay-100'
            : 'h-0 opacity-0 delay-0',
        ].join(' ')}>
          <p data-description-scroll className="h-full overflow-y-auto pr-[5px] font-montserrat text-[12px] leading-[1.5] text-white/75">
            {npc.description}
          </p>
        </div>
      )}

      <div className="mt-auto border-t border-white/10 bg-[#0D1625] px-[14px] pb-[11px] pt-[9px]">
        <p className="mb-[2px] text-center font-montserrat text-[9px] font-bold uppercase text-white/40">
          Relationship
        </p>
        <div className="flex items-center justify-between gap-[8px]">
          <button
            type="button"
            disabled={!isEditing || disabled || relationshipValue <= -5}
            onClick={() => onRelationshipChange(Math.max(-5, relationshipValue - 1))}
            title="Decrease relationship"
            className="flex h-[34px] w-[34px] items-center justify-center text-[34px] font-light leading-none text-white disabled:opacity-25"
          >
            {'\u2039'}
          </button>
          <span className="min-w-0 flex-1 truncate text-center font-montserrat-alt text-[14px] font-bold text-[#E8D18A]">
            {getRelationshipLabel(relationshipValue)}
          </span>
          <button
            type="button"
            disabled={!isEditing || disabled || relationshipValue >= 5}
            onClick={() => onRelationshipChange(Math.min(5, relationshipValue + 1))}
            title="Increase relationship"
            className="flex h-[34px] w-[34px] items-center justify-center text-[34px] font-light leading-none text-white disabled:opacity-25"
          >
            {'\u203a'}
          </button>
        </div>

        <button
          type="button"
          disabled={!isEditing || disabled}
          onClick={onVisibilityToggle}
          className={[
            'mt-[5px] w-full rounded-[5px] border px-[10px] py-[6px] font-montserrat text-[10px] font-extrabold transition disabled:opacity-40',
            link?.isVisibleToPlayer
              ? 'border-[#D6B25E] bg-[#D6B25E] text-black'
              : 'border-white/35 bg-transparent text-white',
          ].join(' ')}
        >
          {link?.isVisibleToPlayer ? 'Shown to player' : 'Hidden from player'}
        </button>
      </div>
    </article>
  );
}

export default function TabletRelationshipPage({
  sessionId,
  inGameWorldId,
}: TabletRelationshipPageProps) {
  const relationships = useMasterRelationships({ sessionId, inGameWorldId });
  const [pageIndex, setPageIndex] = useState(0);
  const [draggedNpcId, setDraggedNpcId] = useState<string | null>(null);
  const [deleteNpcId, setDeleteNpcId] = useState<string | null>(null);
  const pageCount = Math.max(1, Math.ceil(relationships.npcs.length / 2));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);

  const visibleNpcs = useMemo(
    () => relationships.npcs.slice(safePageIndex * 2, safePageIndex * 2 + 2),
    [relationships.npcs, safePageIndex]
  );
  const deletingNpc = relationships.npcs.find((npc) => npc.id === deleteNpcId) ?? null;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="absolute right-[308px] top-0 z-30 flex h-[56px] items-start justify-end gap-[8px]">
          {relationships.isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  const id = relationships.addNpc();
                  setPageIndex(Math.floor(relationships.npcs.length / 2));
                  setDraggedNpcId(id);
                }}
                className="flex w-[66px] flex-col items-center justify-center gap-[1px] text-white transition-opacity hover:opacity-70"
                title="Add NPC"
              >
                <span className="font-montserrat-alt text-[30px] font-light leading-[28px]">+</span>
                <span className="font-montserrat text-[11px] font-bold">Add</span>
              </button>
              <button
                type="button"
                onClick={relationships.cancelEditing}
                disabled={relationships.isSaving}
                className="flex w-[66px] flex-col items-center justify-center gap-[1px] text-white transition-opacity hover:opacity-70 disabled:opacity-40"
                title="Cancel changes"
              >
                <span className="font-montserrat text-[29px] font-light leading-[28px]">{'\u00d7'}</span>
                <span className="font-montserrat text-[11px] font-bold">Cancel</span>
              </button>
              <button
                type="button"
                onClick={relationships.save}
                disabled={!relationships.hasChanges || relationships.isSaving}
                className="flex w-[66px] flex-col items-center justify-center gap-[2px] text-white transition-opacity hover:opacity-70 disabled:opacity-40"
                title="Save relationships"
              >
                <Image
                  src="/save-icon.svg"
                  alt=""
                  width={27}
                  height={27}
                  className="invert"
                />
                <span className="font-montserrat text-[11px] font-bold">
                  {relationships.isSaving ? 'Saving' : 'Save'}
                </span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={relationships.beginEditing}
              className="flex w-[66px] flex-col items-center justify-center gap-[2px] text-white transition-opacity hover:opacity-70"
              title="Edit relationships"
            >
              <Image src="/Edit-icon.png" alt="" width={27} height={27} />
              <span className="font-montserrat text-[11px] font-bold">Edit</span>
            </button>
          )}
      </div>

      {relationships.error ? (
        <div className="mb-[10px] rounded-[6px] border border-red-400/35 bg-red-500/10 px-[12px] py-[8px] font-montserrat text-[12px] text-red-200">
          {relationships.error}
        </div>
      ) : null}
      {relationships.status ? (
        <div className="absolute right-[0] top-[58px] z-30 rounded-[6px] bg-white px-[12px] py-[8px] font-montserrat text-[12px] font-bold text-black shadow-lg">
          {relationships.status}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_286px] gap-[22px]">
        <div className="relative min-h-0 pb-[30px] pt-[62px]">
          {relationships.isLoading ? (
            <div className="flex h-full items-center justify-center font-montserrat text-[14px] text-white/60">
              Loading relationships...
            </div>
          ) : relationships.npcs.length ? (
            <div className="grid h-full min-h-0 grid-cols-[repeat(2,minmax(0,320px))] justify-start gap-[20px]">
              {visibleNpcs.map((npc) => {
                const link = relationships.getSelectedLink(npc.id);
                return (
                  <NpcCard
                    key={npc.id}
                    npc={npc}
                    isEditing={relationships.isEditing}
                    disabled={!relationships.selectedCharacterId}
                    link={link}
                    onUpdate={(patch) => relationships.updateNpc(npc.id, patch)}
                    onImageSelect={(file) => relationships.selectNpcImage(npc.id, file)}
                    onRelationshipChange={(value) =>
                      relationships.updateSelectedLink(npc.id, { relationshipValue: value })
                    }
                    onVisibilityToggle={() =>
                      relationships.updateSelectedLink(npc.id, {
                        isVisibleToPlayer: !link?.isVisibleToPlayer,
                      })
                    }
                    onDeleteRequest={() => setDeleteNpcId(npc.id)}
                    onDragStart={() => setDraggedNpcId(npc.id)}
                    onDrop={() => {
                      if (draggedNpcId) relationships.moveNpc(draggedNpcId, npc.id);
                      setDraggedNpcId(null);
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-[13px] text-center">
              <p className="font-montserrat-alt text-[20px] font-extrabold text-white">
                No NPCs yet
              </p>
              <p className="max-w-[330px] font-montserrat text-[13px] text-white/55">
                Enter edit mode and add the first character to this relationship map.
              </p>
            </div>
          )}

          {pageCount > 1 ? (
            <>
              <button
                type="button"
                disabled={safePageIndex === 0}
                onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
                title="Previous NPCs"
                className="absolute left-0 top-1/2 flex h-[38px] w-[38px] -translate-y-1/2 items-center justify-center rounded-full border border-white text-[30px] text-white disabled:opacity-25"
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
            <div className="absolute inset-x-0 bottom-[4px] flex justify-center gap-[7px]">
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

        <RelationshipAudience relationships={relationships} />
      </div>

      {deletingNpc ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[18px] bg-black/70 p-[24px]">
          <div className="w-full max-w-[390px] rounded-[8px] border border-white/20 bg-[#182235] p-[20px] shadow-2xl">
            <h3 className="font-montserrat-alt text-[20px] font-extrabold text-white">
              Delete {deletingNpc.name || 'this NPC'}?
            </h3>
            <p className="mt-[9px] font-montserrat text-[13px] leading-[1.5] text-white/65">
              The NPC, image, and every character relationship will be deleted immediately.
            </p>
            <div className="mt-[18px] flex justify-end gap-[8px]">
              <button
                type="button"
                onClick={() => setDeleteNpcId(null)}
                className="rounded-[6px] border border-white/30 px-[14px] py-[9px] font-montserrat text-[12px] font-bold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={relationships.isDeleting}
                onClick={async () => {
                  await relationships.removeNpc(deletingNpc.id);
                  setDeleteNpcId(null);
                }}
                className="rounded-[6px] bg-red-500 px-[14px] py-[9px] font-montserrat text-[12px] font-extrabold text-white disabled:opacity-40"
              >
                {relationships.isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
