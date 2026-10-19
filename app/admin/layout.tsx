import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Central Administration Console',
  description: 'Master administration control dashboard for 14th Wafy Arts Fest settings, colleges, items, registrations, and system security.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
