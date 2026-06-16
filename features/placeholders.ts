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

export function createInGameWorldPlaceholder(
  liveSessionId: string | null = null
) {
  return {
    id: null,
    live_session_id: liveSessionId,
    source_world_id: null,
    name: 'Untitled world',
    avatar_url: null,
    is_placeholder: true
  };
}
