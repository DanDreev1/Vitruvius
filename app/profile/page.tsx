'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Header from '@/components/ui/Header';
import { getCurrentUser } from '@/features/auth/getCurrentUser';
import { signOutUser } from '@/features/auth/signOutUser';

type UserInfo = {
  id: string;
  email?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
          router.push('/login');
          return;
        }

        setUser({
          id: currentUser.id,
          email: currentUser.email,
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOutUser();
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <Header />

      <main className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-[1440px] items-center justify-center px-4 py-10 min-[480px]:min-h-[calc(100vh-68px)] min-[480px]:px-6 min-[768px]:min-h-[calc(100vh-86px)] min-[768px]:px-10">
        <section className="w-full max-w-[680px] rounded-[28px] bg-[#182135] p-4 min-[480px]:p-6 min-[768px]:p-8">
          {isLoading ? (
            <p className="text-center text-white">Loading profile...</p>
          ) : user ? (
            <div className="flex flex-col gap-4">
              <h1 className="font-montserrat-alt text-center text-[32px] font-extrabold text-[#D6B25E] min-[768px]:text-[48px]">
                Profile
              </h1>

              <div className="rounded-[18px] bg-[#0B1020] px-6 py-5 text-white">
                <p className="text-[14px] text-[#8E929B]">User ID</p>
                <p className="mt-1 break-all text-[16px] font-semibold">
                  {user.id}
                </p>
              </div>

              <div className="rounded-[18px] bg-[#0B1020] px-6 py-5 text-white">
                <p className="text-[14px] text-[#8E929B]">Email</p>
                <p className="mt-1 break-all text-[16px] font-semibold">
                  {user.email ?? 'No email'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="btn-primary"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}