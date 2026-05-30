'use client';

import Image from 'next/image';
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

      <main className="flex min-h-[calc(100dvh-56px)] items-center justify-center px-5 py-8 sm:min-h-[calc(100dvh-68px)] sm:px-6 sm:py-10 md:min-h-[calc(100dvh-86px)] md:px-10 md:py-12">
        <section className="flex w-full max-w-[520px] flex-col items-center sm:max-w-[560px] md:max-w-[680px]">
            <Image
            src="/Logo_Icon.png"
            alt="Vitruvius logo"
            width={260}
            height={150}
            priority
            className="mb-4 h-auto w-[100px] sm:mb-5 sm:w-[120px] md:mb-6 md:w-[200px]"
            />

            <h1 className="font-montserrat-alt text-center text-[46px] font-extrabold leading-none tracking-[-0.05em] text-[#D6B25E] sm:text-[58px] md:text-[88px]">
            Vitruvius
            </h1>

            <p className="font-montserrat-alt mt-3 text-center text-[14px] font-extrabold leading-[1.12] text-white sm:mt-4 sm:text-[16px] md:mt-5 md:text-[24px]">
            Gather your party around one digital
            <br />
            table
            </p>

            <div className="mt-7 flex w-full max-w-[460px] flex-col gap-4 sm:mt-8 sm:max-w-[500px] sm:gap-5 md:mt-10 md:max-w-[620px] md:gap-6">
            <button
                type="button"
                onClick={handleCreateRoom}
                disabled={isCreatingRoom || isJoiningRoom}
                className="btn-primary font-montserrat-alt min-h-[56px] px-5 py-4 text-[17px] font-extrabold sm:min-h-[62px] sm:text-[18px] md:min-h-[74px] md:text-[22px]"
            >
                {isCreatingRoom ? 'Creating Room...' : 'Create Room'}
            </button>

            <div className="grid grid-cols-[1fr_96px] gap-2.5 sm:grid-cols-[1fr_110px] sm:gap-3 md:grid-cols-[1fr_150px] md:gap-4">
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
                className="font-montserrat h-[56px] rounded-full bg-white px-5 text-[17px] font-medium text-black outline-none placeholder:text-[#9A9A9A] sm:h-[62px] sm:px-6 sm:text-[18px] md:h-[74px] md:px-8 md:text-[22px]"
                />

                <button
                type="button"
                onClick={handleJoinRoom}
                disabled={isJoiningRoom || isCreatingRoom}
                className="btn-primary font-montserrat-alt min-h-[56px] px-4 py-4 text-[17px] font-extrabold sm:min-h-[62px] sm:text-[18px] md:min-h-[74px] md:text-[22px]"
                >
                {isJoiningRoom ? 'Joining...' : 'Join'}
                </button>
            </div>

            <div className="flex items-center gap-3 md:gap-4">
                <div className="h-px flex-1 bg-white/60" />
                <span className="font-montserrat-alt text-[16px] font-extrabold text-white sm:text-[18px] md:text-[22px]">
                Or
                </span>
                <div className="h-px flex-1 bg-white/60" />
            </div>

            <p className="font-montserrat-alt text-center text-[18px] font-extrabold leading-[1.15] text-white sm:text-[22px] md:text-[32px]">
                Prepare for the game in advance
            </p>

            <button
                type="button"
                onClick={() => router.push('/workshop')}
                disabled={isCreatingRoom || isJoiningRoom}
                className="btn-primary font-montserrat-alt min-h-[56px] px-5 py-4 text-[17px] font-extrabold sm:min-h-[62px] sm:text-[18px] md:min-h-[74px] md:text-[22px]"
            >
                Vitruvian Studio
            </button>

            {errorMessage ? (
                <p className="font-montserrat mt-1 text-center text-[13px] font-semibold text-[#FF7A7A] md:text-[15px]">
                {errorMessage}
                </p>
            ) : null}
            </div>
        </section>
      </main>
    </>
  );
}