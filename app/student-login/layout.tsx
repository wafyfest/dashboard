import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Portal Login',
  description: 'Sign in with your official CIC Registration Number to access your Admit Card, live stage calls, and competition results.',
};

export default function StudentLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
