"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import Header from "@/components/ui/Header";
import ScaledPageViewport from "@/components/layout/ScaledPageViewport";
import { createRoom } from "@/features/home/createRoom";
import { joinRoomByCode } from "@/features/home/joinRoomByCode";
import { useResumeActiveGame } from "@/features/home/useResumeActiveGame";

export default function HomePage() {
  const t = useTranslations('Home');
  const router = useRouter();

  const [roomCode, setRoomCode] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const getJoinErrorMessage = (error: unknown) => {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Room not found') return t('roomNotFound');
    if (message === 'This room is no longer available') return t('roomUnavailable');
    if (message === 'This game has already started') return t('gameStarted');
    if (message.startsWith('Room code must contain')) return t('invalidCode');
    return t('joinError');
  };

  const {
    isChecking,
    activeGameCode,
    showManualContinue,
    handleContinueToGame,
  } = useResumeActiveGame();

  const handleCreateRoom = async () => {
    try {
      setErrorMessage("");
      setIsCreatingRoom(true);

      const result = await createRoom();
      router.push(`/lobby/${result.code}`);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        t('createError'),
      );
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async () => {
    try {
      setErrorMessage("");

      if (roomCode.length !== 6) {
        setErrorMessage(t('invalidCode'));
        return;
      }

      setIsJoiningRoom(true);

      const result = await joinRoomByCode(roomCode);
      router.push(`/lobby/${result.code}`);
    } catch (error) {
      console.error(error);
      setErrorMessage(getJoinErrorMessage(error));
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleRoomCodeChange = (value: string) => {
    const onlyDigits = value.replace(/\D/g, "").slice(0, 6);
    setRoomCode(onlyDigits);
  };

  if (isChecking) {
    return <ScaledPageViewport>{(
      <main className="flex min-h-[calc(100dvh-86px)] items-center justify-center px-6">
        <div className="text-center">
          <h1 className="font-montserrat-alt text-[28px] font-extrabold text-[#D6B25E]">
            {t('checking')}
          </h1>
        </div>
      </main>
    )}</ScaledPageViewport>;
  }

  if (activeGameCode) {
    return <ScaledPageViewport>{(
      <main className="flex min-h-[calc(100dvh-86px)] items-center justify-center px-6">
        <div className="max-w-[460px] text-center">
          <h1 className="font-montserrat-alt text-[28px] font-extrabold text-[#D6B25E]">
            {t('resuming')}
          </h1>

          <p className="font-montserrat mt-4 text-white/80">
            {t('alreadyActive')}
          </p>

          {showManualContinue ? (
            <button
              type="button"
              onClick={handleContinueToGame}
              className="btn-primary mt-6"
            >
              {t('continue')}
            </button>
          ) : null}
        </div>
      </main>
    )}</ScaledPageViewport>;
  }

  return (
    <ScaledPageViewport headerBackdrop>
      <Header fixedLayout />

      <main className="flex h-[780px] items-center justify-center overflow-hidden px-10 py-[70px]">
        <section className="flex w-full max-w-[620px] flex-col items-center">
          <Image
            src="/Logo_Icon.png"
            alt="Vitruvius logo"
            width={260}
            height={150}
            priority
            className="mb-3 h-auto w-[120px]"
          />

          <h1 className="font-montserrat-alt text-center text-[72px] font-extrabold leading-none tracking-[-0.05em] text-[#D6B25E]">
            Vitruvius
          </h1>

          <p className="font-montserrat-alt mt-3 text-center text-[20px] font-extrabold leading-[1.12] text-white">
            {t('taglineFirst')}
            <br />
            {t('taglineSecond')}
          </p>

          <div className="mt-6 flex w-full max-w-[560px] flex-col gap-[14px]">
            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={isCreatingRoom || isJoiningRoom}
              className="btn-primary home-compact-button"
            >
              {isCreatingRoom ? t('creating') : t('createRoom')}
            </button>

            <div className="grid grid-cols-[1fr_150px] gap-4">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={roomCode}
                onChange={(event) => handleRoomCodeChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleJoinRoom();
                  }
                }}
                placeholder={t('codePlaceholder')}
                maxLength={6}
                className="font-montserrat h-[60px] rounded-full bg-white px-7 text-[20px] font-medium text-black outline-none placeholder:text-[#9A9A9A]"
              />

              <button
                type="button"
                onClick={handleJoinRoom}
                disabled={isJoiningRoom || isCreatingRoom}
                className="btn-primary home-compact-button"
              >
                {isJoiningRoom ? t('joining') : t('join')}
              </button>
            </div>

            <div className="flex items-center gap-3 md:gap-4">
              <div className="h-px flex-1 bg-white/60" />
              <span className="font-montserrat-alt text-[22px] font-extrabold text-white">
                {t('or')}
              </span>
              <div className="h-px flex-1 bg-white/60" />
            </div>

            <p className="font-montserrat-alt text-center text-[26px] font-extrabold leading-[1.15] text-white">
              {t('prepare')}
            </p>

            <button
              type="button"
              onClick={() => router.push("/studio")}
              disabled={isCreatingRoom || isJoiningRoom}
              className="btn-primary home-compact-button"
            >
              Vitruvius Studio
            </button>

            {errorMessage ? (
              <p className="font-montserrat mt-1 text-center text-[13px] font-semibold text-[#FF7A7A] md:text-[15px]">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </ScaledPageViewport>
  );
}
