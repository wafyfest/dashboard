import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Data privacy principles, student identity protection, blind judging confidentiality, and data handling standards for the 14th Wafy Arts Fest.',
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
