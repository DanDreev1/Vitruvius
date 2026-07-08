import { supabase } from '@/lib/supabaseClient';
import { claimAnonymousLobbies } from './claimAnonymousLobbies';

type SignUpWithEmailParams = {
  email: string;
  password: string;
};

export async function signUpWithEmail({
  email,
  password,
}: SignUpWithEmailParams) {
  const { data: previousAuth } = await supabase.auth.getSession();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  await claimAnonymousLobbies(previousAuth.session, data.session);

  return data;
}
