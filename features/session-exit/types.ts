export type SessionExitRole = 'master' | 'player';
export type SessionExitSaveMode = 'new' | 'current';

export type PendingSessionExit = {
  participantId: string;
  sessionId: string;
  sessionCode: string;
  role: SessionExitRole;
  cleanupAt: string;
  inGameCharacterId: string | null;
  sourceCharacterId: string | null;
  inGameWorldId: string | null;
  sourceWorldId: string | null;
};

export type SessionExitResponse = {
  pending: PendingSessionExit | null;
  isAnonymous: boolean;
};

