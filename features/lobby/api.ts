import { supabase } from '@/lib/supabaseClient';
import type {
    Character,
    LiveSession,
    RefreshLobbyStateResult,
    SessionParticipant,
    World
} from './types';

export async function getLiveSessionByCode(code: string) {
    const { data, error } = await supabase
        .from('live_sessions')
        .select('id, code, created_by, phase')
        .eq('code', code)
        .maybeSingle();

    if (error) throw new Error(error.message);

    return (data as LiveSession | null) ?? null;
}

export async function getLiveSessionById(sessionId: string) {
    const { data, error } = await supabase
        .from('live_sessions')
        .select('id, code, created_by, phase')
        .eq('id', sessionId)
        .maybeSingle();

    if (error) throw new Error(error.message);

    return (data as LiveSession | null) ?? null;
}

export async function getActiveParticipants(sessionId: string) {
    const { data, error } = await supabase
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

    if (error) throw new Error(error.message);

    return (data ?? []) as SessionParticipant[];
}

export async function refreshLobbyState(
    sessionId: string,
    userId: string
): Promise<RefreshLobbyStateResult> {
    const liveSession = await getLiveSessionById(sessionId);

    if (!liveSession) {
        return { liveSession: null, participants: [], me: null };
    }

    const participants = await getActiveParticipants(sessionId);
    const me = participants.find((participant) => participant.user_id === userId) ?? null;

    return { liveSession, participants, me };
}

export async function ensureParticipant(
    sessionId: string,
    userId: string,
    createdBy: string
) {
    const { data: existingParticipant, error } = await supabase
        .from('session_participants')
        .select(`
      id,
      left_at
    `)
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw new Error(error.message);

    if (existingParticipant) {
        if (existingParticipant.left_at) {
            const { error: reactivateError } = await supabase
                .from('session_participants')
                .update({
                    left_at: null,
                    is_ready: false
                })
                .eq('id', existingParticipant.id);

            if (reactivateError) throw new Error(reactivateError.message);
        }

        return;
    }

    const defaultRole: 'master' | 'player' = createdBy === userId ? 'master' : 'player';

    const { error: insertError } = await supabase
        .from('session_participants')
        .insert({
            session_id: sessionId,
            user_id: userId,
            role: defaultRole,
            display_name: defaultRole === 'master' ? 'Master' : 'Player',
            avatar_url: null,
            is_ready: false
        });

    if (insertError) throw new Error(insertError.message);
}

export async function getOwnedWorlds(userId: string) {
    const { data, error } = await supabase
        .from('worlds')
        .select('id, owner_user_id, title, description, cover_url')
        .eq('owner_user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []) as World[];
}

export async function getOwnedCharacters(userId: string) {
    const { data, error } = await supabase
        .from('characters')
        .select('id, owner_user_id, name, description, avatar_url')
        .eq('owner_user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []) as Character[];
}

export async function updateParticipantReady(
    participantId: string,
    nextIsReady: boolean
) {
    const { error } = await supabase
        .from('session_participants')
        .update({ is_ready: nextIsReady })
        .eq('id', participantId);

    if (error) throw new Error(error.message);
}

export async function updateParticipantNickname(
    participantId: string,
    displayName: string
) {
    const { error } = await supabase
        .from('session_participants')
        .update({ display_name: displayName })
        .eq('id', participantId);

    if (error) throw new Error(error.message);
}

export async function selectParticipantCharacter(
    participantId: string,
    character: Character
) {
    const { error } = await supabase
        .from('session_participants')
        .update({
            selected_character_id: character.id,
            display_name: character.name,
            avatar_url: character.avatar_url
        })
        .eq('id', participantId);

    if (error) throw new Error(error.message);
}

export async function selectParticipantWorld(
    participantId: string,
    worldId: string
) {
    const { error } = await supabase
        .from('session_participants')
        .update({ selected_world_id: worldId })
        .eq('id', participantId);

    if (error) throw new Error(error.message);
}

export async function leaveLobby(participantId: string) {
    const { error } = await supabase
        .from('session_participants')
        .update({
            left_at: new Date().toISOString(),
            is_ready: false
        })
        .eq('id', participantId);

    if (error) throw new Error(error.message);
}

export async function disbandLobby(sessionId: string) {
    const { error: deleteParticipantsError } = await supabase
        .from('session_participants')
        .delete()
        .eq('session_id', sessionId);

    if (deleteParticipantsError) throw new Error(deleteParticipantsError.message);

    const { error: deleteSessionError } = await supabase
        .from('live_sessions')
        .delete()
        .eq('id', sessionId);

    if (deleteSessionError) throw new Error(deleteSessionError.message);
}

export async function startLobbyGame(sessionId: string) {
    const { error } = await supabase
        .from('live_sessions')
        .update({
            phase: 'active',
            started_at: new Date().toISOString()
        })
        .eq('id', sessionId);

    if (error) throw new Error(error.message);
}