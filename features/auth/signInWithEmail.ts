import { supabase } from '@/lib/supabaseClient';

type SignInWithEmailParams = {
  email: string;
  password: string;
};

export async function signInWithEmail({
  email,
  password,
}: SignInWithEmailParams) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}