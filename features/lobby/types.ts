export type LiveSession = {
    id: string;
    code: string;
    created_by: string;
    phase: 'lobby' | 'active' | 'ended';
    cleanup_at: string | null;
};

export type SessionParticipant = {
    id: string;
    session_id: string;
    user_id: string;
    role: 'master' | 'player';
    display_name: string | null;
    avatar_url: string | null;
    is_ready: boolean;
    joined_at: string;
    selected_character_id: string | null;
    selected_world_id: string | null;
};

export type Character = {
    id: string;
    owner_user_id: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
};

export type World = {
  id: string;
  owner_user_id: string;
  name: string;
  avatar_url: string | null;
};

export type LobbyScreenProps = {
    code: string;
};

export type RefreshLobbyStateResult = {
    liveSession: LiveSession | null;
    participants: SessionParticipant[];
    me: SessionParticipant | null;
};