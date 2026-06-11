'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
  uploadParticipantAvatar,
  updateParticipantNickname,
  updateParticipantReady
} from './api';
import {
  EMPTY_CHARACTER_MESSAGE,
  EMPTY_WORLD_MESSAGE,
  LOBBY_AVATAR_ALLOWED_MIME_TYPES,
  LOBBY_AVATAR_COOLDOWN_NOTICE_MS,
  LOBBY_AVATAR_MAX_FILE_SIZE_BYTES,
  LOBBY_AVATAR_UPDATE_COOLDOWN_MS,
  LOBBY_DISBANDED_MESSAGE,
  LOBBY_MIN_PARTICIPANTS,
  LOBBY_NOT_FOUND_MESSAGE,
  LOBBY_TIMEOUT_MESSAGE,
  START_GAME_MIN_PLAYERS_REQUIRED_MESSAGE,
  READY_NICKNAME_REQUIRED_MESSAGE,
  START_GAME_NICKNAME_REQUIRED_MESSAGE,
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

function isLobbyTimeoutExpired(cleanupAt: string | null) {
  if (!cleanupAt) return false;

  const cleanupAtMs = Date.parse(cleanupAt);

  return Number.isFinite(cleanupAtMs) && cleanupAtMs <= Date.now();
}

function getLobbyClosedMessage(cleanupAt: string | null) {
  return isLobbyTimeoutExpired(cleanupAt)
    ? LOBBY_TIMEOUT_MESSAGE
    : LOBBY_DISBANDED_MESSAGE;
}

function formatCooldownDuration(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function hasConfiguredNickname(participant: SessionParticipant | null) {
  return Boolean(participant?.display_name?.trim());
}

export function useLobbyScreen({ code }: LobbyScreenProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [copied, setCopied] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [avatarCooldownEndsAt, setAvatarCooldownEndsAt] = useState<number | null>(null);
  const [avatarCooldownNow, setAvatarCooldownNow] = useState(() => Date.now());
  const [showAvatarCooldownNotice, setShowAvatarCooldownNotice] = useState(false);
  const [canBypassAvatarCooldownOnce, setCanBypassAvatarCooldownOnce] = useState(false);
  const [isLobbyExitModalOpen, setIsLobbyExitModalOpen] = useState(false);
  const [isLobbyExitSubmitting, setIsLobbyExitSubmitting] = useState(false);
  const [hasAttemptedReadyWithoutNickname, setHasAttemptedReadyWithoutNickname] = useState(false);
  const [hasAttemptedStartWithoutEnoughPlayers, setHasAttemptedStartWithoutEnoughPlayers] = useState(false);
  const [hasAttemptedStartWithoutNicknames, setHasAttemptedStartWithoutNicknames] = useState(false);
  const [hasAttemptedStartWithoutAllReady, setHasAttemptedStartWithoutAllReady] = useState(false);
  const lobbyExitHandledRef = useRef(false);

  const { activeSlide, setActiveSlide, onTouchStart, onTouchEnd } = useLobbySwipe();

  const currentParticipant = useMemo(() => {
    return participants.find((p) => p.user_id === currentUserId) ?? null;
  }, [participants, currentUserId]);

  const currentSessionId = session?.id ?? null;
  const currentSessionCode = session?.code ?? null;
  const currentSessionCleanupAt = session?.cleanup_at ?? null;
  const currentSessionPhase = session?.phase ?? null;

  const isMaster = currentParticipant?.role === 'master';
  const readyCount = participants.filter((p) => p.is_ready).length;
  const hasEnoughParticipants = participants.length >= LOBBY_MIN_PARTICIPANTS;
  const allParticipantsReady =
    participants.length > 0 && participants.every((participant) => participant.is_ready);
  const currentParticipantHasNickname = hasConfiguredNickname(currentParticipant);
  const participantsWithoutNickname = participants.filter(
    (participant) => !hasConfiguredNickname(participant)
  );
  const hasParticipantsWithoutNickname = participantsWithoutNickname.length > 0;
  const canToggleReady = Boolean(currentParticipant);
  const readyFeedbackMessage =
    currentParticipant && !currentParticipantHasNickname && hasAttemptedReadyWithoutNickname
      ? READY_NICKNAME_REQUIRED_MESSAGE
      : null;
  const startGameMinPlayersFeedbackMessage =
    isMaster && !hasEnoughParticipants && hasAttemptedStartWithoutEnoughPlayers
      ? START_GAME_MIN_PLAYERS_REQUIRED_MESSAGE
      : null;
  const startGameNicknameFeedbackMessage =
    isMaster && hasParticipantsWithoutNickname && hasAttemptedStartWithoutNicknames
      ? START_GAME_NICKNAME_REQUIRED_MESSAGE
      : null;
  const startGameReadyFeedbackMessage =
    isMaster && !allParticipantsReady && hasAttemptedStartWithoutAllReady
      ? START_GAME_VALIDATION_MESSAGE
      : null;
  const avatarCooldownRemainingMs = avatarCooldownEndsAt
    ? Math.max(0, avatarCooldownEndsAt - avatarCooldownNow)
    : 0;
  const isAvatarCooldownActive = avatarCooldownRemainingMs > 0;
  const isAvatarUploadDisabled =
    isAvatarUploading || !currentParticipant;
  let avatarStatusMessage: string | null = null;

  if (isAvatarUploading) {
    avatarStatusMessage = 'Uploading avatar...';
  } else if (avatarUploadError) {
    avatarStatusMessage = avatarUploadError;
  } else if (showAvatarCooldownNotice && isAvatarCooldownActive) {
    avatarStatusMessage = `Change avatar in ${formatCooldownDuration(avatarCooldownRemainingMs)}`;
  }

  useEffect(() => {
    if (!avatarCooldownEndsAt) return;

    const intervalId = window.setInterval(() => {
      setAvatarCooldownNow(Date.now());
    }, 1000);

    const timeoutId = window.setTimeout(() => {
      setAvatarCooldownEndsAt(null);
      setAvatarCooldownNow(Date.now());
      setShowAvatarCooldownNotice(false);
    }, Math.max(0, avatarCooldownEndsAt - Date.now()));

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [avatarCooldownEndsAt]);

  useEffect(() => {
    if (!showAvatarCooldownNotice) return;

    const timeoutId = window.setTimeout(() => {
      setShowAvatarCooldownNotice(false);
    }, LOBBY_AVATAR_COOLDOWN_NOTICE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showAvatarCooldownNotice]);

  const handleLobbyExit = useCallback(
    (message: string | null) => {
      if (lobbyExitHandledRef.current) return false;

      lobbyExitHandledRef.current = true;

      if (message) {
        alert(message);
      }

      router.push('/');
      return true;
    },
    [router]
  );

  const syncLobbyState = useCallback(
    async (sessionId: string, userId: string) => {
      const result = await refreshLobbyState(sessionId, userId);

      if (!result.liveSession) {
        handleLobbyExit(getLobbyClosedMessage(currentSessionCleanupAt));
        return null;
      }

      if (result.liveSession.phase === 'active') {
        if (lobbyExitHandledRef.current) return null;

        lobbyExitHandledRef.current = true;
        router.push(`/game/${result.liveSession.code}`);
        return null;
      }

      setSession(result.liveSession);
      setParticipants(result.participants);

      if (hasConfiguredNickname(result.me)) {
        setHasAttemptedReadyWithoutNickname(false);
      }

      if (result.participants.every(hasConfiguredNickname)) {
        setHasAttemptedStartWithoutNicknames(false);
      }

      if (result.participants.length >= LOBBY_MIN_PARTICIPANTS) {
        setHasAttemptedStartWithoutEnoughPlayers(false);
      }

      if (
        result.participants.length > 0 &&
        result.participants.every((participant) => participant.is_ready)
      ) {
        setHasAttemptedStartWithoutAllReady(false);
      }

      return result;
    },
    [currentSessionCleanupAt, handleLobbyExit, router]
  );

  const bootstrapLobby = useCallback(async () => {
    await Promise.resolve();
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

      if (isLobbyTimeoutExpired(liveSession.cleanup_at)) {
        if (lobbyExitHandledRef.current) return;

        lobbyExitHandledRef.current = true;
        await disbandLobby(liveSession.id);
        alert(LOBBY_TIMEOUT_MESSAGE);
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
    const bootstrapTimeoutId = window.setTimeout(() => {
      void bootstrapLobby();
    }, 0);

    return () => {
      window.clearTimeout(bootstrapTimeoutId);
    };
  }, [bootstrapLobby]);

  const handleLobbyTimeout = useCallback(async () => {
    if (!currentSessionId || currentSessionPhase !== 'lobby' || lobbyExitHandledRef.current) {
      return;
    }

    lobbyExitHandledRef.current = true;

    try {
      await disbandLobby(currentSessionId);
    } catch (error) {
      console.error(error);
    } finally {
      alert(LOBBY_TIMEOUT_MESSAGE);
      router.push('/');
    }
  }, [currentSessionId, currentSessionPhase, router]);

  const handleParticipantsChange = useCallback(async () => {
    if (!currentSessionId || !currentUserId) return;
    try {
      await syncLobbyState(currentSessionId, currentUserId);
    } catch (error) {
      console.error(error);
    }
  }, [currentSessionId, currentUserId, syncLobbyState]);

  const handleSessionChange = useCallback(async () => {
    if (!currentSessionId || !currentUserId) return;
    try {
      await syncLobbyState(currentSessionId, currentUserId);
    } catch (error) {
      console.error(error);
    }
  }, [currentSessionId, currentUserId, syncLobbyState]);

  useLobbyRealtime({
    sessionId: currentSessionId,
    enabled: !!currentSessionId && !!currentUserId,
    onParticipantsChange: handleParticipantsChange,
    onSessionChange: handleSessionChange
  });

  const handleCopyCode = useCallback(async () => {
    if (!currentSessionCode) return;

    await navigator.clipboard.writeText(currentSessionCode);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }, [currentSessionCode]);

  const handleToggleReady = useCallback(async () => {
    if (!currentParticipant) return;
    if (!hasConfiguredNickname(currentParticipant)) {
      setHasAttemptedReadyWithoutNickname(true);
      return;
    }

    try {
      await updateParticipantReady(currentParticipant.id, !currentParticipant.is_ready);
    } catch (error) {
      console.error(error);
    }
  }, [currentParticipant]);

  const handleChangeNickname = useCallback(() => {
    if (!currentParticipant) return;

    setNicknameDraft(currentParticipant.display_name ?? '');
    setNicknameError(null);
    setIsNicknameModalOpen(true);
  }, [currentParticipant]);

  const handleCloseNicknameModal = useCallback(() => {
    if (isSavingNickname) return;

    setIsNicknameModalOpen(false);
    setNicknameError(null);
  }, [isSavingNickname]);

  const handleNicknameDraftChange = useCallback((value: string) => {
    setNicknameDraft(value);
    setNicknameError(null);
  }, []);

  const handleSaveNickname = useCallback(async () => {
    if (!currentParticipant || isSavingNickname) return;

    const nextNickname = nicknameDraft.trim();

    if (!nextNickname) {
      setNicknameError('Nickname cannot be empty');
      return;
    }

    setIsSavingNickname(true);
    setNicknameError(null);

    try {
      await updateParticipantNickname(currentParticipant.id, nextNickname);
      setParticipants((currentParticipants) =>
        currentParticipants.map((participant) =>
          participant.id === currentParticipant.id
            ? { ...participant, display_name: nextNickname }
            : participant
        )
      );
      setHasAttemptedReadyWithoutNickname(false);
      setIsNicknameModalOpen(false);
    } catch (error) {
      console.error(error);
      setNicknameError('Could not save nickname');
    } finally {
      setIsSavingNickname(false);
    }
  }, [currentParticipant, isSavingNickname, nicknameDraft]);

  const handleAvatarChangeRequest = useCallback(() => {
    if (!currentParticipant || isAvatarUploading) return false;

    const now = Date.now();
    const isCooldownBlocked =
      avatarCooldownEndsAt &&
      avatarCooldownEndsAt > now &&
      !canBypassAvatarCooldownOnce;

    if (isCooldownBlocked) {
      setAvatarCooldownNow(now);
      setAvatarUploadError(null);
      setShowAvatarCooldownNotice(true);
      return false;
    }

    setAvatarUploadError(null);
    setShowAvatarCooldownNotice(false);
    return true;
  }, [
    avatarCooldownEndsAt,
    canBypassAvatarCooldownOnce,
    currentParticipant,
    isAvatarUploading
  ]);

  const handleAvatarFileChange = useCallback(
    async (file: File | null) => {
      if (!file || !currentParticipant || !currentUserId || isAvatarUploading) return;

      const now = Date.now();
      const isCooldownBlocked =
        avatarCooldownEndsAt &&
        avatarCooldownEndsAt > now &&
        !canBypassAvatarCooldownOnce;

      if (isCooldownBlocked) {
        setAvatarCooldownNow(now);
        setAvatarUploadError(null);
        setShowAvatarCooldownNotice(true);
        return;
      }

      if (!LOBBY_AVATAR_ALLOWED_MIME_TYPES.includes(file.type)) {
        setAvatarUploadError('Only JPG, PNG, WEBP, or GIF images are allowed');
        return;
      }

      if (file.size > LOBBY_AVATAR_MAX_FILE_SIZE_BYTES) {
        setAvatarUploadError('Avatar must be 5 MB or smaller');
        return;
      }

      setIsAvatarUploading(true);
      setAvatarUploadError(null);
      setShowAvatarCooldownNotice(false);

      try {
        const avatarUrl = await uploadParticipantAvatar(
          currentParticipant.id,
          currentUserId,
          file
        );

        setParticipants((currentParticipants) =>
          currentParticipants.map((participant) =>
            participant.id === currentParticipant.id
              ? { ...participant, avatar_url: avatarUrl }
              : participant
          )
        );
        setAvatarCooldownEndsAt(Date.now() + LOBBY_AVATAR_UPDATE_COOLDOWN_MS);
        setCanBypassAvatarCooldownOnce(false);
        setShowAvatarCooldownNotice(false);
      } catch (error) {
        console.error(error);
        setAvatarUploadError('Could not upload avatar');
      } finally {
        setIsAvatarUploading(false);
      }
    },
    [
      avatarCooldownEndsAt,
      canBypassAvatarCooldownOnce,
      currentParticipant,
      currentUserId,
      isAvatarUploading
    ]
  );

  const handleSelectCharacter = useCallback(
    async (character: Character) => {
      if (!currentParticipant) return;

      try {
        await selectParticipantCharacter(currentParticipant.id, character);
        setParticipants((currentParticipants) =>
          currentParticipants.map((participant) =>
            participant.id === currentParticipant.id
              ? {
                ...participant,
                selected_character_id: character.id,
                display_name: character.name,
                avatar_url: character.avatar_url
              }
              : participant
          )
        );
        setAvatarUploadError(null);
        setShowAvatarCooldownNotice(false);
        setCanBypassAvatarCooldownOnce(true);
        setHasAttemptedReadyWithoutNickname(false);
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

  const handleRequestLobbyExit = useCallback(() => {
    if (!currentParticipant) return;

    setIsLobbyExitModalOpen(true);
  }, [currentParticipant]);

  const handleCloseLobbyExitModal = useCallback(() => {
    if (isLobbyExitSubmitting) return;

    setIsLobbyExitModalOpen(false);
  }, [isLobbyExitSubmitting]);

  const handleConfirmLobbyExit = useCallback(async () => {
    if (!currentParticipant || isLobbyExitSubmitting) return;
    if (isMaster && !session) return;

    setIsLobbyExitSubmitting(true);
    lobbyExitHandledRef.current = true;

    try {
      if (isMaster && session) {
        await disbandLobby(session.id);
      } else {
        await leaveLobby(currentParticipant.id);
      }

      router.push('/');
    } catch (error) {
      lobbyExitHandledRef.current = false;
      setIsLobbyExitSubmitting(false);
      console.error(error);
    }
  }, [currentParticipant, isLobbyExitSubmitting, isMaster, router, session]);

  const handleStartGame = useCallback(async () => {
    if (!session || !currentParticipant || !isMaster) return;
    if (!hasEnoughParticipants) {
      setHasAttemptedStartWithoutEnoughPlayers(true);
      return;
    }

    if (participants.some((participant) => !hasConfiguredNickname(participant))) {
      setHasAttemptedStartWithoutNicknames(true);
      return;
    }

    if (!allParticipantsReady) {
      setHasAttemptedStartWithoutAllReady(true);
      return;
    }

    try {
      lobbyExitHandledRef.current = true;
      await startLobbyGame(session.id);
      router.push(`/game/${session.code}`);
    } catch (error) {
      lobbyExitHandledRef.current = false;
      console.error(error);
    }
  }, [
    allParticipantsReady,
    currentParticipant,
    hasEnoughParticipants,
    isMaster,
    participants,
    router,
    session
  ]);

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
    canToggleReady,
    readyFeedbackMessage,
    startGameMinPlayersFeedbackMessage,
    startGameNicknameFeedbackMessage,
    startGameReadyFeedbackMessage,
    isNicknameModalOpen,
    nicknameDraft,
    nicknameError,
    isSavingNickname,
    isAvatarUploading,
    isAvatarUploadDisabled,
    avatarStatusMessage,
    isLobbyExitModalOpen,
    isLobbyExitSubmitting,
    lobbyCleanupAt: currentSessionCleanupAt,
    emptyCharacterMessage: EMPTY_CHARACTER_MESSAGE,
    emptyWorldMessage: EMPTY_WORLD_MESSAGE,
    setActiveSlide,
    onTouchStart,
    onTouchEnd,
    handleCopyCode,
    handleToggleReady,
    handleChangeNickname,
    handleCloseNicknameModal,
    handleNicknameDraftChange,
    handleSaveNickname,
    handleAvatarChangeRequest,
    handleAvatarFileChange,
    handleSelectCharacter,
    handleSelectWorld,
    handleRequestLobbyExit,
    handleCloseLobbyExitModal,
    handleConfirmLobbyExit,
    handleLobbyTimeout,
    handleStartGame
  };
}
