'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import Header from '@/components/ui/Header';
import { createRoom } from '@/features/home/createRoom';
import { joinRoomByCode } from '@/features/home/joinRoomByCode';

export default function HomePage() {
  const router = useRouter();

  const [roomCode, setRoomCode] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreateRoom = async () => {
    try {
      setErrorMessage('');
      setIsCreatingRoom(true);

      const result = await createRoom();

      router.push(`/lobby/${result.code}`);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to create room.'
      );
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async () => {
    try {
      setErrorMessage('');

      if (roomCode.length !== 6) {
        setErrorMessage('Room code must contain exactly 6 digits.');
        return;
      }

      setIsJoiningRoom(true);

      const result = await joinRoomByCode(roomCode);

      router.push(`/lobby/${result.code}`);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to join room.'
      );
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleRoomCodeChange = (value: string) => {
    const onlyDigits = value.replace(/\D/g, '').slice(0, 6);
    setRoomCode(onlyDigits);
  };

  return (
    <>
      <Header />

      <main className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-[1440px] flex-col px-4 pb-10 pt-8 min-[480px]:min-h-[calc(100vh-68px)] min-[480px]:px-6 min-[480px]:pt-10 min-[768px]:min-h-[calc(100vh-86px)] min-[768px]:px-10 min-[768px]:pt-14">
        <section className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-[760px]">
            <div className="mb-10 text-center min-[768px]:mb-14">
              <h1
                className="text-[34px] font-extrabold leading-none tracking-[-0.04em] text-[#D6B25E] min-[480px]:text-[48px] min-[768px]:text-[72px]"
                style={{
                  fontFamily:
                    '"Monsteratt Alternatives", "Montserrat Alternates", sans-serif',
                }}
              >
                VITRUVIUS
              </h1>

              <p
                className="mx-auto mt-4 max-w-[560px] text-[14px] font-medium leading-[1.45] text-[#8E929B] min-[480px]:text-[16px] min-[768px]:mt-5 min-[768px]:text-[18px]"
                style={{
                  fontFamily:
                    '"Monsteratt Alternatives", "Montserrat Alternates", sans-serif',
                }}
              >
                Create a room, join your master by code or open the studio.
              </p>
            </div>

            <div className="flex flex-col gap-4 min-[768px]:gap-5">
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={isCreatingRoom || isJoiningRoom}
                className="btn-primary"
              >
                {isCreatingRoom ? 'Creating room...' : 'Create Room'}
              </button>

              <div className="rounded-[26px] bg-[#182135] p-3 min-[480px]:p-4">
                <div className="flex flex-col gap-3 min-[768px]:gap-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={roomCode}
                    onChange={(event) => handleRoomCodeChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleJoinRoom();
                      }
                    }}
                    placeholder="Enter the code"
                    maxLength={6}
                    className="w-full rounded-[18px] border border-white/10 bg-[#0B1020] px-6 py-[25px] text-center text-[20px] font-bold leading-none text-white outline-none transition-colors duration-200 placeholder:text-[#8E929B] focus:border-[#D6B25E]"
                    style={{
                      fontFamily:
                        '"Monsteratt Alternatives", "Montserrat Alternates", sans-serif',
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleJoinRoom}
                    disabled={isJoiningRoom || isCreatingRoom}
                    className="btn-secondary"
                  >
                    {isJoiningRoom ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/workshop')}
                disabled={isCreatingRoom || isJoiningRoom}
                className="btn-primary"
              >
                Vitruvius Studio
              </button>

              {errorMessage ? (
                <p
                  className="mt-2 text-center text-[14px] font-semibold text-[#FF7A7A] min-[768px]:text-[16px]"
                  style={{
                    fontFamily:
                      '"Monsteratt Alternatives", "Montserrat Alternates", sans-serif',
                  }}
                >
                  {errorMessage}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}