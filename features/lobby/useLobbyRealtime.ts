import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

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

        const channel = supabase
            .channel(`lobby-${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'session_participants',
                    filter: `session_id=eq.${sessionId}`
                },
                async () => {
                    await onParticipantsChange();
                }
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
            void supabase.removeChannel(channel);
        };
    }, [enabled, onParticipantsChange, onSessionChange, sessionId]);
}