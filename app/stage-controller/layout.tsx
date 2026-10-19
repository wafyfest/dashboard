import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Stage Controller',
  description: 'Real-time stage queue controller, participant callouts, chest number tracking, and stage status synchronization.',
};

export default function StageControllerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
