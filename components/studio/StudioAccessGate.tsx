'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';

export default function StudioAccessGate({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Studio');
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session || data.session.user.is_anonymous) {
        router.replace('/login?next=/studio');
        return;
      }
      setAllowed(true);
    });
    return () => { active = false; };
  }, [router]);

  if (!allowed) return <div className="grid min-h-screen place-items-center bg-[#0B1020] font-montserrat text-sm text-white/45">{t('checkingAccess')}</div>;
  return children;
}
