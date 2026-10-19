import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Convenor Control Center',
  description: 'Stage scheduling, jury assignment, moderation control, and overall competition operational oversight.',
};

export default function ConvenorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
