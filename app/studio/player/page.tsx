'use client';

import PlayerStudioContent from '@/components/studio/player/PlayerStudioContent';
import StudioWorkspace from '@/components/studio/StudioWorkspace';
import { PLAYER_STUDIO_TABS } from '@/features/studio/navigation';

export default function PlayerStudioPage() {
  return <StudioWorkspace role="player" entityLabel="character" tabs={PLAYER_STUDIO_TABS} renderContent={(tab, entity, onEntityChange, registerDraftExitActions) => <PlayerStudioContent key={entity.id} tab={tab} entity={entity} onEntityChange={onEntityChange} registerDraftExitActions={registerDraftExitActions} />} />;
}
