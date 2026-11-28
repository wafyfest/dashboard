import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Dashboard & Hall Ticket',
  description: 'View registered arts events, competition stage timings, live score updates, and download your Hall Ticket.',
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
