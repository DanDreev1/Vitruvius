import type { SessionParticipant } from '@/features/lobby/types';

export const WORLD_PLACEHOLDER_NAME = 'Untitled world';
export const WORLD_PLACEHOLDER_AVATAR_URL: string | null = null;

export type InGameWorldPlaceholder = {
  live_session_id: string;
  source_world_id: string | null;
  name: string;
  avatar_url: string | null;
};

type InGameWorldPlaceholderParticipant = Pick<SessionParticipant, 'session_id'>;

export function createInGameWorldPlaceholder(
  participant: InGameWorldPlaceholderParticipant
): InGameWorldPlaceholder {
  return {
    live_session_id: participant.session_id,
    source_world_id: null,
    name: WORLD_PLACEHOLDER_NAME,
    avatar_url: WORLD_PLACEHOLDER_AVATAR_URL,
  };
}