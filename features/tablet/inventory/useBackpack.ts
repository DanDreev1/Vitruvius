'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { supabase } from '@/lib/supabaseClient';

import {
  discardItem,
  getInventoryAudience,
  getInventoryChannelName,
  getInventoryItems,
  INVENTORY_CHANGED_EVENT,
  publishInventoryMessage,
  setItemVisibility,
  transferItem,
  executeUseItem,
} from './api';
import type { InventoryAudienceMember, InventoryItem } from './types';

export function useBackpack({ sessionId, characterId, silent }: { sessionId: string; characterId: string | null; silent: boolean }) {
  const t = useTranslations('TabletPlayer.backpack');
  const commonT = useTranslations('TabletPlayer.common');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [audience, setAudience] = useState<InventoryAudienceMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!characterId) { setItems([]); return; }
    setIsLoading(true); setError(null);
    try {
      const [nextItems, players] = await Promise.all([getInventoryItems(characterId), getInventoryAudience(sessionId)]);
      setItems(nextItems); setAudience(players);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : t('loadError')); }
    finally { setIsLoading(false); }
  }, [characterId, sessionId]);
  useEffect(() => { const id = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(id); }, [load]);
  useEffect(() => {
    if (!characterId) return;
    const channel = supabase.channel(getInventoryChannelName(sessionId, characterId))
      .on('broadcast', { event: INVENTORY_CHANGED_EVENT }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [characterId, load, sessionId]);

  const act = useCallback(async (kind: 'use' | 'discard' | 'transfer', item: InventoryItem, quantity = 1, recipient?: InventoryAudienceMember) => {
    try {
      if (kind === 'use') {
        await executeUseItem(item.id, sessionId);
        if (!silent) await publishInventoryMessage(sessionId, t('messageUse', { name: audience.find((member) => member.inGameCharacterId === item.inGameCharacterId)?.displayName ?? commonT('player'), item: item.name }));
      } else if (kind === 'discard') {
        const result = await discardItem(item.id, quantity, sessionId);
        if (!silent) await publishInventoryMessage(sessionId, t('messageDiscard', { name: audience.find((member) => member.inGameCharacterId === item.inGameCharacterId)?.displayName ?? commonT('player'), quantity: result.quantity, item: item.name }));
      } else if (recipient) {
        const result = await transferItem(item.id, recipient.inGameCharacterId, quantity, sessionId);
        if (!silent && result.quantity > 0) await publishInventoryMessage(sessionId, t('messageTransfer', { name: audience.find((member) => member.inGameCharacterId === item.inGameCharacterId)?.displayName ?? commonT('player'), quantity: result.quantity, item: item.name, recipient: recipient.displayName }));
      }
      await load();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : t('actionError')); }
  }, [audience, commonT, load, sessionId, silent, t]);

  const saveVisibility = useCallback(async (itemId: string, ids: string[]) => {
    if (!characterId) return;
    try { await setItemVisibility(itemId, ids, sessionId, characterId); await load(); }
    catch (visibilityError) { setError(visibilityError instanceof Error ? visibilityError.message : t('visibilityError')); }
  }, [characterId, load, sessionId, t]);

  return { items, audience, isLoading, error, act, saveVisibility };
}
