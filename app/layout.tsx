import type { Metadata } from 'next';
import './globals.css';
import { FestProvider } from '@/lib/context/FestContext';

export const metadata: Metadata = {
  title: 'Arts Fest Portal | Inter-College Arts Fest Management System',
  description: 'Enterprise multi-tenant Arts Fest Management System with RBAC, capacity checks, blind judging, and live stage tracking.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans antialiased selection:bg-[#132238] selection:text-white">
        <FestProvider>
          {children}
        </FestProvider>
      </body>
    </html>
  );
}
