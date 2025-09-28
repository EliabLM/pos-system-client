import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Metadata } from '@/interfaces';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const metadata = user?.publicMetadata as Metadata;

  if (metadata?.onboardingComplete === true) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
