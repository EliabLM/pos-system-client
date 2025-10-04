import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function Home() {
  const headersList = await headers();

  // Obtener información del usuario desde los headers del middleware
  const userId = headersList.get('x-user-id');
  const organizationId = headersList.get('x-organization-id');

  // Si no hay usuario autenticado, redirigir al login
  if (!userId) {
    redirect('/auth/login');
  }

  // Si tiene organizationId, el onboarding está completo → ir al dashboard
  if (organizationId) {
    redirect('/dashboard');
  }

  // Si no tiene organizationId, el onboarding no está completo → ir al onboarding
  redirect('/onboarding');
}
