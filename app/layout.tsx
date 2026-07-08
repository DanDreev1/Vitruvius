import type { Metadata, Viewport } from 'next';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

import { montserrat, montserratAlternates } from './fonts';
import PwaServiceWorker from '@/components/layout/PwaServiceWorker';
import RootClientProviders from '@/components/layout/RootClientProviders';
import { defaultLocale, isLocale } from '@/i18n/config';

export const metadata: Metadata = {
  applicationName: 'Vitruvius',
  title: 'Vitruvius',
  description: 'Vitruvius project',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Vitruvius',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B1020',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestedLocale = await getLocale();
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${montserrat.variable} ${montserratAlternates.variable} min-h-screen overflow-x-hidden bg-[#0B1020] text-white`}
      >
        <RootClientProviders locale={locale} messages={messages}>
          {children}
        </RootClientProviders>
        <PwaServiceWorker />
      </body>
    </html>
  );
}
