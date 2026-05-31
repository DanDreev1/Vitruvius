'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getOrCreateGuestUser } from '@/features/home/getOrCreateGuestUser';
import {
  disbandLobby,
  ensureParticipant,
  getLiveSessionByCode,
  getOwnedCharacters,
  getOwnedWorlds,
  leaveLobby,
  refreshLobbyState,
  selectParticipantCharacter,
  selectParticipantWorld,
  startLobbyGame,
  updateParticipantNickname,
  updateParticipantReady
} from './api';
import {
  EMPTY_CHARACTER_MESSAGE,
  EMPTY_WORLD_MESSAGE,
  LOBBY_DISBANDED_MESSAGE,
  LOBBY_NOT_FOUND_MESSAGE,
  START_GAME_VALIDATION_MESSAGE
} from './constants';
import { useLobbyRealtime } from './useLobbyRealtime';
import { useLobbySwipe } from './useLobbySwipe';
import type {
  Character,
  LobbyScreenProps,
  LiveSession,
  SessionParticipant,
  World
} from './types';

export function useLobbyScreen({ code }: LobbyScreenProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [copied, setCopied] = useState(false);

  const { activeSlide, setActiveSlide, onTouchStart, onTouchEnd } = useLobbySwipe();

  const currentParticipant = useMemo(() => {
    return participants.find((p) => p.user_id === currentUserId) ?? null;
  }, [participants, currentUserId]);

  const isMaster = currentParticipant?.role === 'master';
  const readyCount = participants.filter((p) => p.is_ready).length;

  const syncLobbyState = useCallback(
    async (sessionId: string, userId: string) => {
      const result = await refreshLobbyState(sessionId, userId);

      if (!result.liveSession) {
        alert(LOBBY_DISBANDED_MESSAGE);
        router.push('/');
        return null;
      }

      if (result.liveSession.phase === 'active') {
        router.push(`/game/${result.liveSession.code}`);
        return null;
      }

      setSession(result.liveSession);
      setParticipants(result.participants);

      return result;
    },
    [router]
  );

  const bootstrapLobby = useCallback(async () => {
    setIsLoading(true);

    try {
      const user = await getOrCreateGuestUser();
      setCurrentUserId(user.id);

      const liveSession = await getLiveSessionByCode(code);

      if (!liveSession) {
        alert(LOBBY_NOT_FOUND_MESSAGE);
        router.push('/');
        return;
      }

      await ensureParticipant(liveSession.id, user.id, liveSession.created_by);

      const result = await syncLobbyState(liveSession.id, user.id);
      if (!result) return;

      if (result.me?.role === 'master') {
        const ownedWorlds = await getOwnedWorlds(user.id);
        setWorlds(ownedWorlds);
        setCharacters([]);
      } else {
        const ownedCharacters = await getOwnedCharacters(user.id);
        setCharacters(ownedCharacters);
        setWorlds([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [code, router, syncLobbyState]);

  useEffect(() => {
    void bootstrapLobby();
  }, [bootstrapLobby]);

  const handleParticipantsChange = useCallback(async () => {
    if (!session?.id || !currentUserId) return;
    try {
      await syncLobbyState(session.id, currentUserId);
    } catch (error) {
      console.error(error);
    }
  }, [currentUserId, session?.id, syncLobbyState]);

  const handleSessionChange = useCallback(async () => {
    if (!session?.id || !currentUserId) return;
    try {
      await syncLobbyState(session.id, currentUserId);
    } catch (error) {
      console.error(error);
    }
  }, [currentUserId, session?.id, syncLobbyState]);

  useLobbyRealtime({
    sessionId: session?.id ?? null,
    enabled: !!session?.id && !!currentUserId,
    onParticipantsChange: handleParticipantsChange,
    onSessionChange: handleSessionChange
  });

  const handleCopyCode = useCallback(async () => {
    if (!session?.code) return;

    await navigator.clipboard.writeText(session.code);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }, [session?.code]);

  const handleToggleReady = useCallback(async () => {
    if (!currentParticipant) return;

    try {
      await updateParticipantReady(currentParticipant.id, !currentParticipant.is_ready);
    } catch (error) {
      console.error(error);
    }
  }, [currentParticipant]);

  const handleChangeNickname = useCallback(async () => {
    if (!currentParticipant) return;

    const nextNickname = window
      .prompt('Enter a new nickname', currentParticipant.display_name ?? '')
      ?.trim();

    if (!nextNickname) return;

    try {
      await updateParticipantNickname(currentParticipant.id, nextNickname);
    } catch (error) {
      console.error(error);
    }
  }, [currentParticipant]);

  const handleSelectCharacter = useCallback(
    async (character: Character) => {
      if (!currentParticipant) return;

      try {
        await selectParticipantCharacter(currentParticipant.id, character);
      } catch (error) {
        console.error(error);
      }
    },
    [currentParticipant]
  );

  const handleSelectWorld = useCallback(
    async (worldId: string) => {
      if (!currentParticipant) return;

      try {
        await selectParticipantWorld(currentParticipant.id, worldId);
      } catch (error) {
        console.error(error);
      }
    },
    [currentParticipant]
  );

  const handleLeaveLobby = useCallback(async () => {
    if (!currentParticipant) return;

    try {
      await leaveLobby(currentParticipant.id);
      router.push('/');
    } catch (error) {
      console.error(error);
    }
  }, [currentParticipant, router]);

  const handleDisbandLobby = useCallback(async () => {
    if (!session || !isMaster) return;

    const confirmed = window.confirm('Are you sure you want to disband this lobby?');
    if (!confirmed) return;

    try {
      await disbandLobby(session.id);
      router.push('/');
    } catch (error) {
      console.error(error);
    }
  }, [isMaster, router, session]);

  const handleStartGame = useCallback(async () => {
    if (!session || !currentParticipant || !isMaster) return;

    const allReady = participants.length > 0 && participants.every((p) => p.is_ready);

    if (!allReady) {
      alert(START_GAME_VALIDATION_MESSAGE);
      return;
    }

    try {
      await startLobbyGame(session.id);
      router.push(`/game/${session.code}`);
    } catch (error) {
      console.error(error);
    }
  }, [currentParticipant, isMaster, participants, router, session]);

  return {
    isLoading,
    session,
    participants,
    currentParticipant,
    characters,
    worlds,
    activeSlide,
    copied,
    isMaster,
    readyCount,
    emptyCharacterMessage: EMPTY_CHARACTER_MESSAGE,
    emptyWorldMessage: EMPTY_WORLD_MESSAGE,
    setActiveSlide,
    onTouchStart,
    onTouchEnd,
    handleCopyCode,
    handleToggleReady,
    handleChangeNickname,
    handleSelectCharacter,
    handleSelectWorld,
    handleLeaveLobby,
    handleDisbandLobby,
    handleStartGame
  };
}