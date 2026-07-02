'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getUserProfile, PROFILE_UPDATED_EVENT } from '@/features/profile/api';
import { supabase } from '@/lib/supabaseClient';

type HeaderProps = {
  logoSrc?: string;
  creatorsHref?: string;
  profileHref?: string;
  isAuthenticated?: boolean;
  avatarSrc?: string | null;
  avatarPlaceholderSrc?: string;
  fixedLayout?: boolean;
};

export default function Header({
  logoSrc = '/Logo_Icon.png',
  creatorsHref = '/creators',
  profileHref = '/profile',
  isAuthenticated = false,
  avatarSrc = null,
  avatarPlaceholderSrc = '/Profile_Placeholder.png',
  fixedLayout = false,
}: HeaderProps) {
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(isAuthenticated);

  useEffect(() => {
    const refresh = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(Boolean(data.session?.user && !data.session.user.is_anonymous));
      setProfileAvatar(data.session?.user ? getUserProfile(data.session.user).avatarUrl : null);
    };
    void refresh();
    window.addEventListener(PROFILE_UPDATED_EVENT, refresh);
    const { data: listener } = supabase.auth.onAuthStateChange(() => window.setTimeout(() => void refresh(), 0));
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, refresh);
      listener.subscription.unsubscribe();
    };
  }, []);

  const currentAvatar = (isAuthenticated || hasSession) && (avatarSrc || profileAvatar)
    ? (avatarSrc || profileAvatar) as string
    : avatarPlaceholderSrc;

  return (
    <header
      className={`${fixedLayout ? 'block bg-transparent' : 'hidden min-[500px]:block bg-[#182135]'} relative w-full`}
      style={{
        fontFamily: '"Monsteratt Alternatives", "Montserrat Alternates", sans-serif',
      }}
    >
      <div className={fixedLayout ? 'flex h-[120px] items-center justify-between px-20' : 'flex h-[56px] items-center justify-between px-3 min-[480px]:h-[90px] min-[480px]:px-10 min-[768px]:h-[120px] min-[768px]:px-20'}>
        <Link
          href="/"
          aria-label="Go to home page"
          className="flex items-center gap-2 min-[480px]:gap-3"
        >
          <Image
            src={logoSrc}
            alt="Vitruvius logo"
            priority
            width={160}
            height={90}
            className={fixedLayout ? 'h-[42px] w-auto' : 'h-[22px] w-auto min-[480px]:h-[32px] min-[768px]:h-[42px]'}
          />

          <span className={`font-montserrat-alt select-none font-extrabold leading-none tracking-[-0.03em] text-[#D6B25E] ${fixedLayout ? 'text-[40px]' : 'text-[24px] min-[480px]:text-[26px] min-[768px]:text-[40px]'}`}>
            Vitruvius
          </span>
        </Link>

        <div className="flex items-center gap-3 min-[480px]:gap-5 min-[768px]:gap-7">
          <Link
            href={creatorsHref}
            className={`font-montserrat-alt font-extrabold leading-none text-[#8D8D8D] transition-colors duration-200 hover:text-white ${fixedLayout ? 'text-[22px]' : 'text-[12px] min-[480px]:text-[18px] min-[768px]:text-[22px]'}`}
          >
            Creators
          </Link>

          <Link
            href={profileHref}
            aria-label="Open profile page"
            className={`flex items-center justify-center overflow-hidden rounded-full border border-white bg-black transition-colors duration-200 hover:border-[#D6B25E] ${fixedLayout ? 'h-[48px] w-[48px]' : 'h-[30px] w-[30px] min-[480px]:h-[40px] min-[480px]:w-[40px] min-[768px]:h-[48px] min-[768px]:w-[48px]'}`}
          >
            <Image
              src={currentAvatar}
              alt="Profile avatar"
              width={48}
              height={48}
              unoptimized
              className="h-full w-full object-cover"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
