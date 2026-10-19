import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blind Judging & Result Entry',
  description: 'Double-blind scoring system, judge scorecard entry, and tabulation verification console.',
};

export default function ResultEntryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
