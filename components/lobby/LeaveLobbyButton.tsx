'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { leaveLobby } from '@/features/lobby/leaveLobby';

type LeaveLobbyButtonProps = {
  sessionId: string;
  isMaster: boolean;
};

export function LeaveLobbyButton({
  sessionId,
  isMaster,
}: LeaveLobbyButtonProps) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLeaveLobby = async () => {
    try {
      setErrorMessage('');
      setIsLeaving(true);

      if (isMaster) {
        const confirmed = window.confirm(
          'If you leave as master, the whole room will be deleted. Continue?'
        );

        if (!confirmed) {
          return;
        }
      }

      await leaveLobby({ sessionId });

      router.push('/');
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to leave lobby.'
      );
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleLeaveLobby}
        disabled={isLeaving}
        className="btn-primary"
      >
        {isLeaving
          ? isMaster
            ? 'Deleting room...'
            : 'Leaving...'
          : isMaster
          ? 'Delete Room'
          : 'Leave Lobby'}
      </button>

      {errorMessage ? (
        <p className="text-center font-montserrat text-[14px] font-semibold text-[#FF7A7A]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}