import type { Metadata } from 'next';
import './globals.css';

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
      <body className="min-h-screen bg-[#0B1020] text-white">
        {children}
      </body>
    </html>
  );
}