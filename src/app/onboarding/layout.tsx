import { redirect } from 'next/navigation';
import { getUserFromHeaders } from '@/lib/auth/server';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromHeaders();

  // If no user, middleware will redirect to login
  // If user has organizationId, they've completed onboarding
  if (user?.organizationId) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
