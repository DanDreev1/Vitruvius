'use client';

import { useEffect, useState } from 'react';

import { getTabletPlayerCharacter } from './api';
import type { TabletPlayerCharacter } from './types';

type UsePlayerTabletCharacterParams = {
  sessionId: string;
  participantId: string | null;
  enabled: boolean;
};

export function usePlayerTabletCharacter({
  sessionId,
  participantId,
  enabled,
}: UsePlayerTabletCharacterParams) {
  const [character, setCharacter] = useState<TabletPlayerCharacter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCharacter() {
      if (!enabled || !participantId) {
        setCharacter(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const loadedCharacter = await getTabletPlayerCharacter(
          sessionId,
          participantId
        );

        if (isMounted) {
          setCharacter(loadedCharacter);
        }
      } catch (loadError) {
        if (isMounted) {
          const message =
            loadError instanceof Error ? loadError.message : String(loadError);
          setError(message);
          setCharacter(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCharacter();

    return () => {
      isMounted = false;
    };
  }, [enabled, participantId, sessionId]);

  return {
    character,
    isLoading,
    error,
    setCharacter,
  };
}
