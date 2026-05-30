import { supabase } from '@/lib/supabaseClient';
import { generateRoomCode } from '@/lib/generateRoomCode';

const MAX_ATTEMPTS = 20;

export async function generateUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateRoomCode();

    const { data, error } = await supabase
      .from('live_sessions')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return code;
    }
  }

  throw new Error('Failed to generate a unique room code');
}