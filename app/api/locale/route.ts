import { cookies } from 'next/headers';

import { isLocale, localeCookieName } from '@/i18n/config';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { locale?: unknown } | null;
  if (!isLocale(body?.locale)) {
    return Response.json({ error: 'Unsupported locale.' }, { status: 400 });
  }

  (await cookies()).set(localeCookieName, body.locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return Response.json({ locale: body.locale });
}
