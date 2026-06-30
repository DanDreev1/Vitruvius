import type { Metadata } from 'next';
import './globals.css';

import { montserrat, montserratAlternates } from './fonts';
import SessionExitProvider from '@/features/session-exit/SessionExitProvider';

export const metadata: Metadata = {
  title: 'Vitruvius',
  description: 'Vitruvius project',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} ${montserratAlternates.variable} min-h-screen overflow-x-hidden bg-[#0B1020] text-white`}
      >
        <SessionExitProvider>{children}</SessionExitProvider>
      </body>
    </html>
  );
}
