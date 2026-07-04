import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

import { montserrat, montserratAlternates } from './fonts';
import SessionExitProvider from '@/features/session-exit/SessionExitProvider';

export const metadata: Metadata = {
  title: 'Vitruvius',
  description: 'Vitruvius project',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${montserrat.variable} ${montserratAlternates.variable} min-h-screen overflow-x-hidden bg-[#0B1020] text-white`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionExitProvider>{children}</SessionExitProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
