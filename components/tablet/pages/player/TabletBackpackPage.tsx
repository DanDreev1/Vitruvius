'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  CategoryTabs,
  EmptyItemTile,
  ItemPortrait,
  ItemTile,
} from '@/components/tablet/inventory/InventoryPrimitives';
import type {
  InventoryCategory,
  InventoryItem,
} from '@/features/tablet/inventory/types';
import { useBackpack } from '@/features/tablet/inventory/useBackpack';
import type { TabletViewMode } from '@/lib/game/types';

export default function TabletBackpackPage({
  sessionId,
  characterId,
  mode,
}: {
  sessionId: string;
  characterId: string | null;
  mode: TabletViewMode;
}) {
  const t = useTranslations('TabletPlayer.backpack');
  const commonT = useTranslations('TabletPlayer.common');
  const canInteract = mode === 'self' || mode === 'master';
  const backpack = useBackpack({
    sessionId,
    characterId,
    silent: mode === 'master',
  });
  const [category, setCategory] = useState<'all' | InventoryCategory>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'give' | 'show' | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [visibilityIds, setVisibilityIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isImageCompact, setIsImageCompact] = useState(false);
  const filtered = useMemo(
    () =>
      backpack.items.filter(
        (item) => category === 'all' || item.category === category
      ),
    [backpack.items, category]
  );
  const selected =
    backpack.items.find((item) => item.id === selectedId) ?? null;
  const emptySlotCount = Math.max(0, 16 - filtered.length);
  const recipients = backpack.audience.filter(
    (member) => member.inGameCharacterId !== characterId
  );

  const openGive = (item: InventoryItem) => {
    setSelectedId(item.id);
    setTargetId(null);
    setQuantity(1);
    setDialog('give');
  };

  const openShow = (item: InventoryItem) => {
    setSelectedId(item.id);
    setVisibilityIds(item.visibleCharacterIds);
    setDialog('show');
  };

  return (
    <div className="relative mt-[40px] grid h-[calc(100%-40px)] min-h-0 w-[calc(100%-110px)] grid-cols-[minmax(0,1fr)_280px] gap-[28px]">
      <div className="flex min-h-0 flex-col gap-[40px]">
        <CategoryTabs
          value={category}
          onChange={(value) => {
            setCategory(value);
            setSelectedId(null);
            setIsImageCompact(false);
          }}
        />
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
      </div>

      <aside className="flex min-h-0 flex-col rounded-[8px] border-[2px] border-white/70 p-[14px]">
        <ItemPortrait
          imageUrl={selected?.imageUrl ?? null}
          name={selected?.name ?? commonT('name')}
          compact={!selected || isImageCompact}
          onCompactChange={selected ? setIsImageCompact : undefined}
        />
        <div className="mt-[8px] flex items-center justify-between gap-[8px]">
          <p className="font-montserrat text-[11px] uppercase text-[#D6B25E]">
            {selected ? t(selected.category) : commonT('item')}
          </p>
          {selected?.category === 'consumable' ? (
            <span className="rounded-full bg-white px-[8px] py-[4px] font-montserrat-alt text-[11px] font-bold text-black">
              ×{selected.quantity}
            </span>
          ) : null}
        </div>
        <p
          className={[
            'min-h-0 touch-pan-y overflow-y-auto overscroll-contain font-montserrat text-[13px] leading-[1.5] text-white/75 transition-[opacity,margin] duration-500',
            !selected || isImageCompact
              ? 'mt-[9px] flex-1 opacity-100'
              : 'h-0 opacity-0',
          ].join(' ')}
        >
          {selected?.description ?? t('selectItemDescription')}
        </p>
        {canInteract ? (
          <div className="mt-[9px] space-y-[7px]">
            <button
              type="button"
              disabled={!selected}
              onClick={() => selected && void backpack.act('use', selected)}
              className="w-full rounded-[8px] bg-white py-[10px] font-montserrat text-[14px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-35"
            >
              {t('use')}
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={() => selected && openGive(selected)}
              className="w-full rounded-[8px] bg-white py-[10px] font-montserrat text-[14px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-35"
            >
              {t('giveOrThrowAway')}
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={() => selected && openShow(selected)}
              className="w-full rounded-[8px] bg-white py-[10px] font-montserrat text-[14px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-35"
            >
              {t('showOrHide')}
            </button>
          </div>
        ) : null}
      </aside>

      {backpack.error ? (
        <p className="absolute bottom-0 left-0 rounded bg-red-500/20 px-[8px] py-[5px] text-[10px] text-red-200">
          {backpack.error}
        </p>
      ) : null}

      {dialog && selected ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-[24px]">
          <div className="w-[510px] rounded-[8px] border border-white/25 bg-[#172033] p-[20px] shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
            <div className="flex items-center gap-[14px] border-b border-white/10 pb-[15px]">
              <div
                className="h-[64px] w-[82px] shrink-0 rounded-[7px] border border-white/25 bg-[#0F1724] bg-cover bg-center"
                style={
                  selected.imageUrl
                    ? { backgroundImage: `url(${selected.imageUrl})` }
                    : undefined
                }
              />
              <div className="min-w-0">
                <p className="font-montserrat text-[10px] font-bold uppercase text-[#D6B25E]">
                  {dialog === 'give' ? t('giveOrDiscard') : t('itemVisibility')}
                </p>
                <h3 className="mt-[3px] truncate font-montserrat-alt text-[21px] font-extrabold text-white">
                  {selected.name}
                </h3>
                <p className="mt-[2px] font-montserrat text-[11px] capitalize text-white/55">
                  {t(selected.category)}
                </p>
              </div>
            </div>

            <div className="mt-[15px] flex items-center justify-between gap-[12px]">
              <div>
                <p className="font-montserrat-alt text-[14px] font-extrabold text-white">
                  {dialog === 'give' ? t('recipient') : t('visibleTo')}
                </p>
                <p className="mt-[2px] font-montserrat text-[10px] text-white/50">
                  {dialog === 'give'
                    ? t('chooseAnotherCharacter')
                    : t('chooseWhoCanInspect')}
                </p>
              </div>
              {dialog === 'give' && selected.category === 'consumable' ? (
                <div className="flex items-center gap-[8px]">
                  <span className="font-montserrat text-[11px] font-bold text-white/65">
                    {t('quantity')}
                  </span>
                  <div className="flex items-center rounded-[7px] border border-white/25 bg-[#0F1724] p-[3px]">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((value) => Math.max(1, value - 1))
                      }
                      className="flex h-[28px] w-[28px] items-center justify-center font-montserrat-alt text-[18px] font-bold text-white"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={selected.quantity}
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(
                          Math.min(
                            selected.quantity,
                            Math.max(1, Number(event.target.value))
                          )
                        )
                      }
                      className="h-[28px] w-[52px] bg-transparent text-center font-montserrat-alt text-[13px] font-extrabold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((value) =>
                          Math.min(selected.quantity, value + 1)
                        )
                      }
                      className="flex h-[28px] w-[28px] items-center justify-center font-montserrat-alt text-[18px] font-bold text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {recipients.length ? (
              <div className="mt-[12px] grid max-h-[190px] grid-cols-2 gap-[9px] overflow-y-auto pr-[3px]">
                {recipients.map((member) => {
                  const isSelected =
                    dialog === 'give'
                      ? targetId === member.inGameCharacterId
                      : visibilityIds.includes(member.inGameCharacterId);
                  return (
                    <button
                      key={member.inGameCharacterId}
                      type="button"
                      onClick={() =>
                        dialog === 'give'
                          ? setTargetId(member.inGameCharacterId)
                          : setVisibilityIds((current) =>
                              isSelected
                                ? current.filter(
                                    (id) => id !== member.inGameCharacterId
                                  )
                                : [...current, member.inGameCharacterId]
                            )
                      }
                      className={[
                        'flex min-h-[58px] items-center gap-[10px] rounded-[7px] border px-[10px] py-[8px] text-left transition',
                        isSelected
                          ? 'border-[#D6B25E] bg-[#D6B25E]/10'
                          : 'border-white/20 bg-white/[0.03] hover:border-white/45',
                      ].join(' ')}
                    >
                      <div className="relative shrink-0">
                        <div
                          className="h-[38px] w-[38px] rounded-full bg-white/20 bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${
                              member.avatarUrl ?? '/avatar-placeholder.png'
                            })`,
                          }}
                        />
                        {isSelected ? (
                          <span className="absolute -bottom-[2px] -right-[2px] flex h-[17px] w-[17px] items-center justify-center rounded-full bg-[#D6B25E] text-[10px] font-bold text-black">
                            {'\u2713'}
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-montserrat-alt text-[12px] font-extrabold text-white">
                          {member.displayName}
                        </p>
                        <p className="mt-[1px] font-montserrat text-[9px] text-white/45">
                          {commonT('character')}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-[14px] rounded-[7px] border border-white/15 bg-white/[0.03] px-[16px] py-[22px] text-center">
                <p className="font-montserrat-alt text-[13px] font-extrabold text-white">
                  {t('noOtherPlayers')}
                </p>
                <p className="mt-[4px] font-montserrat text-[10px] text-white/50">
                  {dialog === 'give' ? t('nobodyToGive') : t('nobodyToShow')}
                </p>
              </div>
            )}

            {dialog === 'give' ? (
              <button
                type="button"
                onClick={async () => {
                  await backpack.act('discard', selected, quantity);
                  setDialog(null);
                }}
                className="mt-[13px] w-full rounded-[7px] border border-red-300/45 py-[9px] font-montserrat text-[11px] font-bold text-red-200 transition hover:bg-red-500/10"
              >
                {t('throwAway')}
              </button>
            ) : null}

            <div className="mt-[16px] flex justify-end gap-[9px] border-t border-white/10 pt-[14px]">
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="rounded-[7px] border border-white/25 px-[18px] py-[10px] font-montserrat text-[12px] font-bold text-white transition hover:bg-white/5"
              >
                {commonT('cancel')}
              </button>
              {dialog === 'give' ? (
                <button
                  type="button"
                  disabled={!targetId}
                  onClick={async () => {
                    const recipient = recipients.find(
                      (member) => member.inGameCharacterId === targetId
                    );
                    if (recipient) {
                      await backpack.act(
                        'transfer',
                        selected,
                        quantity,
                        recipient
                      );
                    }
                    setDialog(null);
                  }}
                  className="rounded-[7px] bg-white px-[22px] py-[10px] font-montserrat text-[12px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {t('giveItem')}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!recipients.length}
                  onClick={async () => {
                    await backpack.saveVisibility(selected.id, visibilityIds);
                    setDialog(null);
                  }}
                  className="rounded-[7px] bg-white px-[22px] py-[10px] font-montserrat text-[12px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {commonT('save')}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
