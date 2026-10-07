import type { Metadata } from 'next';
import './globals.css';
import { FestProvider } from '@/lib/context/FestContext';

export const metadata: Metadata = {
  title: 'Arts Fest Portal | Inter-College Arts Fest Management System',
  description: 'Enterprise multi-tenant Arts Fest Management System with RBAC, capacity checks, blind judging, and live stage tracking.',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('arts_fest_theme');
                  var isDark = saved ? (saved === 'dark') : window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans antialiased bg-[var(--bg-page)] text-[var(--text-primary)] selection:bg-[#132238] selection:text-white transition-colors duration-150">
        <FestProvider>
          {children}
        </FestProvider>
      </body>
    </html>
  );
}
