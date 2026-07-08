'use client';

import { useMemo, useState } from 'react';

import GameViewport from '@/components/game/GameViewport';
import type { PartyCheckState } from '@/features/tablet/master/party/types';
import type { SceneImageItem } from '@/features/tablet/master/scene/types';
import { mockMaster, mockPlayers } from '@/lib/game/mockParticipants';

const previewTableImage: SceneImageItem = {
  id: 'preview-table-image',
  title: 'Preview scene image',
  imageUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 900'%3E%3Cdefs%3E%3CradialGradient id='sky' cx='50%25' cy='35%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%23f8e6b0'/%3E%3Cstop offset='42%25' stop-color='%23cf7563'/%3E%3Cstop offset='100%25' stop-color='%23273a61'/%3E%3C/radialGradient%3E%3ClinearGradient id='ground' x1='0%25' x2='100%25' y1='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231d293f'/%3E%3Cstop offset='100%25' stop-color='%23080d19'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='900' height='900' fill='url(%23sky)'/%3E%3Ccircle cx='690' cy='205' r='92' fill='%23ffe5a7' opacity='.86'/%3E%3Cpath d='M0 585 C135 505 245 570 372 505 C512 435 625 520 900 405 L900 900 L0 900 Z' fill='url(%23ground)'/%3E%3Cpath d='M146 900 C232 644 308 520 405 423 C439 388 492 390 523 429 C612 540 685 657 759 900 Z' fill='%2310182b' opacity='.88'/%3E%3Cpath d='M397 433 C401 382 423 334 452 298 C474 334 500 386 520 437 C487 422 432 418 397 433 Z' fill='%23e4d29a'/%3E%3Cpath d='M221 666 C305 610 394 599 474 632 C541 660 608 663 705 608' fill='none' stroke='%23f0c96f' stroke-width='14' stroke-linecap='round' opacity='.45'/%3E%3Cpath d='M114 747 C259 701 348 721 455 759 C562 798 668 790 814 715' fill='none' stroke='%23ffffff' stroke-width='8' stroke-linecap='round' opacity='.18'/%3E%3C/svg%3E",
  isActive: true,
  sortOrder: 0,
};

export default function GamePreviewPage() {
  const [playerCount, setPlayerCount] = useState(5);
  const [showPartyOverlay, setShowPartyOverlay] = useState(false);
  const [showTableImage, setShowTableImage] = useState(false);
  const [viewerParticipantId, setViewerParticipantId] = useState(mockMaster.id);
  const [previewPartyCheckOverride, setPreviewPartyCheckOverride] =
    useState<PartyCheckState | null>(null);

  const visiblePlayers = useMemo(() => {
    return mockPlayers.slice(0, playerCount);
  }, [playerCount]);

  const previewParticipants = useMemo(
    () => [mockMaster, ...visiblePlayers],
    [visiblePlayers]
  );

  const currentParticipant =
    previewParticipants.find(
      (participant) => participant.id === viewerParticipantId
    ) ?? mockMaster;

  const generatedPartyCheck = useMemo<PartyCheckState | null>(() => {
    if (!showPartyOverlay) return null;

    return {
      id: 'preview-party-check',
      sessionId: 'preview-session',
      inGameWorldId: 'preview-world',
      mode: 'individual',
      targets: previewParticipants.map((participant, index) => ({
        participantId: participant.id,
        userId: participant.userId,
        inGameCharacterId:
          participant.role === 'master'
            ? null
            : `preview-character-${participant.id}`,
        displayName: participant.displayName,
        avatarUrl: participant.avatarUrl ?? null,
        role: participant.role,
        thresholds: index % 2 === 0 ? [3, 5] : [2, 4, 6],
        advantage: index % 3 === 0 ? 1 : 0,
        disadvantage: index % 3 === 1 ? 1 : 0,
        roll: {
          attempts: [],
          selectedAttemptId: null,
          inspirationSuccesses: 0,
          freeBonusSuccesses: 0,
        },
      })),
      groupThresholds: [],
      tieWinnerParticipantId: null,
      createdAt: 0,
      updatedAt: 0,
    };
  }, [previewParticipants, showPartyOverlay]);

  const previewPartyCheck = previewPartyCheckOverride ?? generatedPartyCheck;

  return (
    <>
      <main className="px-4 py-4 sm:px-6 md:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="font-montserrat text-sm text-white/80">
            Players:
          </label>

          <select
            value={playerCount}
            onChange={(event) => {
              setPlayerCount(Number(event.target.value));
              setPreviewPartyCheckOverride(null);
            }}
            className="rounded-full bg-[#182135] px-4 py-2 text-white outline-none"
          >
            {Array.from({ length: 9 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <label className="font-montserrat text-sm text-white/80">
            Viewer:
          </label>

          <select
            value={currentParticipant.id}
            onChange={(event) => setViewerParticipantId(event.target.value)}
            className="rounded-full bg-[#182135] px-4 py-2 text-white outline-none"
          >
            {previewParticipants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.displayName}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 rounded-full bg-[#182135] px-4 py-2 font-montserrat text-sm text-white/80">
            <input
              type="checkbox"
              checked={showPartyOverlay}
              onChange={(event) => {
                setShowPartyOverlay(event.target.checked);
                setPreviewPartyCheckOverride(null);
              }}
            />
            Party overlay
          </label>

          <label className="flex items-center gap-2 rounded-full bg-[#182135] px-4 py-2 font-montserrat text-sm text-white/80">
            <input
              type="checkbox"
              checked={showTableImage}
              onChange={(event) => setShowTableImage(event.target.checked)}
            />
            Table image
          </label>
        </div>

        <GameViewport
          sessionId="preview-session"
          master={mockMaster}
          currentParticipant={currentParticipant}
          players={visiblePlayers}
          tableImages={showTableImage ? [previewTableImage] : []}
          partyCheck={previewPartyCheck}
          persistPartyChanges={false}
          onPartyCheckChange={setPreviewPartyCheckOverride}
          onPartyMessage={() => undefined}
          onTableImageClick={() => undefined}
        />
      </main>
    </>
  );
}
