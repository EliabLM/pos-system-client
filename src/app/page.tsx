import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';

import { Metadata } from '@/interfaces';

export default async function Home() {
  const user = await currentUser();

  // Si no hay usuario autenticado, Clerk redirige automáticamente al login
  if (!user) {
    redirect('/auth/login');
    return null;
  }

  const metadata = user.publicMetadata as Metadata;

  // Si el onboarding está completo, ir al dashboard
  if (metadata?.onboardingComplete === true) {
    redirect('/dashboard');
  }

  // Si no está completo o no existe, ir al onboarding
  redirect('/onboarding');
}
