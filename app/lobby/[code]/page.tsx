import LobbyScreen from '@/components/lobby/LobbyScreen';
import ScaledPageViewport from '@/components/layout/ScaledPageViewport';

export default async function LobbyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return <ScaledPageViewport fluidWidth><LobbyScreen code={code} /></ScaledPageViewport>;
}
