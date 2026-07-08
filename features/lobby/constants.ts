export const EMPTY_CHARACTER_MESSAGE =
    'There is nothing here yet, but you can create a character in the studio before the game, or change the default character into your own after the session starts.';

export const EMPTY_WORLD_MESSAGE =
    'There is nothing here yet, but you can create a world in the studio before the game, or configure NPCs, items and images after the session starts.';

export const LOBBY_DISBANDED_MESSAGE = 'The master disbanded the lobby';
export const LOBBY_NOT_FOUND_MESSAGE = 'This lobby no longer exists';
export const LOBBY_TIMEOUT_MESSAGE = 'The lobby expired';
export const LOBBY_TIMEOUT_MS = 15 /*number of minutes*/ * 60 * 1000;
export const LOBBY_MIN_PARTICIPANTS = 2;

export const LOBBY_AVATAR_STORAGE_BUCKET = 'temporary-avatars';
export const LOBBY_TEMP_AVATAR_STORAGE_OBJECT_NAME = 'temporary-avatar';
export const LOBBY_AVATAR_UPDATE_COOLDOWN_MS = 3 * 60 * 1000;
export const LOBBY_AVATAR_COOLDOWN_NOTICE_MS = 4 * 1000;
export const LOBBY_AVATAR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const LOBBY_AVATAR_ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
];

export const READY_NICKNAME_REQUIRED_MESSAGE =
    'Set your nickname before marking yourself ready.';

export const START_GAME_NICKNAME_REQUIRED_MESSAGE =
    'Every player needs a nickname before the game can start.';

export const START_GAME_MIN_PLAYERS_REQUIRED_MESSAGE =
    'At least 2 players are required to start the game.';

export const START_GAME_VALIDATION_MESSAGE =
    'All players must be ready before the game can start.';

export const START_GAME_PREPARE_CHARACTERS_ERROR_MESSAGE =
    'Could not prepare player characters. Run the latest Supabase character SQL and try again.';
