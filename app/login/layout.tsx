import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal Sign In',
  description: 'Secure sign in for College Admins, Convenors, Stage Controllers, and Tabulation Officers.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
