'use client';

import { useLobbyScreen } from '@/features/lobby/useLobbyScreen';
import type { LobbyScreenProps } from '@/features/lobby/types';
import BackHomeButton from '@/components/ui/BackHomeButton';

export default function LobbyScreen({ code }: LobbyScreenProps) {
    const {
        isLoading,
        session,
        participants,
        currentParticipant,
        characters,
        worlds,
        activeSlide,
        copied,
        isMaster,
        readyCount,
        emptyCharacterMessage,
        emptyWorldMessage,
        setActiveSlide,
        onTouchStart,
        onTouchEnd,
        handleCopyCode,
        handleToggleReady,
        handleChangeNickname,
        handleSelectCharacter,
        handleSelectWorld,
        handleLeaveLobby,
        handleDisbandLobby,
        handleStartGame
    } = useLobbyScreen({ code });

    return (
        <div className="min-h-screen text-white">
            <main className="w-full max-w-none min-h-screen px-4 md:px-6 lg:px-0 xl:px-0">
                <div className="grid min-h-screen grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-0">
                    {/* LEFT SIDE */}
                    <section className="relative mb-0 flex min-w-0 flex-col items-center justify-center lg:pr-10">
                        <div className="absolute left-4 top-4 z-20 lg:left-8 lg:top-8">
                            <BackHomeButton
                                onClick={isMaster ? handleDisbandLobby : handleLeaveLobby}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="mt-24 mb-10 flex w-full flex-col items-center text-center md:mb-12">
                            <h1 className="font-montserrat-alt mb-6 text-[36px] font-bold leading-none md:text-[48px] xl:text-[60px]">
                                Waiting for the players
                            </h1>

                            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
                                <p className="font-montserrat text-[24px] font-bold leading-none md:text-[32px]">
                                    Code: {session?.code ?? code}
                                </p>

                                <button
                                    type="button"
                                    onClick={handleCopyCode}
                                    className="btn-primary w-full max-w-[150px] sm:w-auto"
                                >
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        {/* ONLY THIS AREA SLIDES */}
                        <div className="flex w-full justify-center">
                            <div className="w-full max-w-[900px]">
                                <div className="relative w-full">
                                    {activeSlide === 1 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveSlide(0)}
                                            className="absolute left-0 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#091332] lg:flex"
                                            aria-label="Previous slide"
                                        >
                                            ←
                                        </button>
                                    )}

                                    {activeSlide === 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveSlide(1)}
                                            className="absolute right-0 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#091332] lg:flex"
                                            aria-label="Next slide"
                                        >
                                            →
                                        </button>
                                    )}

                                    <div
                                        className="w-full overflow-hidden"
                                        onTouchStart={onTouchStart}
                                        onTouchEnd={onTouchEnd}
                                    >
                                        <div
                                            className={`flex w-[200%] transition-transform duration-300 ease-out ${activeSlide === 0 ? 'translate-x-0' : '-translate-x-1/2'
                                                }`}
                                        >
                                            {/* SLIDE 1 - EDIT PROFILE */}
                                            <div className="w-1/2 px-2 lg:px-16">
                                                <div className="mx-auto flex w-full max-w-[560px] flex-col items-center text-center">
                                                    <h2 className="font-montserrat-alt mb-8 text-[32px] font-bold leading-none md:text-[40px]">
                                                        Edit profile
                                                    </h2>

                                                    <div className="mb-8 flex w-full items-center justify-center gap-5">
                                                        {currentParticipant?.avatar_url ? (
                                                            <img
                                                                src={currentParticipant.avatar_url}
                                                                alt="Profile avatar"
                                                                className="h-[100px] w-[100px] rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-[100px] w-[100px] rounded-full bg-[#D9D9D9]" />
                                                        )}

                                                        <div className="min-w-0 text-left">
                                                            <p className="font-montserrat text-[22px] font-bold leading-none md:text-[30px]">
                                                                {currentParticipant?.display_name ?? 'Nickname'}
                                                            </p>
                                                            <p className="font-montserrat mt-2 text-[18px] leading-none text-[#E7E7E7] md:text-[22px]">
                                                                Role: {currentParticipant?.role === 'master' ? 'Master' : 'Player'}
                                                            </p>
                                                        </div>

                                                        <div
                                                            className={`h-5 w-5 rounded-full ${currentParticipant?.is_ready ? 'bg-[#00FF19]' : 'bg-[#5D5D5D]'
                                                                }`}
                                                        />
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={handleChangeNickname}
                                                        className="btn-primary max-w-[560px]"
                                                    >
                                                        Change nickname
                                                    </button>
                                                </div>
                                            </div>

                                            {/* SLIDE 2 - CHOOSE CHARACTER / WORLD */}
                                            <div className="w-1/2 px-2 lg:px-16">
                                                <div className="mx-auto flex w-full max-w-[560px] flex-col items-center text-center">
                                                    <h2 className="font-montserrat-alt mb-8 text-[28px] font-bold leading-none md:text-[36px]">
                                                        {isMaster ? 'Choose world' : 'Choose character'}
                                                    </h2>

                                                    <div className="w-full rounded-[28px] border border-white/15 bg-white/5 p-4 text-left">
                                                        {isMaster ? (
                                                            worlds.length === 0 ? (
                                                                <p className="font-montserrat text-center text-[16px] leading-[1.5] text-[#E7E7E7]">
                                                                    {emptyWorldMessage}
                                                                </p>
                                                            ) : (
                                                                <div className="space-y-3">
                                                                    {worlds.map((world) => {
                                                                        const isSelected =
                                                                            currentParticipant?.selected_world_id === world.id;

                                                                        return (
                                                                            <button
                                                                                key={world.id}
                                                                                type="button"
                                                                                onClick={() => handleSelectWorld(world.id)}
                                                                                className={`flex w-full items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition-colors ${isSelected
                                                                                    ? 'border-[#D6B25E] bg-[#D6B25E]/10'
                                                                                    : 'border-white/10 bg-white/5'
                                                                                    }`}
                                                                            >
                                                                                {world.cover_url ? (
                                                                                    <img
                                                                                        src={world.cover_url}
                                                                                        alt={world.title}
                                                                                        className="h-[72px] w-[72px] shrink-0 rounded-[18px] object-cover"
                                                                                    />
                                                                                ) : (
                                                                                    <div className="h-[72px] w-[72px] shrink-0 rounded-[18px] bg-[#D9D9D9]" />
                                                                                )}

                                                                                <div className="min-w-0 flex-1">
                                                                                    <p className="font-montserrat text-[20px] font-bold leading-none">
                                                                                        {world.title}
                                                                                    </p>
                                                                                    <p className="font-montserrat mt-2 line-clamp-2 text-[15px] text-[#E7E7E7]">
                                                                                        {world.description || 'No description'}
                                                                                    </p>
                                                                                </div>

                                                                                <div className="font-montserrat text-[14px] font-bold">
                                                                                    {isSelected ? 'Selected' : 'Choose'}
                                                                                </div>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )
                                                        ) : characters.length === 0 ? (
                                                            <p className="text-center text-[16px] leading-[1.5] text-[#E7E7E7]">
                                                                {emptyCharacterMessage}
                                                            </p>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {characters.map((character) => {
                                                                    const isSelected =
                                                                        currentParticipant?.selected_character_id === character.id;

                                                                    return (
                                                                        <button
                                                                            key={character.id}
                                                                            type="button"
                                                                            onClick={() => handleSelectCharacter(character)}
                                                                            className={`flex w-full items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition-colors ${isSelected
                                                                                ? 'border-[#D6B25E] bg-[#D6B25E]/10'
                                                                                : 'border-white/10 bg-white/5'
                                                                                }`}
                                                                        >
                                                                            {character.avatar_url ? (
                                                                                <img
                                                                                    src={character.avatar_url}
                                                                                    alt={character.name}
                                                                                    className="h-[72px] w-[72px] shrink-0 rounded-[18px] object-cover"
                                                                                />
                                                                            ) : (
                                                                                <div className="h-[72px] w-[72px] shrink-0 rounded-[18px] bg-[#D9D9D9]" />
                                                                            )}

                                                                            <div className="min-w-0 flex-1">
                                                                                <p className="text-[20px] font-bold leading-none">
                                                                                    {character.name}
                                                                                </p>
                                                                                <p className="mt-2 line-clamp-2 text-[15px] text-[#E7E7E7]">
                                                                                    {character.description || 'No description'}
                                                                                </p>
                                                                            </div>

                                                                            <div className="text-[14px] font-bold">
                                                                                {isSelected ? 'Selected' : 'Choose'}
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DOTS */}
                                    <div className="mt-6 flex items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setActiveSlide(0)}
                                            className={`h-3.5 w-3.5 rounded-full ${activeSlide === 0 ? 'bg-white' : 'bg-white/30'
                                                }`}
                                            aria-label="Open profile slide"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setActiveSlide(1)}
                                            className={`h-3.5 w-3.5 rounded-full ${activeSlide === 1 ? 'bg-white' : 'bg-white/30'
                                                }`}
                                            aria-label="Open selection slide"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* RIGHT SIDE */}
                    <aside className="border-t-2 border-[#7C5CFF] pt-10 lg:ml-auto lg:w-[460px] lg:border-l-2 lg:border-t-0 lg:pr-6 lg:pl-8 lg:py-10">
                        <div className="flex h-full min-h-[620px] flex-col">
                            <h2 className="font-montserrat-alt mb-8 text-[28px] font-bold leading-none md:text-[34px]">
                                Players in lobby: {participants.length}
                            </h2>

                            <div className="flex-1 space-y-5 overflow-y-auto pr-2">
                                {participants.map((participant) => (
                                    <div key={participant.id} className="flex items-center gap-4">
                                        {participant.avatar_url ? (
                                            <img
                                                src={participant.avatar_url}
                                                alt={participant.display_name || 'Player'}
                                                className="h-[74px] w-[74px] rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-[74px] w-[74px] rounded-full bg-[#D9D9D9]" />
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <p className="font-montserrat text-[22px] font-bold leading-none md:text-[30px]">
                                                {participant.display_name || 'Nickname'}
                                            </p>
                                            <p className="font-montserrat mt-2 text-[18px] leading-none text-[#E7E7E7] md:text-[22px]">
                                                Role: {participant.role === 'master' ? 'Master' : 'Player'}
                                            </p>
                                        </div>

                                        <div
                                            className={`h-5 w-5 shrink-0 rounded-full ${participant.is_ready ? 'bg-[#00FF19]' : 'bg-[#5D5D5D]'
                                                }`}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className={`mt-8 grid gap-4 ${isMaster ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                                <button
                                    type="button"
                                    onClick={handleToggleReady}
                                    className="btn-primary"
                                    disabled={isLoading || !currentParticipant}
                                >
                                    {currentParticipant?.is_ready ? 'Not Ready' : 'Ready'}
                                </button>

                                {isMaster && (
                                    <button
                                        type="button"
                                        onClick={handleStartGame}
                                        className="btn-primary"
                                        disabled={isLoading}
                                    >
                                        Start Game
                                    </button>
                                )}
                            </div>

                            <p className="font-montserrat mt-4 text-center text-[14px] text-white/60">
                                Ready: {readyCount}/{participants.length}
                            </p>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}