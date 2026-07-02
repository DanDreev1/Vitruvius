'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import ScaledPageViewport from '@/components/layout/ScaledPageViewport';
import Header from '@/components/ui/Header';
import { signUpWithEmail } from '@/features/auth/signUpWithEmail';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignUp = async () => {
    if (!email.trim() || !password || !passwordConfirmation) {
      setErrorMessage('Fill in all fields.');
      return;
    }
    if (password !== passwordConfirmation) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setErrorMessage('');
      setIsSubmitting(true);
      const result = await signUpWithEmail({ email: email.trim(), password });
      router.push(result.session ? '/' : '/login');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScaledPageViewport headerBackdrop>
      <Header fixedLayout />
      <main className="mx-auto flex h-[780px] w-full max-w-[1440px] items-center justify-center px-10 py-9">
        <section className="w-full max-w-[620px] rounded-[28px] bg-[#182135] p-8">
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h1 className="font-montserrat-alt text-[44px] font-extrabold text-[#D6B25E]">Create account</h1>
              <p className="mt-2 font-montserrat text-[14px] text-white/50">Save your characters, worlds, and profile.</p>
            </div>

            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" autoComplete="email" className="h-[66px] w-full rounded-[18px] border border-white/10 bg-[#0B1020] px-6 text-[18px] font-bold text-white outline-none placeholder:text-[#8E929B] focus:border-[#D6B25E]" />
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete="new-password" className="h-[66px] w-full rounded-[18px] border border-white/10 bg-[#0B1020] px-6 text-[18px] font-bold text-white outline-none placeholder:text-[#8E929B] focus:border-[#D6B25E]" />
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(event) => {
                setPasswordConfirmation(event.target.value);
                if (errorMessage === 'Passwords do not match.') setErrorMessage('');
              }}
              onKeyDown={(event) => { if (event.key === 'Enter') void handleSignUp(); }}
              placeholder="Confirm password"
              autoComplete="new-password"
              className={`h-[66px] w-full rounded-[18px] border bg-[#0B1020] px-6 text-[18px] font-bold text-white outline-none placeholder:text-[#8E929B] ${passwordConfirmation && password !== passwordConfirmation ? 'border-red-400/60' : 'border-white/10 focus:border-[#D6B25E]'}`}
            />

            <button type="button" onClick={() => void handleSignUp()} disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
            <button type="button" onClick={() => router.push('/login')} disabled={isSubmitting} className="btn-secondary">Back to login</button>

            {errorMessage ? <p className="text-center text-[14px] font-semibold text-[#FF7A7A]">{errorMessage}</p> : null}
          </div>
        </section>
      </main>
    </ScaledPageViewport>
  );
}
