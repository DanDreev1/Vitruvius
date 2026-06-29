'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabaseClient';

import {
  getInventoryMessagesChannelName,
  INVENTORY_LOCAL_MESSAGE_EVENT,
  INVENTORY_MESSAGE_EVENT,
} from './api';
import type { InventoryMessage } from './types';

export function useInventoryMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<InventoryMessage[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());
  const add = useCallback((message: InventoryMessage) => {
    setMessages((current) => [message, ...current].slice(0, 4));
    const timer = window.setTimeout(() => {
      setMessages((current) => current.filter((item) => item.id !== message.id));
      timersRef.current.delete(message.id);
    }, 5000);
    timersRef.current.set(message.id, timer);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const onLocal = (event: Event) => add((event as CustomEvent<InventoryMessage>).detail);
    window.addEventListener(INVENTORY_LOCAL_MESSAGE_EVENT, onLocal);
    const channel = supabase
      .channel(getInventoryMessagesChannelName(sessionId))
      .on('broadcast', { event: INVENTORY_MESSAGE_EVENT }, ({ payload }) => {
        const message = payload as InventoryMessage;
        if (message.sessionId === sessionId) add(message);
      })
      .subscribe();
    return () => {
      window.removeEventListener(INVENTORY_LOCAL_MESSAGE_EVENT, onLocal);
      void supabase.removeChannel(channel);
    };
  }, [add, sessionId]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return messages;
}
