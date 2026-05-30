import { supabase } from '@/lib/supabaseClient';

type SignUpWithEmailParams = {
  email: string;
  password: string;
};

export async function signUpWithEmail({
  email,
  password,
}: SignUpWithEmailParams) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}