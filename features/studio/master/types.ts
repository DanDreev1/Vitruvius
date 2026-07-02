export type WorldImage = { id: string; title: string; image_url: string; storage_path: string | null; mime_type: string | null; sort_order: number; is_active: boolean };
export type WorldMusic = { id: string; title: string; audio_url: string; cover_url: string | null; sort_order: number; is_active: boolean };
export type WorldNpc = { id: string; name: string; description: string; avatar_url: string | null; display_url: string | null; sort_order: number };
export type WorldAsset = { id: string; asset_key: string; name: string; description: string; category: string; image_url: string | null; display_url: string | null; sort_order: number };
export type WorldNote = { id: string; title: string; content: string | null; position_x: number; position_y: number };
export type StudioWorldData = { world: { id: string; name: string; avatar_url: string | null }; images: WorldImage[]; music: WorldMusic[]; npcs: WorldNpc[]; assets: WorldAsset[]; notes: WorldNote[] };
export type WorldCollection = 'images' | 'music' | 'npcs' | 'assets' | 'notes';
