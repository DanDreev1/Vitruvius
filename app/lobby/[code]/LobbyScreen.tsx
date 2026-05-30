'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateGuestUser } from '@/features/home/getOrCreateGuestUser';

type LiveSession = {
    id: string;
    code: string;
    created_by: string;
    phase: 'lobby' | 'active' | 'ended';
};

type SessionParticipant = {
    id: string;
    session_id: string;
    user_id: string;
    role: 'master' | 'player';
    display_name: string | null;
    avatar_url: string | null;
    is_ready: boolean;
    joined_at: string;
    left_at: string | null;
    selected_character_id: string | null;
    selected_world_id: string | null;
};

type Character = {
    id: string;
    owner_user_id: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
};

type World = {
    id: string;
    owner_user_id: string;
    title: string;
    description: string | null;
    cover_url: string | null;
};

type LobbyScreenProps = {
    code: string;
};

export default function LobbyScreen({ code }: LobbyScreenProps) {
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [session, setSession] = useState<LiveSession | null>(null);
    const [participants, setParticipants] = useState<SessionParticipant[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [worlds, setWorlds] = useState<World[]>([]);
    const [activeSlide, setActiveSlide] = useState<0 | 1>(0);
    const [copied, setCopied] = useState(false);

    const touchStartX = useRef<number | null>(null);

    const currentParticipant = useMemo(() => {
        return participants.find((p) => p.user_id === currentUserId) ?? null;
    }, [participants, currentUserId]);

    const isMaster = currentParticipant?.role === 'master';

    const refreshLobbyState = useCallback(
        async (sessionId: string, userId: string) => {
            const { data: liveSession, error: liveSessionError } = await supabase
                .from('live_sessions')
                .select('id, code, created_by, phase')
                .eq('id', sessionId)
                .maybeSingle();

            if (liveSessionError) {
                throw new Error(liveSessionError.message);
            }

            if (!liveSession) {
                return { liveSession: null, participants: [], me: null };
            }

            const { data: fetchedParticipants, error: participantsError } = await supabase
                .from('session_participants')
                .select(`
        id,
        session_id,
        user_id,
        role,
        display_name,
        avatar_url,
        is_ready,
        joined_at,
        left_at,
        selected_character_id,
        selected_world_id
      `)
                .eq('session_id', sessionId)
                .is('left_at', null)
                .order('joined_at', { ascending: true });

            if (participantsError) {
                throw new Error(participantsError.message);
            }

            const participantList = (fetchedParticipants ?? []) as SessionParticipant[];
            const me = participantList.find((p) => p.user_id === userId) ?? null;

            return {
                liveSession: liveSession as LiveSession,
                participants: participantList,
                me,
            };
        },
        []
    );

    const ensureParticipant = useCallback(
        async (sessionId: string, userId: string, createdBy: string) => {
            const { data: existingParticipant, error: existingParticipantError } =
                await supabase
                    .from('session_participants')
                    .select(`
          id,
          session_id,
          user_id,
          role,
          display_name,
          avatar_url,
          is_ready,
          joined_at,
          left_at,
          selected_character_id,
          selected_world_id
        `)
                    .eq('session_id', sessionId)
                    .eq('user_id', userId)
                    .maybeSingle();

            if (existingParticipantError) {
                throw new Error(existingParticipantError.message);
            }

            if (existingParticipant) {
                if (existingParticipant.left_at) {
                    const { error: reactivateError } = await supabase
                        .from('session_participants')
                        .update({
                            left_at: null,
                            is_ready: false,
                        })
                        .eq('id', existingParticipant.id);

                    if (reactivateError) {
                        throw new Error(reactivateError.message);
                    }
                }

                return;
            }

            const defaultRole: 'master' | 'player' =
                createdBy === userId ? 'master' : 'player';

            const { error: insertError } = await supabase
                .from('session_participants')
                .insert({
                    session_id: sessionId,
                    user_id: userId,
                    role: defaultRole,
                    display_name: defaultRole === 'master' ? 'Master' : 'Player',
                    avatar_url: null,
                    is_ready: false,
                });

            if (insertError) {
                throw new Error(insertError.message);
            }
        },
        []
    );

    const bootstrapLobby = useCallback(async () => {
        setIsLoading(true);

        try {
            const user = await getOrCreateGuestUser();
            console.log('AUTH USER ID:', user.id);
            setCurrentUserId(user.id);

            const { data: liveSession, error: liveSessionError } = await supabase
                .from('live_sessions')
                .select('id, code, created_by, phase')
                .eq('code', code)
                .maybeSingle();

            if (liveSessionError) {
                throw new Error(liveSessionError.message);
            }

            if (!liveSession) {
                alert('This lobby no longer exists');
                router.push('/');
                return;
            }

            await ensureParticipant(liveSession.id, user.id, liveSession.created_by);

            const result = await refreshLobbyState(liveSession.id, user.id);

            if (!result.liveSession) {
                alert('This lobby no longer exists');
                router.push('/');
                return;
            }

            setSession(result.liveSession);
            setParticipants(result.participants);


            if (result.liveSession.phase === 'active') {
                router.push(`/session/${result.liveSession.code}`);
                return;
            }


            if (result.me?.role === 'master') {
                const { data: ownedWorlds, error: worldsError } = await supabase
                    .from('worlds')
                    .select('id, owner_user_id, title, description, cover_url')
                    .eq('owner_user_id', user.id)
                    .order('created_at', { ascending: false });

                if (worldsError) {
                    throw new Error(worldsError.message);
                }
                setWorlds((ownedWorlds ?? []) as World[]);
                setCharacters([]);
            } else {
                const { data: ownedCharacters, error: charactersError } = await supabase
                    .from('characters')
                    .select('id, owner_user_id, name, description, avatar_url')
                    .eq('owner_user_id', user.id)
                    .order('created_at', { ascending: false });

                console.log('CHARACTERS QUERY RESULT:', ownedCharacters);
                console.log('CHARACTERS QUERY ERROR:', charactersError);

                if (charactersError) {
                    throw new Error(charactersError.message);

                }

                setCharacters((ownedCharacters ?? []) as Character[]);
                setWorlds([]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [code, ensureParticipant, refreshLobbyState, router]);

    useEffect(() => {
        void bootstrapLobby();
    }, [bootstrapLobby]);

    useEffect(() => {
        if (!session?.id || !currentUserId) return;

        const channel = supabase
            .channel(`lobby-${session.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'session_participants',
                    filter: `session_id=eq.${session.id}`,
                },
                async () => {
                    try {
                        const result = await refreshLobbyState(session.id, currentUserId);

                        if (!result.liveSession) {
                            alert('The master disbanded the lobby');
                            router.push('/');
                            return;
                        }

                        setSession(result.liveSession);
                        setParticipants(result.participants);
                    } catch (error) {
                        console.error(error);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'live_sessions',
                    filter: `id=eq.${session.id}`,
                },
                async () => {
                    try {
                        const result = await refreshLobbyState(session.id, currentUserId);

                        if (!result.liveSession) {
                            alert('The master disbanded the lobby');
                            router.push('/');
                            return;
                        }

                        if (result.liveSession.phase === 'active') {
                            router.push(`/session/${result.liveSession.code}`);
                            return;
                        }

                        setSession(result.liveSession);
                        setParticipants(result.participants);
                    } catch (error) {
                        console.error(error);
                    }
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [session?.id, currentUserId, refreshLobbyState, router]);

    async function handleCopyCode() {
        if (!session?.code) return;

        await navigator.clipboard.writeText(session.code);
        setCopied(true);

        window.setTimeout(() => {
            setCopied(false);
        }, 1500);
    }

    async function handleToggleReady() {
        if (!currentParticipant) return;

        const { error } = await supabase
            .from('session_participants')
            .update({ is_ready: !currentParticipant.is_ready })
            .eq('id', currentParticipant.id);

        if (error) {
            console.error(error);
            return;
        }
    }

    async function handleChangeNickname() {
        if (!currentParticipant) return;

        const nextNickname = window
            .prompt('Enter a new nickname', currentParticipant.display_name ?? '')
            ?.trim();

        if (!nextNickname) return;

        const { error } = await supabase
            .from('session_participants')
            .update({ display_name: nextNickname })
            .eq('id', currentParticipant.id);

        if (error) {
            console.error(error);
        }
    }

    async function handleSelectCharacter(character: Character) {
        if (!currentParticipant) return;

        const { error } = await supabase
            .from('session_participants')
            .update({
                selected_character_id: character.id,
                display_name: character.name,
                avatar_url: character.avatar_url,
            })
            .eq('id', currentParticipant.id);

        if (error) {
            console.error(error);
        }
    }

    async function handleSelectWorld(worldId: string) {
        if (!currentParticipant) return;

        const { error } = await supabase
            .from('session_participants')
            .update({ selected_world_id: worldId })
            .eq('id', currentParticipant.id);

        if (error) {
            console.error(error);
        }
    }

    async function handleLeaveLobby() {
        if (!currentParticipant) return;

        const { error } = await supabase
            .from('session_participants')
            .update({
                left_at: new Date().toISOString(),
                is_ready: false,
            })
            .eq('id', currentParticipant.id);

        if (error) {
            console.error(error);
            return;
        }

        router.push('/');
    }

    async function handleDisbandLobby() {
        if (!session || !isMaster) return;

        const confirmed = window.confirm(
            'Are you sure you want to disband this lobby?'
        );

        if (!confirmed) return;

        const { error: deleteParticipantsError } = await supabase
            .from('session_participants')
            .delete()
            .eq('session_id', session.id);

        if (deleteParticipantsError) {
            console.error(deleteParticipantsError);
            return;
        }

        const { error: deleteSessionError } = await supabase
            .from('live_sessions')
            .delete()
            .eq('id', session.id);

        if (deleteSessionError) {
            console.error(deleteSessionError);
            return;
        }

        router.push('/');
    }

    async function handleStartGame() {
        if (!session || !currentParticipant || !isMaster) return;

        const players = participants.filter((p) => p.role === 'player');
        const master = participants.find((p) => p.role === 'master');

        const allReady =
            participants.length > 0 && participants.every((p) => p.is_ready);

        const allPlayersHaveCharacter = players.every(
            (p) => !!p.selected_character_id
        );

        const masterHasWorld = !!master?.selected_world_id;

        if (!allReady || !allPlayersHaveCharacter || !masterHasWorld) {
            alert(
                'To start the game, all participants must be ready, every player must choose a character, and the master must choose a world.'
            );
            return;
        }

        const { error } = await supabase
            .from('live_sessions')
            .update({
                phase: 'active',
                started_at: new Date().toISOString(),
            })
            .eq('id', session.id);

        if (error) {
            console.error(error);
            return;
        }

        router.push(`/session/${session.code}`);
    }

    function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
        touchStartX.current = e.touches[0].clientX;
    }

    function onTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
        if (touchStartX.current === null) return;

        const diff = e.changedTouches[0].clientX - touchStartX.current;

        if (diff < -50) {
            setActiveSlide(1);
        }

        if (diff > 50) {
            setActiveSlide(0);
        }

        touchStartX.current = null;
    }

    const readyCount = participants.filter((p) => p.is_ready).length;

    const emptyCharacterMessage =
        'There is nothing here yet, but you can create a character in the studio before the game, or change the default character into your own after the session starts.';

    const emptyWorldMessage =
        'There is nothing here yet, but you can create a world in the studio before the game, or configure NPCs, items and images after the session starts.';

    return (
        <div className="min-h-screen text-white">
            <main className="w-full max-w-none min-h-screen px-4 md:px-6 lg:px-0 xl:px-0">
                <div className="grid min-h-screen grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-0">
                    {/* LEFT SIDE */}
                    <section className="mb-0 flex min-w-0 flex-col items-center justify-center lg:pr-10">
                        <div className="mb-10 flex w-full flex-col items-center text-center md:mb-12">
                            <h1 className="mb-6 text-[36px] font-bold leading-none md:text-[48px] xl:text-[60px]">
                                Waiting for the players
                            </h1>

                            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
                                <p className="text-[24px] font-bold leading-none md:text-[32px]">
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
                                                    <h2 className="mb-8 text-[32px] font-bold leading-none md:text-[40px]">
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
                                                            <p className="text-[22px] font-bold leading-none md:text-[30px]">
                                                                {currentParticipant?.display_name ?? 'Nickname'}
                                                            </p>
                                                            <p className="mt-2 text-[18px] leading-none text-[#E7E7E7] md:text-[22px]">
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
                                                    <h2 className="mb-8 text-[28px] font-bold leading-none md:text-[36px]">
                                                        {isMaster ? 'Choose world' : 'Choose character'}
                                                    </h2>

                                                    <div className="w-full rounded-[28px] border border-white/15 bg-white/5 p-4 text-left">
                                                        {isMaster ? (
                                                            worlds.length === 0 ? (
                                                                <p className="text-center text-[16px] leading-[1.5] text-[#E7E7E7]">
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
                                                                                    <p className="text-[20px] font-bold leading-none">
                                                                                        {world.title}
                                                                                    </p>
                                                                                    <p className="mt-2 line-clamp-2 text-[15px] text-[#E7E7E7]">
                                                                                        {world.description || 'No description'}
                                                                                    </p>
                                                                                </div>

                                                                                <div className="text-[14px] font-bold">
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
                            <h2 className="mb-8 text-[28px] font-bold leading-none md:text-[34px]">
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
                                            <p className="text-[22px] font-bold leading-none md:text-[30px]">
                                                {participant.display_name || 'Nickname'}
                                            </p>
                                            <p className="mt-2 text-[18px] leading-none text-[#E7E7E7] md:text-[22px]">
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

                            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={handleToggleReady}
                                    className="btn-primary"
                                    disabled={isLoading || !currentParticipant}
                                >
                                    {currentParticipant?.is_ready ? 'Not Ready' : 'Ready'}
                                </button>

                                {isMaster ? (
                                    <button
                                        type="button"
                                        onClick={handleStartGame}
                                        className="btn-primary"
                                        disabled={isLoading}
                                    >
                                        Start Game
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleLeaveLobby}
                                        className="btn-primary"
                                        disabled={isLoading}
                                    >
                                        Leave Lobby
                                    </button>
                                )}
                            </div>

                            {isMaster && (
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={handleDisbandLobby}
                                        className="btn-secondary"
                                        disabled={isLoading}
                                    >
                                        Disband Lobby
                                    </button>
                                </div>
                            )}

                            <p className="mt-4 text-center text-[14px] text-white/60">
                                Ready: {readyCount}/{participants.length}
                            </p>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}