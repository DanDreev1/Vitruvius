'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { signInWithEmail } from '@/features/auth/signInWithEmail';
import { signUpWithEmail } from '@/features/auth/signUpWithEmail';
import { createId } from '@/lib/createId';
import { supabase } from '@/lib/supabaseClient';
import { sessionExitRequest } from './client';
import type { SessionExitResponse, SessionExitRole } from './types';

const HANDOFF_STORAGE_KEY = 'vitruvius-session-exit-handoff';

type ExitConfirmation = {
  sessionId: string;
  role: SessionExitRole;
} | null;

type SessionExitContextValue = {
  requestExit: (sessionId: string, role: SessionExitRole) => void;
  isBusy: boolean;
  refreshPendingExit: () => Promise<void>;
};

const SessionExitContext = createContext<SessionExitContextValue | null>(null);

export function useSessionExit() {
  const value = useContext(SessionExitContext);
  if (!value) throw new Error('useSessionExit must be used within SessionExitProvider.');
  return value;
}

export default function SessionExitProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('SessionExit');
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<SessionExitResponse>({
    pending: null,
    isAnonymous: false,
  });
  const [confirmation, setConfirmation] = useState<ExitConfirmation>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const refreshPendingExit = useCallback(async () => {
    try {
      const result = await sessionExitRequest<SessionExitResponse>('GET');
      setState(result ?? { pending: null, isAnonymous: false });
    } catch (refreshError) {
      console.error('Failed to refresh pending session exit:', refreshError);
    }
  }, []);

  const claimStoredHandoff = useCallback(async () => {
    const handoffToken = window.localStorage.getItem(HANDOFF_STORAGE_KEY);
    if (!handoffToken) return;

    await sessionExitRequest('POST', {
      action: 'claim-handoff',
      handoffToken,
    });
    window.localStorage.removeItem(HANDOFF_STORAGE_KEY);
  }, []);

  useEffect(() => {
    let active = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    const configure = async () => {
      try {
        await claimStoredHandoff();
      } catch (claimError) {
        console.error('Failed to claim anonymous session data:', claimError);
      }
      if (!active) return;

      const { data } = await supabase.auth.getSession();
      if (realtimeChannel) {
        await supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
      if (!data.session?.user) {
        setState({ pending: null, isAnonymous: false });
        return;
      }

      await refreshPendingExit();
      realtimeChannel = supabase
        .channel(`session-exit-${data.session.user.id}-${createId()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'session_participants',
            filter: `user_id=eq.${data.session.user.id}`,
          },
          (payload) => {
            const nextStatus = (payload.new as { participation_status?: string })
              .participation_status;
            if (
              payload.eventType === 'DELETE' ||
              nextStatus === 'save_pending' ||
              nextStatus === 'resolved'
            ) {
              void refreshPendingExit();
            }
          }
        )
        .subscribe();
    };

    void configure();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void configure(), 0);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      if (realtimeChannel) void supabase.removeChannel(realtimeChannel);
    };
  }, [claimStoredHandoff, refreshPendingExit]);

  const requestExit = useCallback((sessionId: string, role: SessionExitRole) => {
    setError(null);
    setConfirmation({ sessionId, role });
  }, []);

  const confirmExit = async () => {
    if (!confirmation || isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      await sessionExitRequest('POST', {
        action: 'begin',
        sessionId: confirmation.sessionId,
      });
      setConfirmation(null);
      await refreshPendingExit();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('exitError'));
    } finally {
      setIsBusy(false);
    }
  };

  const resolveExit = async (action: 'discard' | 'save', mode?: 'new' | 'current') => {
    if (!state.pending || isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      const result = await sessionExitRequest<{ deletedAnonymousUser?: boolean }>('POST', {
        action,
        participantId: state.pending.participantId,
        ...(mode ? { mode } : {}),
      });
      if (result?.deletedAnonymousUser) {
        await supabase.auth.signOut({ scope: 'local' });
      }
      await refreshPendingExit();
      router.push('/');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('processError'));
    } finally {
      setIsBusy(false);
    }
  };

  const authenticateAnonymous = async (mode: 'login' | 'signup') => {
    if (isBusy || !email.trim() || !password) return;
    setIsBusy(true);
    setError(null);
    try {
      const prepared = await sessionExitRequest<{ handoffToken: string }>('POST', {
        action: 'prepare-handoff',
      });
      if (!prepared?.handoffToken) throw new Error(t('handoffError'));
      window.localStorage.setItem(HANDOFF_STORAGE_KEY, prepared.handoffToken);

      if (mode === 'login') {
        await signInWithEmail({ email: email.trim(), password });
      } else {
        const result = await signUpWithEmail({ email: email.trim(), password });
        if (!result.session) {
          throw new Error(t('confirmEmail'));
        }
      }

      await claimStoredHandoff();
      await refreshPendingExit();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : t('authError'));
    } finally {
      setIsBusy(false);
    }
  };

  const canSaveCurrent = Boolean(
    state.pending?.role === 'master'
      ? state.pending.sourceWorldId
      : state.pending?.sourceCharacterId
  );
  const entityName = state.pending?.role === 'master' ? t('world') : t('character');

  useEffect(() => {
    if (!state.pending) return;
    const gamePath = `/game/${state.pending.sessionCode}`;
    if (pathname !== gamePath) router.replace(gamePath);
  }, [pathname, router, state.pending]);
  const value = useMemo<SessionExitContextValue>(() => ({
    requestExit,
    isBusy,
    refreshPendingExit,
  }), [isBusy, refreshPendingExit, requestExit]);

  return (
    <SessionExitContext.Provider value={value}>
      {children}

      {confirmation ? (
        <div className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-black/75 p-2 backdrop-blur-sm">
          <section className="max-h-[calc(100dvh-16px)] w-full max-w-[360px] overflow-y-auto rounded-[16px] border border-white/12 bg-[#172033] p-[16px] shadow-2xl">
            <h2 className="font-montserrat-alt text-[19px] font-extrabold leading-tight text-white">
              {confirmation.role === 'master' ? t('endSessionTitle') : t('exitGameTitle')}
            </h2>
            <p className="mt-[6px] font-montserrat text-[11px] leading-[1.45] text-white/60">
              {confirmation.role === 'master'
                ? t('endSessionDescription')
                : t('exitGameDescription')}
            </p>
            {error ? <p className="mt-2 text-[11px] text-[#E88A8A]">{error}</p> : null}
            <div className="mt-[13px] flex justify-end gap-[7px]">
              <button type="button" disabled={isBusy} onClick={() => setConfirmation(null)} className="min-h-[36px] rounded-[9px] border border-white/15 px-[12px] py-[7px] font-montserrat text-[11px] font-bold text-white">
                {t('cancel')}
              </button>
              <button type="button" disabled={isBusy} onClick={() => void confirmExit()} className="min-h-[36px] rounded-[9px] bg-[#D6B25E] px-[12px] py-[7px] font-montserrat text-[11px] font-extrabold text-black disabled:opacity-50">
                {isBusy ? t('processing') : confirmation.role === 'master' ? t('endSession') : t('exitGame')}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {state.pending ? (
        <div className="fixed inset-0 z-[990] grid place-items-center overflow-y-auto bg-[#070C17]/90 p-2 backdrop-blur-[10px] sm:p-6">
          <section className="relative max-h-[calc(100dvh-16px)] w-full max-w-[450px] overflow-y-auto rounded-[18px] border border-white/10 bg-[#172033] shadow-[0_32px_90px_rgba(0,0,0,.55)]">
            <div className="h-[3px] bg-gradient-to-r from-transparent via-white/35 to-transparent" />
            <div className="p-[16px]">
              <div className="flex items-start gap-[10px]">
                <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/[.06] font-montserrat-alt text-[16px] font-extrabold uppercase text-white/85">
                  {entityName.charAt(0)}
                </div>
                <div className="min-w-0 pt-[1px]">
                  <p className="font-montserrat text-[10px] font-extrabold uppercase tracking-[.24em] text-white/45">{t('sessionEnded')}</p>
                  <h2 className="mt-[3px] font-montserrat-alt text-[20px] font-extrabold leading-[1.12] text-white">{t('keepEntity', { entity: entityName })}</h2>
                </div>
              </div>
              <div className="mt-[11px] flex items-center gap-[9px] rounded-[12px] border border-white/[.07] bg-[#0E1627]/75 px-[11px] py-[8px]">
                <div className="h-[8px] w-[8px] shrink-0 rounded-full bg-white/35" />
                <div>
                  <p className="font-montserrat text-[10px] font-bold uppercase tracking-[.12em] text-white/35">{t('temporaryUntil')}</p>
                  <p className="mt-[1px] font-montserrat text-[11px] font-bold text-white/75">{new Date(state.pending.cleanupAt).toLocaleString()}</p>
                </div>
              </div>

            {state.isAnonymous ? (
              <div className="mt-[10px] rounded-[14px] border border-white/10 bg-white/[.035] p-[11px]">
                <p className="font-montserrat text-[11px] leading-[1.4] text-white/65">
                  {t('anonymousHelp', { entity: entityName })}
                </p>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('email')} className="mt-[8px] h-[38px] w-full rounded-[10px] border border-white/10 bg-[#0B1020] px-[11px] font-montserrat text-[12px] text-white outline-none transition focus:border-white/30" />
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t('password')} className="mt-[6px] h-[38px] w-full rounded-[10px] border border-white/10 bg-[#0B1020] px-[11px] font-montserrat text-[12px] text-white outline-none transition focus:border-white/30" />
                <div className="mt-[8px] grid grid-cols-2 gap-[6px]">
                  <button type="button" disabled={isBusy} onClick={() => void authenticateAnonymous('login')} className="rounded-[10px] border border-white/15 px-[10px] py-[8px] font-montserrat text-[11px] font-bold text-white transition hover:bg-white/[.05] disabled:opacity-40">{t('login')}</button>
                  <button type="button" disabled={isBusy} onClick={() => void authenticateAnonymous('signup')} className="rounded-[10px] bg-white px-[10px] py-[8px] font-montserrat text-[11px] font-extrabold text-[#172033] transition hover:bg-white/90 disabled:opacity-40">{t('createAccount')}</button>
                </div>
              </div>
            ) : (
              <div className={`mt-[10px] grid gap-[7px] ${canSaveCurrent ? 'grid-cols-2' : ''}`}>
                <button type="button" disabled={isBusy} onClick={() => void resolveExit('save', 'new')} className="group flex min-h-[52px] items-center justify-between rounded-[12px] bg-white px-[12px] text-left transition hover:bg-white/90 disabled:opacity-40">
                  <span><span className="block font-montserrat text-[14px] font-extrabold text-[#172033]">{t('saveAsNew')}</span><span className="mt-[2px] block font-montserrat text-[10px] font-semibold text-[#172033]/55">{t('saveAsNewHelp')}</span></span>
                  <span className="text-[20px] text-[#172033]/45 transition-transform group-hover:translate-x-1">→</span>
                </button>
                {canSaveCurrent ? (
                  <button type="button" disabled={isBusy} onClick={() => void resolveExit('save', 'current')} className="group flex min-h-[52px] items-center justify-between rounded-[12px] border border-white/15 bg-white/[.045] px-[12px] text-left transition hover:bg-white/[.08] disabled:opacity-40">
                    <span><span className="block font-montserrat text-[14px] font-extrabold text-white">{t('updateCurrent')}</span><span className="mt-[2px] block font-montserrat text-[10px] font-semibold text-white/40">{t('updateCurrentHelp')}</span></span>
                    <span className="text-[20px] text-white/30 transition-transform group-hover:translate-x-1">→</span>
                  </button>
                ) : null}
              </div>
            )}

            <div className="mt-[10px] border-t border-white/[.07] pt-[7px]">
              <button type="button" disabled={isBusy} onClick={() => void resolveExit('discard')} className="w-full rounded-[10px] px-[12px] py-[7px] font-montserrat text-[11px] font-bold text-white/45 transition hover:bg-white/[.04] hover:text-[#E88A8A] disabled:opacity-40">
                {t('dontSave', { entity: entityName })}
              </button>
            </div>
            {isBusy ? <p className="mt-[12px] text-center text-[12px] text-white/45">{t('processing')}</p> : null}
            {error ? <p className="mt-[10px] rounded-[12px] bg-[#E07373]/10 px-[12px] py-[9px] text-center font-montserrat text-[12px] font-semibold text-[#E88A8A]">{error}</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </SessionExitContext.Provider>
  );
}
