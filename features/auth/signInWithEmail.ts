import { supabase } from '@/lib/supabaseClient';
import { claimAnonymousLobbies } from './claimAnonymousLobbies';

type SignInWithEmailParams = {
  email: string;
  password: string;
};

export async function signInWithEmail({
  email,
  password,
}: SignInWithEmailParams) {
  const { data: previousAuth } = await supabase.auth.getSession();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  await claimAnonymousLobbies(previousAuth.session, data.session);

  return data;
}
