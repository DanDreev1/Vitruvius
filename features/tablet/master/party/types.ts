export type PartyCheckMode = 'individual' | 'group' | 'conflict';

export type PartyParticipantRole = 'master' | 'player';

export type PartyDecisionAction = 'accept' | 'reject' | 'reroll';

export type PartyAudienceTarget = {
  participantId: string;
  userId: string;
  inGameCharacterId: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: PartyParticipantRole;
};

export type PartyParameter = {
  id: string;
  key: string;
  label: string;
  iconKey: string;
  currentValue: number;
  maxValue: number | null;
  sortOrder: number;
};

export type PartyAttribute = {
  id: string;
  key: string;
  label: string;
  iconKey: string;
  value: number;
  sortOrder: number;
};

export type PartyRollAttempt = {
  id: string;
  diceCount: number;
  attributeKey: string;
  attributeLabel: string;
  dice: number[];
  successes: number;
  rolledAt: number;
};

export type PartyRollState = {
  attempts: PartyRollAttempt[];
  selectedAttemptId: string | null;
  inspirationSuccesses: number;
  freeBonusSuccesses: number;
};

export type PartyCheckTarget = PartyAudienceTarget & {
  thresholds: number[];
  advantage: number;
  disadvantage: number;
  roll: PartyRollState;
};

export type PartyCheckState = {
  id: string;
  sessionId: string;
  inGameWorldId: string;
  mode: PartyCheckMode;
  targets: PartyCheckTarget[];
  groupThresholds: number[];
  tieWinnerParticipantId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type PartyCheckRecord = {
  id: string;
  in_game_world_id: string;
  requested_difficulty: number;
  requested_dice_count: number;
  is_active: boolean;
  created_by_participant_id: string;
  state: PartyCheckState;
  created_at: string;
  updated_at: string;
};

export type PartyRollMessageType =
  | 'roll'
  | 'inspiration'
  | 'free_bonus'
  | 'reset_inspiration'
  | 'reset_free_bonus';

export type PartyRollMessage = {
  id: string;
  sessionId: string;
  checkId: string;
  type: PartyRollMessageType;
  participantId: string;
  displayName: string;
  text: string;
  createdAt: number;
};
