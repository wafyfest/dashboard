import type { Metadata } from 'next';
import { Outfit, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { FestProvider } from '@/lib/context/FestContext';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://wafyfest.org'),
  title: {
    default: '14th Wafy Arts Fest | Official Fest Management Portal',
    template: '%s | 14th Wafy Arts Fest',
  },
  description: 'Official enterprise management portal for the 14th Wafy Arts Fest, organized by Wafy Students Federation (WSF) under Coordination of Islamic Colleges (CIC). Featuring live stage calls, blind judging, admit cards, and real-time tabulation.',
  keywords: [
    'Wafy Arts Fest',
    'WSF',
    'CIC',
    'Coordination of Islamic Colleges',
    'Arts Fest Management',
    'Student Portal',
    'Admit Card',
    'Live Stage Tracking',
    'Inter-College Fest',
  ],
  authors: [{ name: 'Wafy Students Federation' }, { name: 'Coordination of Islamic Colleges' }],
  creator: 'WSF IT & Tabulation Directorate',
  publisher: 'Coordination of Islamic Colleges (CIC)',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://wafyfest.org',
    siteName: '14th Wafy Arts Fest',
    title: '14th Wafy Arts Fest | Official Fest Management Portal',
    description: 'Enterprise multi-tenant Arts Fest Management System organized by WSF under CIC with live stage calls, blind judging, and instant admit cards.',
  },
  twitter: {
    card: 'summary_large_image',
    title: '14th Wafy Arts Fest | Official Fest Management Portal',
    description: 'Enterprise multi-tenant Arts Fest Management System organized by WSF under CIC.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
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
      <body className="min-h-screen flex flex-col antialiased bg-[var(--bg-page)] text-[var(--text-primary)] selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-150">
        <AnalyticsTracker />
        <FestProvider>
          {children}
        </FestProvider>
      </body>
    </html>
  );
}
