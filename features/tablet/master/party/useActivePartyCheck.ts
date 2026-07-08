'use client';

import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabaseClient';
import { createId } from '@/lib/createId';

import {
  getActivePartyCheck,
} from './api';
import type { PartyCheckState } from './types';

export function useActivePartyCheck(sessionId: string | null) {
  const [check, setCheck] = useState<PartyCheckState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCheck = useCallback(async () => {
    if (!sessionId) {
      setCheck(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextCheck = await getActivePartyCheck(sessionId);
      setCheck(nextCheck);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load active party check.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCheck();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadCheck]);

  useEffect(() => {
    if (!sessionId) return;

    const channelName = `party-check-db-${sessionId}-${createId()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'in_game_worlds_party',
        },
        () => {
          void loadCheck();
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadCheck();
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadCheck, sessionId]);

  return {
    check,
    setCheck,
    isLoading,
    error,
    reload: loadCheck,
  };
}
