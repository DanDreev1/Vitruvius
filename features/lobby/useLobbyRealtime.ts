import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const REALTIME_SYNC_DELAY_MS = 100;

type UseLobbyRealtimeParams = {
    sessionId: string | null;
    enabled: boolean;
    onParticipantsChange: () => Promise<void>;
    onSessionChange: () => Promise<void>;
};

export function useLobbyRealtime({
    sessionId,
    enabled,
    onParticipantsChange,
    onSessionChange
}: UseLobbyRealtimeParams) {
    useEffect(() => {
        if (!sessionId || !enabled) return;

        let participantsSyncTimeoutId: number | null = null;

        const scheduleParticipantsSync = () => {
            if (participantsSyncTimeoutId !== null) return;

            participantsSyncTimeoutId = window.setTimeout(() => {
                participantsSyncTimeoutId = null;
                void onParticipantsChange();
            }, REALTIME_SYNC_DELAY_MS);
        };

        const channel = supabase
            .channel(`lobby-${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'session_participants',
                    filter: `session_id=eq.${sessionId}`
                },
                scheduleParticipantsSync
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'session_participants',
                    filter: `session_id=eq.${sessionId}`
                },
                scheduleParticipantsSync
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'session_participants'
                },
                scheduleParticipantsSync
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'live_sessions',
                    filter: `id=eq.${sessionId}`
                },
                async () => {
                    await onSessionChange();
                }
            )
            .subscribe();

        return () => {
            if (participantsSyncTimeoutId !== null) {
                window.clearTimeout(participantsSyncTimeoutId);
            }

            void supabase.removeChannel(channel);
        };
    }, [enabled, onParticipantsChange, onSessionChange, sessionId]);
}
