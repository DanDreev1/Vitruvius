'use client';

import MasterStudioContent from '@/components/studio/master/MasterStudioContent';
import StudioWorkspace from '@/components/studio/StudioWorkspace';
import { MASTER_STUDIO_TABS } from '@/features/studio/navigation';

export default function MasterStudioPage() {
  return <StudioWorkspace role="master" entityLabel="world" tabs={MASTER_STUDIO_TABS} renderContent={(tab, entity, onEntityChange) => <MasterStudioContent tab={tab} worldId={entity.id} onWorldUpdated={onEntityChange} />} />;
}
