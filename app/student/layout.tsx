import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Dashboard & Admit Card',
  description: 'View registered arts events, competition stage timings, live score updates, and download your Admit Card.',
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
