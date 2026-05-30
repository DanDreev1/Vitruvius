'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import Header from '@/components/ui/Header';
import { supabase } from '@/lib/supabaseClient';
import { LeaveLobbyButton } from './LeaveLobbyButton';

type LobbyClientProps = {
  code: string;
};

type LobbySession = {
  id: string;
  code: string;
  phase: 'lobby' | 'active' | 'ended';
  created_by: string;
};

type LobbyParticipant = {
  id: string;
  user_id: string;
  role: 'master' | 'player';
  is_ready: boolean;
  display_name: string | null;
};

export default function LobbyClient({ code }: LobbyClientProps) {
  const router = useRouter();

  const [session, setSession] = useState<LobbySession | null>(null);
  const [participants, setParticipants] = useState<LobbyParticipant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const redirectingRef = useRef(false);

  useEffect(() => {
    if (!session?.id || !currentUserId) {
        return;
    }

    const interval = setInterval(async () => {
        if (redirectingRef.current) {
        return;
        }

        try {
        const { data: existingSession, error: existingSessionError } =
            await supabase
            .from('live_sessions')
            .select('id')
            .eq('id', session.id)
            .maybeSingle();

        if (existingSessionError) {
            console.error(existingSessionError);
            return;
        }

        if (!existingSession) {
            redirectingRef.current = true;
            router.replace('/');
            return;
        }

        const { data: existingParticipant, error: existingParticipantError } =
            await supabase
            .from('session_participants')
            .select('id')
            .eq('session_id', session.id)
            .eq('user_id', currentUserId)
            .maybeSingle();

        if (existingParticipantError) {
            console.error(existingParticipantError);
            return;
        }

        if (!existingParticipant) {
            redirectingRef.current = true;
            router.replace('/');
        }
        } catch (error) {
        console.error(error);
        }
    }, 2000);

    return () => clearInterval(interval);
    }, [session?.id, currentUserId, router]);

  useEffect(() => {
    const loadLobby = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const {
          data: { session: authSession },
          error: authError,
        } = await supabase.auth.getSession();

        if (authError) {
          throw new Error(authError.message);
        }

        if (!authSession?.user) {
          router.push('/login');
          return;
        }

        setCurrentUserId(authSession.user.id);

        const { data: foundSession, error: sessionError } = await supabase
          .from('live_sessions')
          .select('id, code, phase, created_by')
          .eq('code', code)
          .single();

        if (sessionError || !foundSession) {
          throw new Error('Lobby not found.');
        }

        setSession(foundSession);

        const { data: foundParticipants, error: participantsError } =
          await supabase
            .from('session_participants')
            .select('id, user_id, role, is_ready, display_name')
            .eq('session_id', foundSession.id)
            .order('joined_at', { ascending: true });

        if (participantsError) {
          throw new Error(participantsError.message);
        }

        setParticipants(foundParticipants ?? []);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load lobby.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadLobby();
  }, [code, router]);

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4 min-[480px]:min-h-[calc(100vh-68px)] min-[768px]:min-h-[calc(100vh-86px)]">
          <p className="font-montserrat text-white">Loading lobby...</p>
        </main>
      </>
    );
  }

  if (errorMessage || !session) {
    return (
      <>
        <Header />
        <main className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4 min-[480px]:min-h-[calc(100vh-68px)] min-[768px]:min-h-[calc(100vh-86px)]">
          <div className="w-full max-w-[640px] rounded-[28px] bg-[#182135] p-6 text-center min-[768px]:p-8">
            <h1 className="font-montserrat-alt text-[32px] font-extrabold text-[#D6B25E] min-[768px]:text-[46px]">
              Lobby
            </h1>

            <p className="mt-4 font-montserrat text-[16px] font-semibold text-[#FF7A7A]">
              {errorMessage || 'Lobby not found.'}
            </p>

            <button
              type="button"
              onClick={() => router.push('/')}
              className="btn-primary mt-6"
            >
              Go Home
            </button>
          </div>
        </main>
      </>
    );
  }

  const currentParticipant =
    participants.find((participant) => participant.user_id === currentUserId) ??
    null;

  const isMaster = currentParticipant?.role === 'master';

  return (
    <>
      <Header />

      <main className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-[1440px] items-center justify-center px-4 py-10 min-[480px]:min-h-[calc(100vh-68px)] min-[480px]:px-6 min-[768px]:min-h-[calc(100vh-86px)] min-[768px]:px-10">
        <section className="w-full max-w-[820px] rounded-[28px] bg-[#182135] p-4 min-[480px]:p-6 min-[768px]:p-8">
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h1 className="font-montserrat-alt text-[34px] font-extrabold text-[#D6B25E] min-[768px]:text-[52px]">
                Lobby
              </h1>

              <p className="mt-3 font-montserrat text-[16px] text-[#8E929B] min-[768px]:text-[18px]">
                Room code: <span className="font-bold text-white">{session.code}</span>
              </p>

              <p className="mt-2 font-montserrat text-[14px] text-[#8E929B] min-[768px]:text-[16px]">
                Your role:{' '}
                <span className="font-bold text-white">
                  {currentParticipant?.role ?? 'Unknown'}
                </span>
              </p>
            </div>

            <div className="rounded-[24px] bg-[#0B1020] p-4 min-[768px]:p-5">
              <h2 className="font-montserrat-alt text-[24px] font-bold text-white min-[768px]:text-[30px]">
                Participants
              </h2>

              <div className="mt-4 flex flex-col gap-3">
                {participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between rounded-[18px] bg-[#182135] px-4 py-4"
                  >
                    <div className="flex flex-col">
                      <span className="font-montserrat text-[16px] font-bold text-white">
                        {participant.display_name || `Player ${index + 1}`}
                      </span>

                      <span className="font-montserrat text-[13px] font-medium text-[#8E929B]">
                        Role: {participant.role}
                      </span>
                    </div>

                    <span
                      className={`font-montserrat text-[14px] font-bold ${
                        participant.is_ready ? 'text-[#6EE7A8]' : 'text-[#FFB86B]'
                      }`}
                    >
                      {participant.is_ready ? 'Ready' : 'Not ready'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {session.phase !== 'lobby' ? (
              <p className="text-center font-montserrat text-[15px] font-semibold text-[#FF7A7A]">
                This lobby is no longer in join mode.
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              <LeaveLobbyButton
                sessionId={session.id}
                isMaster={isMaster}
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}