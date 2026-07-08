'use client';

import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabaseClient';

import {
  getRelationshipsChannelName,
  getVisiblePlayerRelationships,
  RELATIONSHIPS_CHANGED_EVENT,
} from './api';
import type { PlayerRelationshipNpc } from './types';

export function usePlayerRelationships({
  sessionId,
  inGameWorldId,
  inGameCharacterId,
}: {
  sessionId: string;
  inGameWorldId: string | null;
  inGameCharacterId: string | null;
}) {
  const [npcs, setNpcs] = useState<PlayerRelationshipNpc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!inGameWorldId || !inGameCharacterId) {
      setNpcs([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextNpcs = await getVisiblePlayerRelationships({
        inGameWorldId,
        inGameCharacterId,
      });
      setNpcs(nextNpcs);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load relationships.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [inGameCharacterId, inGameWorldId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(getRelationshipsChannelName(sessionId))
      .on('broadcast', { event: RELATIONSHIPS_CHANGED_EVENT }, () => {
        void load();
      });

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, sessionId]);

  return { npcs, isLoading, error, reload: load };
}
