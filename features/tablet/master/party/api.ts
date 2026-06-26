import { supabase } from '@/lib/supabaseClient';

import type {
  PartyAttribute,
  PartyAudienceTarget,
  PartyCheckMode,
  PartyCheckState,
  PartyParameter,
  PartyRollMessage,
} from './types';

export const PARTY_CHECK_CHANGED_EVENT = 'party-check-changed';
export const PARTY_ROLL_MESSAGE_EVENT = 'party-roll-message';

export function getPartyCheckRealtimeChannelName(sessionId: string) {
  return `party-checks-${sessionId}`;
}

export function getPartyRollMessagesRealtimeChannelName(sessionId: string) {
  return `party-roll-messages-${sessionId}`;
}

async function sendBroadcast(
  channelName: string,
  event: string,
  payload: Record<string, unknown>
) {
  const channel = supabase.channel(channelName);

  try {
    const isSubscribed = await new Promise<boolean>((resolve) => {
      const timeoutId = window.setTimeout(() => resolve(false), 3000);

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          window.clearTimeout(timeoutId);
          resolve(true);
        }
      });
    });

    if (!isSubscribed) {
      console.warn(`Realtime channel ${channelName} was not ready for broadcast.`);
      return;
    }

    await channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  } finally {
    void supabase.removeChannel(channel);
  }
}

export async function broadcastPartyCheckChanged(
  sessionId: string,
  state: PartyCheckState | null
) {
  await sendBroadcast(
    getPartyCheckRealtimeChannelName(sessionId),
    PARTY_CHECK_CHANGED_EVENT,
    {
      sessionId,
      state,
      changedAt: Date.now(),
    }
  );
}

export async function broadcastPartyRollMessage(message: PartyRollMessage) {
  await sendBroadcast(
    getPartyRollMessagesRealtimeChannelName(message.sessionId),
    PARTY_ROLL_MESSAGE_EVENT,
    message as unknown as Record<string, unknown>
  );
}

export async function getPartyAudience(
  sessionId: string
): Promise<PartyAudienceTarget[]> {
  const { data: participants, error: participantsError } = await supabase
    .from('session_participants')
    .select('id, user_id, display_name, avatar_url, role, joined_at')
    .eq('session_id', sessionId)
    .order('joined_at', { ascending: true });

  if (participantsError) {
    throw new Error(`Failed to load party audience: ${participantsError.message}`);
  }

  const participantIds = (participants ?? []).map((participant) => participant.id as string);

  const { data: characters, error: charactersError } = participantIds.length
    ? await supabase
        .from('in_game_characters')
        .select('id, participant_id')
        .eq('session_id', sessionId)
        .in('participant_id', participantIds)
    : { data: [], error: null };

  if (charactersError) {
    throw new Error(`Failed to load party characters: ${charactersError.message}`);
  }

  const characterIdByParticipantId = new Map(
    (characters ?? []).map((character) => [
      character.participant_id as string,
      character.id as string,
    ])
  );

  return (participants ?? []).map((participant) => {
    const role = participant.role === 'master' ? 'master' : 'player';

    return {
      participantId: participant.id as string,
      userId: participant.user_id as string,
      inGameCharacterId: characterIdByParticipantId.get(participant.id as string) ?? null,
      displayName:
        (participant.display_name as string | null) ??
        (role === 'master' ? 'Master' : 'Player'),
      avatarUrl: (participant.avatar_url as string | null) ?? null,
      role,
    };
  });
}

export async function getPartyCharacterParameters(
  inGameCharacterId: string
): Promise<PartyParameter[]> {
  const { data, error } = await supabase
    .from('in_game_character_parameters')
    .select('id, parameter_key, label, icon_key, current_value, max_value, sort_order')
    .eq('in_game_character_id', inGameCharacterId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to load party parameters: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    key: row.parameter_key as string,
    label: row.label as string,
    iconKey: row.icon_key as string,
    currentValue: Number(row.current_value ?? 0),
    maxValue: row.max_value === null ? null : Number(row.max_value),
    sortOrder: Number(row.sort_order ?? 0),
  }));
}

export async function savePartyCharacterParameters(
  inGameCharacterId: string,
  parameters: Array<{ id: string; currentValue: number }>
) {
  await Promise.all(
    parameters.map((parameter) =>
      supabase
        .from('in_game_character_parameters')
        .update({ current_value: parameter.currentValue })
        .eq('id', parameter.id)
        .eq('in_game_character_id', inGameCharacterId)
        .then(({ error }) => {
          if (error) {
            throw new Error(`Failed to save party parameter: ${error.message}`);
          }
        })
    )
  );
}

export async function getPartyCharacterAttributes(
  inGameCharacterId: string
): Promise<PartyAttribute[]> {
  const { data, error } = await supabase
    .from('in_game_character_attributes')
    .select('id, attribute_key, label, icon_key, value, sort_order')
    .eq('in_game_character_id', inGameCharacterId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to load party attributes: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    key: row.attribute_key as string,
    label: row.label as string,
    iconKey: row.icon_key as string,
    value: Number(row.value ?? 0),
    sortOrder: Number(row.sort_order ?? 0),
  }));
}

export async function getPartyAttributeTemplates(
  sessionId: string
): Promise<PartyAttribute[]> {
  const { data: character, error: characterError } = await supabase
    .from('in_game_characters')
    .select('id')
    .eq('session_id', sessionId)
    .not('participant_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (characterError) {
    throw new Error(`Failed to load party attribute template character: ${characterError.message}`);
  }

  if (!character?.id) {
    return [];
  }

  return getPartyCharacterAttributes(character.id as string);
}

async function getInGameWorldIdBySessionId(sessionId: string) {
  const { data, error } = await supabase
    .from('in_game_worlds')
    .select('id')
    .eq('live_session_id', sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load in-game world for party: ${error.message}`);
  }

  return (data?.id as string | undefined) ?? null;
}

async function getMasterParticipantId(sessionId: string) {
  const { data, error } = await supabase
    .from('session_participants')
    .select('id')
    .eq('session_id', sessionId)
    .eq('role', 'master')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load party master participant: ${error.message}`);
  }

  return (data?.id as string | undefined) ?? null;
}

function isPartyCheckState(value: unknown): value is PartyCheckState {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as PartyCheckState).id === 'string' &&
    Array.isArray((value as PartyCheckState).targets)
  );
}

function getRequestedDifficulty({
  mode,
  targets,
  groupThresholds,
}: {
  mode: PartyCheckMode;
  targets: Array<{ thresholds: number[] }>;
  groupThresholds: number[];
}) {
  if (mode === 'conflict') return 6;

  const thresholds = mode === 'group'
    ? groupThresholds
    : targets.flatMap((target) => target.thresholds);

  return Math.max(1, ...thresholds);
}

async function replacePartyTargetRows(state: PartyCheckState) {
  const { error: deleteError } = await supabase
    .from('in_game_worlds_party_targets')
    .delete()
    .eq('in_game_world_party_id', state.id);

  if (deleteError) {
    throw new Error(`Failed to replace party targets: ${deleteError.message}`);
  }

  const rows = state.targets.flatMap((target) => {
    if (!target.inGameCharacterId) {
      return [];
    }

    return [
      {
        in_game_world_party_id: state.id,
        in_game_character_id: target.inGameCharacterId,
        participant_id: target.participantId,
        roll_result: target.roll.selectedAttemptId
          ? target.roll.attempts.find(
              (attempt) => attempt.id === target.roll.selectedAttemptId
            )?.successes ?? null
          : null,
        is_completed: Boolean(target.roll.selectedAttemptId),
        state: target,
      },
    ];
  });

  if (!rows.length) return;

  const { error: insertError } = await supabase
    .from('in_game_worlds_party_targets')
    .insert(rows);

  if (insertError) {
    throw new Error(`Failed to save party targets: ${insertError.message}`);
  }
}

export async function getActivePartyCheck(
  sessionId: string
): Promise<PartyCheckState | null> {
  const inGameWorldId = await getInGameWorldIdBySessionId(sessionId);

  if (!inGameWorldId) {
    return null;
  }

  const { data, error } = await supabase
    .from('in_game_worlds_party')
    .select('id, state')
    .eq('in_game_world_id', inGameWorldId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load active party check: ${error.message}`);
  }

  return isPartyCheckState(data?.state) ? data.state : null;
}

export async function createPartyCheck({
  sessionId,
  inGameWorldId,
  mode,
  targets,
  groupThresholds,
}: {
  sessionId: string;
  inGameWorldId: string;
  mode: PartyCheckMode;
  targets: Array<{
    audience: PartyAudienceTarget;
    thresholds: number[];
    advantage: number;
    disadvantage: number;
  }>;
  groupThresholds: number[];
}) {
  const existing = await getActivePartyCheck(sessionId);
  if (existing) {
    throw new Error('A party check is already active.');
  }

  const createdByParticipantId = await getMasterParticipantId(sessionId);

  if (!createdByParticipantId) {
    throw new Error('Master participant was not found for party check.');
  }

  const now = Date.now();
  const checkId = crypto.randomUUID();
  const state: PartyCheckState = {
    id: checkId,
    sessionId,
    inGameWorldId,
    mode,
    targets: targets.map((target) => ({
      ...target.audience,
      thresholds: target.thresholds,
      advantage: target.advantage,
      disadvantage: target.disadvantage,
      roll: {
        attempts: [],
        selectedAttemptId: null,
        inspirationSuccesses: 0,
        freeBonusSuccesses: 0,
      },
    })),
    groupThresholds,
    tieWinnerParticipantId: null,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase
    .from('in_game_worlds_party')
    .insert({
      id: checkId,
      in_game_world_id: inGameWorldId,
      requested_difficulty: getRequestedDifficulty({
        mode,
        targets,
        groupThresholds,
      }),
      requested_dice_count: 1,
      is_active: true,
      created_by_participant_id: createdByParticipantId,
      mode,
      state,
    });

  if (error) {
    throw new Error(`Failed to create party check: ${error.message}`);
  }

  await replacePartyTargetRows(state);
  await broadcastPartyCheckChanged(sessionId, state);
  return state;
}

export async function savePartyCheckState(state: PartyCheckState) {
  const nextState = {
    ...state,
    updatedAt: Date.now(),
  };

  const { error } = await supabase
    .from('in_game_worlds_party')
    .update({
      state: nextState,
    })
    .eq('id', state.id)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to save party check: ${error.message}`);
  }

  await broadcastPartyCheckChanged(state.sessionId, nextState);
  return nextState;
}

export async function clearPartyCheck(state: PartyCheckState) {
  const { error } = await supabase
    .from('in_game_worlds_party')
    .delete()
    .eq('id', state.id);

  if (error) {
    throw new Error(`Failed to clear party check: ${error.message}`);
  }

  await broadcastPartyCheckChanged(state.sessionId, null);
}

export async function acceptPartyCheck(state: PartyCheckState) {
  const inspirationUpdates = state.targets
    .filter((target) => target.inGameCharacterId && target.roll.inspirationSuccesses > 0)
    .map(async (target) => {
      const parameters = await getPartyCharacterParameters(target.inGameCharacterId as string);
      const inspiration = parameters.find((parameter) =>
        parameter.key.toLowerCase().includes('inspiration')
      );

      if (!inspiration) return;

      const nextValue = Math.max(
        0,
        inspiration.currentValue - target.roll.inspirationSuccesses
      );

      await savePartyCharacterParameters(target.inGameCharacterId as string, [
        {
          id: inspiration.id,
          currentValue: nextValue,
        },
      ]);
    });

  await Promise.all(inspirationUpdates);
  await clearPartyCheck(state);
}

export function getRollAttemptSuccesses(dice: number[]) {
  return dice.reduce((total, side) => {
    if (side === 6) return total + 2;
    if (side >= 4) return total + 1;
    return total;
  }, 0);
}

export function rollPartyDice(diceCount: number) {
  return Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
}
