import LobbyClient from '@/components/lobby/LobbyClient';
import LobbyScreen from './LobbyScreen';

export default async function LobbyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return <LobbyScreen code={code} />;
}