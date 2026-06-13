import type { SessionParticipant } from '@/features/lobby/types';
import {
  createDefaultCharacterCollections,
  createInGameCharacterPlaceholder,
} from '@/features/characters/defaults';

export function createCharacterPlaceholder(participant: SessionParticipant) {
  const inGameCharacter = createInGameCharacterPlaceholder(participant);

  return {
    id: null,
    owner_user_id: participant.user_id,
    name: inGameCharacter.name,
    description: inGameCharacter.description,
    avatar_url: inGameCharacter.avatar_url,
    is_placeholder: true,
    in_game_character: inGameCharacter,
    ...createDefaultCharacterCollections()
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
