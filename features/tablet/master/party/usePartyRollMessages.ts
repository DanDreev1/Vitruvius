'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabaseClient';

import {
  PARTY_ROLL_MESSAGE_EVENT,
  broadcastPartyRollMessage,
  getPartyRollMessagesRealtimeChannelName,
} from './api';
import type { PartyRollMessage, PartyRollMessageType } from './types';

const PARTY_ROLL_MESSAGE_TTL_MS = 5000;

export function usePartyRollMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<PartyRollMessage[]>([]);
  const removeTimeoutsRef = useRef<Map<string, number>>(new Map());

  const scheduleMessageRemoval = useCallback((messageId: string) => {
    const previousTimeoutId = removeTimeoutsRef.current.get(messageId);
    if (previousTimeoutId) {
      window.clearTimeout(previousTimeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      removeTimeoutsRef.current.delete(messageId);
      setMessages((prevMessages) =>
        prevMessages.filter((message) => message.id !== messageId)
      );
    }, PARTY_ROLL_MESSAGE_TTL_MS);

    removeTimeoutsRef.current.set(messageId, timeoutId);
  }, []);

  const addMessage = useCallback(
    (message: PartyRollMessage) => {
      setMessages((prevMessages) => [message, ...prevMessages].slice(0, 4));
      scheduleMessageRemoval(message.id);
    },
    [scheduleMessageRemoval]
  );

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(getPartyRollMessagesRealtimeChannelName(sessionId))
      .on(
        'broadcast',
        {
          event: PARTY_ROLL_MESSAGE_EVENT,
        },
        ({ payload }) => {
          const message = payload as PartyRollMessage;

          if (message.sessionId !== sessionId) {
            return;
          }

          addMessage(message);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [addMessage, sessionId]);

  useEffect(() => {
    const timeouts = removeTimeoutsRef.current;

    return () => {
      for (const timeoutId of timeouts.values()) {
        window.clearTimeout(timeoutId);
      }
      timeouts.clear();
    };
  }, []);

  const publishMessage = useCallback(
    async ({
      checkId,
      type,
      participantId,
      displayName,
      text,
    }: {
      checkId: string;
      type: PartyRollMessageType;
      participantId: string;
      displayName: string;
      text: string;
    }) => {
      if (!sessionId) return;

      const message: PartyRollMessage = {
        id: crypto.randomUUID(),
        sessionId,
        checkId,
        type,
        participantId,
        displayName,
        text,
        createdAt: Date.now(),
      };

      addMessage(message);
      await broadcastPartyRollMessage(message);
    },
    [addMessage, sessionId]
  );

  return {
    messages,
    publishMessage,
  };
}
