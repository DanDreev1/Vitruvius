'use client';

import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabaseClient';
import { getActiveSessionForUser } from './getActiveSessionForUser';

type ResumeState = {
  isChecking: boolean;
  activeGameCode: string | null;
  showManualContinue: boolean;
};

export function useResumeActiveGame() {
  const redirectAttemptedRef = useRef(false);
  const [resumeState, setResumeState] = useState<ResumeState>({
    isChecking: true,
    activeGameCode: null,
    showManualContinue: false,
  });

  useEffect(() => {
    let isMounted = true;
    let fallbackTimeoutId: number | null = null;

    async function checkActiveGame() {
      try {
        const {
          data: { session: authSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !authSession?.user) {
          if (!isMounted) return;

          setResumeState({
            isChecking: false,
            activeGameCode: null,
            showManualContinue: false,
          });
          return;
        }

        const activeSession = await getActiveSessionForUser(authSession.user.id);

        if (!isMounted) return;

        if (!activeSession) {
          setResumeState({
            isChecking: false,
            activeGameCode: null,
            showManualContinue: false,
          });
          return;
        }

        setResumeState({
          isChecking: false,
          activeGameCode: activeSession.code,
          showManualContinue: false,
        });

        if (redirectAttemptedRef.current) {
          return;
        }

        redirectAttemptedRef.current = true;

        fallbackTimeoutId = window.setTimeout(() => {
          setResumeState((current) => ({
            ...current,
            showManualContinue: true,
          }));
        }, 2500);

        window.location.replace(`/game/${activeSession.code}`);
      } catch (error) {
        console.error(error);

        if (!isMounted) return;

        setResumeState({
          isChecking: false,
          activeGameCode: null,
          showManualContinue: false,
        });
      }
    }

    void checkActiveGame();

    return () => {
      isMounted = false;

      if (fallbackTimeoutId) {
        window.clearTimeout(fallbackTimeoutId);
      }
    };
  }, []);

  const handleContinueToGame = () => {
    if (!resumeState.activeGameCode) {
      return;
    }

    window.location.replace(`/game/${resumeState.activeGameCode}`);
  };

  return {
    ...resumeState,
    handleContinueToGame,
  };
}
