"use client";

import { useGamePresence } from "@/features/game/useGamePresence";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BackHomeButton from "@/components/ui/BackHomeButton";
import { supabase } from "@/lib/supabaseClient";
import GameViewport from "@/components/game/GameViewport";
import PlayerSceneImagesHost from "@/components/game/PlayerSceneImagesHost";
import PlayerSceneMusicAudio from "@/components/game/PlayerSceneMusicAudio";
import SceneMusicMasterRuntime from "@/components/game/SceneMusicMasterRuntime";
import TabletHost from "./TabletHost";
import { disbandLobby, leaveLobby } from "@/features/lobby/api";
import { getGameSessionByCode } from "@/features/game/getGameSessionByCode";
import { getInGameWorldBySessionId } from "@/features/worlds/api";
import { usePlayerSceneImages } from "@/features/tablet/player/usePlayerSceneImages";
import { useActivePartyCheck } from "@/features/tablet/master/party/useActivePartyCheck";
import { usePartyRollMessages } from "@/features/tablet/master/party/usePartyRollMessages";
import { useInventoryMessages } from "@/features/tablet/inventory/useInventoryMessages";

import type {
  GameParticipant,
  OpenTabletState,
  TabletViewMode,
} from "@/lib/game/types";

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
  const [isLeavingGame, setIsLeavingGame] = useState(false);
  const [tabletState, setTabletState] = useState<OpenTabletState>(null);
  const [inGameWorldId, setInGameWorldId] = useState<string | null>(null);
  const [isSceneImagesOpen, setIsSceneImagesOpen] = useState(false);
  const partyCheckState = useActivePartyCheck(gameData?.session.id ?? null);
  const partyMessages = usePartyRollMessages(gameData?.session.id ?? null);
  const inventoryMessages = useInventoryMessages(gameData?.session.id ?? null);

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
          router.replace("/login");
          return;
        }

        const currentUserId = authSession.user.id;

        const { session, participants } = await getGameSessionByCode(code);

        if (session.phase !== "active") {
          router.replace(`/lobby/${code}`);
          return;
        }

        const currentParticipant = participants.find(
          (participant) => participant.userId === currentUserId,
        );

        if (!currentParticipant) {
          router.replace("/");
          return;
        }

        const inGameWorld = await getInGameWorldBySessionId(session.id);

        if (!isMounted) {
          return;
        }

        setGameData({
          session,
          participants,
          currentUserId,
        });

        setInGameWorldId(inGameWorld?.id ?? null);
      } catch (error) {
        console.error(error);
        router.replace("/");
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
        (participant) => participant.userId === gameData.currentUserId,
      ) ?? null
    );
  }, [gameData]);

  const master = useMemo(() => {
    if (!gameData) return null;

    return (
      gameData.participants.find(
        (participant) => participant.role === "master",
      ) ?? null
    );
  }, [gameData]);

  const playerSceneImagesState = usePlayerSceneImages({
    sessionId: gameData?.session.id ?? null,
    inGameWorldId,
    participantId:
      currentParticipant?.role === "player" ? currentParticipant.id : null,
    enabled: currentParticipant?.role === "player",
  });

  const players = useMemo(() => {
    if (!gameData) return [];

    return gameData.participants.filter(
      (participant) => participant.role === "player",
    );
  }, [gameData]);

  function areParticipantsVisuallyEqual(
    currentParticipants: GameParticipant[],
    nextParticipants: GameParticipant[],
  ) {
    if (currentParticipants.length !== nextParticipants.length) {
      return false;
    }

    return currentParticipants.every((currentParticipant, index) => {
      const nextParticipant = nextParticipants[index];

      if (!nextParticipant) {
        return false;
      }

      return (
        currentParticipant.id === nextParticipant.id &&
        currentParticipant.userId === nextParticipant.userId &&
        currentParticipant.role === nextParticipant.role &&
        currentParticipant.displayName === nextParticipant.displayName &&
        currentParticipant.avatarUrl === nextParticipant.avatarUrl &&
        currentParticipant.joinedAt === nextParticipant.joinedAt &&
        currentParticipant.connectionStatus === nextParticipant.connectionStatus
      );
    });
  }

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
      (participant) => participant.userId === targetUserId,
    );

    if (!targetParticipant) {
      return;
    }

    if (
      targetParticipant.role === "master" &&
      currentParticipant.role !== "master"
    ) {
      return;
    }

    let mode: TabletViewMode;

    if (targetParticipant.userId === currentParticipant.userId) {
      mode = "self";
    } else if (currentParticipant.role === "master") {
      mode = "master";
    } else {
      mode = "readonly-other";
    }

    setTabletState({
      targetUserId: targetParticipant.userId,
      mode,
      targetRole: targetParticipant.role,
    });
  };

  const handleCloseTablet = () => {
    setTabletState(null);
  };

  const handleTableImageClick = () => {
    if (!playerSceneImagesState.images.length) {
      return;
    }

    setIsSceneImagesOpen(true);
  };

  const handleCloseSceneImages = () => {
    setIsSceneImagesOpen(false);
  };

  const handleLeaveGame = useCallback(async () => {
    if (!gameData || !currentParticipant || isLeavingGame) {
      return;
    }

    setIsLeavingGame(true);

    try {
      if (currentParticipant.role === "master") {
        await disbandLobby(gameData.session.id);
      } else {
        await leaveLobby(currentParticipant.id);
      }

      router.push("/");
    } catch (error) {
      console.error(error);
      setIsLeavingGame(false);
    }
  }, [currentParticipant, gameData, isLeavingGame, router]);

  const mappedTabletParticipants = useMemo(() => {
    if (!gameData) return [];

    return gameData.participants.map((participant) => ({
      id: participant.id,
      user_id: participant.userId,
      display_name: participant.displayName ?? null,
      avatar_url: participant.avatarUrl ?? null,
      role: participant.role,
    }));
  }, [gameData]);

  if (loading) {
    return <div className="p-6 text-white">Loading game...</div>;
  }

  if (!gameData || !master || !currentParticipant) {
    return null;
  }

  return (
    <>
      <div className="fixed left-4 top-4 z-[80] lg:left-8 lg:top-8">
        <BackHomeButton
          label="Leave game"
          onClick={handleLeaveGame}
          disabled={isLeavingGame}
        />
      </div>

      <GameViewport
        sessionId={gameData.session.id}
        master={master}
        currentParticipant={currentParticipant}
        players={players}
        tableImages={
          currentParticipant.role === "player"
            ? playerSceneImagesState.images
            : []
        }
        partyCheck={partyCheckState.check}
        onPartyCheckChange={partyCheckState.setCheck}
        onPartyMessage={(payload) => {
          void partyMessages.publishMessage(payload);
        }}
        onTabletClick={handleTabletClick}
        onTableImageClick={handleTableImageClick}
      />

      <div className="pointer-events-none fixed bottom-5 right-5 z-[260] flex w-[360px] max-w-[calc(100vw-40px)] flex-col gap-[8px]">
        {inventoryMessages.map((message) => (
          <div
            key={message.id}
            className="rounded-[16px] border border-white/15 bg-black/70 px-[14px] py-[10px] font-montserrat text-[13px] font-semibold text-white shadow-xl backdrop-blur"
          >
            {message.text}
          </div>
        ))}
        {partyMessages.messages.map((message) => (
          <div
            key={message.id}
            className="rounded-[16px] border border-white/15 bg-black/70 px-[14px] py-[10px] font-montserrat text-[13px] font-semibold text-white shadow-xl backdrop-blur"
          >
            {message.text}
          </div>
        ))}
      </div>

      <TabletHost
        isOpen={tabletState !== null}
        viewerUserId={gameData.currentUserId}
        targetUserId={tabletState?.targetUserId ?? null}
        mode={tabletState?.mode ?? null}
        targetRole={tabletState?.targetRole ?? null}
        onClose={handleCloseTablet}
        sessionId={gameData.session.id}
        inGameWorldId={inGameWorldId}
        participants={mappedTabletParticipants}
      />

      {currentParticipant.role === "player" ? (
        <PlayerSceneImagesHost
          isOpen={isSceneImagesOpen}
          images={playerSceneImagesState.images}
          isLoading={playerSceneImagesState.isLoading}
          error={playerSceneImagesState.error}
          onClose={handleCloseSceneImages}
        />
      ) : null}

      {currentParticipant.role === "player" ? (
        <PlayerSceneMusicAudio
          sessionId={gameData.session.id}
          inGameWorldId={inGameWorldId}
          participantId={currentParticipant.id}
        />
      ) : (
        <SceneMusicMasterRuntime
          sessionId={gameData.session.id}
          inGameWorldId={inGameWorldId}
        />
      )}
    </>
  );
}
