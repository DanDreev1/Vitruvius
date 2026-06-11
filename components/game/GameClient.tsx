'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabaseClient';
import GameViewport from '@/components/game/GameViewport';
import TabletHost from './TabletHost';
import { getGameSessionByCode } from '@/features/game/getGameSessionByCode';
import { useGamePresence } from '@/features/game/useGamePresence';
import type {
  GameParticipant,
  OpenTabletState,
  TabletViewMode,
} from '@/lib/game/types';

type GameClientProps = {
  code: string;
};

type LoadedGameData = {
  session: {
    id: string;
    code: string;
    phase: string;
    created_by: string;
  };
  participants: GameParticipant[];
  currentUserId: string;
};

export default function GameClient({ code }: GameClientProps) {
  const router = useRouter();

  const [gameData, setGameData] = useState<LoadedGameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabletState, setTabletState] = useState<OpenTabletState>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGame() {
      try {
        setLoading(true);

        const {
          data: { session: authSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !authSession?.user) {
          router.replace('/login');
          return;
        }

        const currentUserId = authSession.user.id;

        const { session, participants } = await getGameSessionByCode(code);

        if (session.phase !== 'active') {
          router.replace(`/lobby/${code}`);
          return;
        }

        const currentParticipant = participants.find(
          (participant) => participant.userId === currentUserId
        );

        if (!currentParticipant) {
          router.replace('/');
          return;
        }

        if (!isMounted) {
          return;
        }

        setGameData({
          session,
          participants,
          currentUserId,
        });
      } catch (error) {
        console.error(error);
        router.replace('/');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadGame();

    return () => {
      isMounted = false;
    };
  }, [code, router]);

  const currentParticipant = useMemo(() => {
    if (!gameData) return null;

    return (
      gameData.participants.find(
        (participant) => participant.userId === gameData.currentUserId
      ) ?? null
    );
  }, [gameData]);

  const master = useMemo(() => {
    if (!gameData) return null;

    return (
      gameData.participants.find((participant) => participant.role === 'master') ??
      null
    );
  }, [gameData]);

  const players = useMemo(() => {
    if (!gameData) return [];

    return gameData.participants.filter(
      (participant) => participant.role === 'player'
    );
  }, [gameData]);

  useGamePresence({
    sessionId: gameData?.session.id ?? null,
    currentUserId: gameData?.currentUserId ?? null,
    onParticipantsSync: (participants) => {
      setGameData((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          participants,
        };
      });
    },
  });

  const handleTabletClick = (targetUserId: string) => {
    if (!gameData || !currentParticipant) {
      return;
    }

    const targetParticipant = gameData.participants.find(
      (participant) => participant.userId === targetUserId
    );

    if (!targetParticipant) {
      return;
    }

    let mode: TabletViewMode;

    if (targetParticipant.userId === currentParticipant.userId) {
      mode = 'self';
    } else if (currentParticipant.role === 'master') {
      mode = 'master';
    } else {
      mode = 'readonly-other';
    }

    setTabletState({
      targetUserId: targetParticipant.userId,
      mode,
    });
  };

  const handleCloseTablet = () => {
    setTabletState(null);
  };

  if (loading) {
    return <div className="p-6 text-white">Loading game...</div>;
  }

  if (!gameData || !master || !currentParticipant) {
    return null;
  }

  return (
    <>
      <GameViewport
        master={master}
        players={players}
        onTabletClick={handleTabletClick}
      />

      <TabletHost
        isOpen={tabletState !== null}
        sessionId={gameData.session.id}
        viewerUserId={gameData.currentUserId}
        targetUserId={tabletState?.targetUserId ?? null}
        mode={tabletState?.mode ?? null}
        onClose={handleCloseTablet}
      />
    </>
  );
}