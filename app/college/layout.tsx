import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'College Dashboard',
  description: 'Manage institutional student registrations, category quotas, participant rosters, and print official admit cards.',
};

export default function CollegeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
