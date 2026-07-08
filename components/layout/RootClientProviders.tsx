'use client';

import { NextIntlClientProvider } from 'next-intl';

import SessionExitProvider from '@/features/session-exit/SessionExitProvider';
import type { Locale } from '@/i18n/config';

type RootClientProvidersProps = {
  children: React.ReactNode;
  locale: Locale;
  messages: Record<string, unknown>;
};

export default function RootClientProviders({
  children,
  locale,
  messages,
}: RootClientProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <SessionExitProvider>{children}</SessionExitProvider>
    </NextIntlClientProvider>
  );
}
