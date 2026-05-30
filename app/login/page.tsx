'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import Header from '@/components/ui/Header';
import { signInWithEmail } from '@/features/auth/signInWithEmail';
import { signUpWithEmail } from '@/features/auth/signUpWithEmail';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async () => {
    try {
      setErrorMessage('');
      setIsSigningIn(true);

      await signInWithEmail({ email, password });
      router.push('/');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to sign in.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async () => {
    try {
      setErrorMessage('');
      setIsSigningUp(true);

      await signUpWithEmail({ email, password });
      router.push('/');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to sign up.'
      );
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <>
      <Header />

      <main className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-[1440px] items-center justify-center px-4 py-10 min-[480px]:min-h-[calc(100vh-68px)] min-[480px]:px-6 min-[768px]:min-h-[calc(100vh-86px)] min-[768px]:px-10">
        <section className="w-full max-w-[680px] rounded-[28px] bg-[#182135] p-4 min-[480px]:p-6 min-[768px]:p-8">
          <div className="flex flex-col gap-4">
            <h1 className="font-montserrat-alt text-center text-[32px] font-extrabold text-[#D6B25E] min-[768px]:text-[48px]">
              Login
            </h1>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-[18px] border border-white/10 bg-[#0B1020] px-6 py-[25px] text-[20px] font-bold leading-none text-white outline-none placeholder:text-[#8E929B] focus:border-[#D6B25E]"
            />

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-[18px] border border-white/10 bg-[#0B1020] px-6 py-[25px] text-[20px] font-bold leading-none text-white outline-none placeholder:text-[#8E929B] focus:border-[#D6B25E]"
            />

            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningIn || isSigningUp}
              className="btn-primary"
            >
              {isSigningIn ? 'Signing in...' : 'Login'}
            </button>

            <button
              type="button"
              onClick={handleSignUp}
              disabled={isSigningUp || isSigningIn}
              className="btn-secondary"
            >
              {isSigningUp ? 'Creating account...' : 'Create account'}
            </button>

            {errorMessage ? (
              <p className="text-center text-[14px] font-semibold text-[#FF7A7A] min-[768px]:text-[16px]">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}