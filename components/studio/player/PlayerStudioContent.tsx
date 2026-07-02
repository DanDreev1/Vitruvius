import StudioPlaceholder from '../StudioPlaceholder';
import type { PlayerStudioTab } from '@/features/studio/types';

export default function PlayerStudioContent({ tab }: { tab: PlayerStudioTab }) {
  const labels: Record<PlayerStudioTab, string> = { character: 'Character', skills: 'Skills', backpack: 'Backpack', library: 'Library', relationships: 'Relationships', notes: 'Notes', settings: 'Character settings' };
  return <StudioPlaceholder title={labels[tab]} description="This player workspace is isolated from the world editor and ready for permanent character CRUD implementation." />;
}
