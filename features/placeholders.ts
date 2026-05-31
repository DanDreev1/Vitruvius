import type { SessionParticipant } from '@/features/lobby/types';

export function createCharacterPlaceholder(participant: SessionParticipant) {
  return {
    id: null,
    owner_user_id: participant.user_id,
    name: participant.display_name || 'Unnamed adventurer',
    description: 'Default character placeholder for the first version of the game.',
    avatar_url: participant.avatar_url || null,
    is_placeholder: true
  };
}

export function createWorldPlaceholder(masterParticipant: SessionParticipant | null) {
  return {
    id: null,
    owner_user_id: masterParticipant?.user_id ?? null,
    title: 'Untitled world',
    description:
      'Default world placeholder for the first version of the game. NPCs, items and images can be configured later.',
    cover_url: null,
    is_placeholder: true
  };
}