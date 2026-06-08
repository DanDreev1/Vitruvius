'use client';

import { useMemo, useState } from 'react';

import GameViewport from '@/components/game/GameViewport';
import { mockMaster, mockPlayers } from '@/lib/game/mockParticipants';

export default function GamePreviewPage() {
  const [playerCount, setPlayerCount] = useState(5);

  const visiblePlayers = useMemo(() => {
    return mockPlayers.slice(0, playerCount);
  }, [playerCount]);

  return (
    <>
      <main className="px-4 py-4 sm:px-6 md:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="font-montserrat text-sm text-white/80">
            Players:
          </label>

          <select
            value={playerCount}
            onChange={(event) => setPlayerCount(Number(event.target.value))}
            className="rounded-full bg-[#182135] px-4 py-2 text-white outline-none"
          >
            {Array.from({ length: 9 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <GameViewport master={mockMaster} players={visiblePlayers} />
      </main>
    </>
  );
}