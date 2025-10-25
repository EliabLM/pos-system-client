import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

// TODO - CORREGIR eliminación de opciones parametrizable (marcas, métodos de pago, etc.), se queda loader infinito cuando da error.
// TODO - Se realizaron ventas después de 6 pm y en los reportes no se visualizan en la opción hoy.
// TODO - Exportar PDF no funciona en ningún reporte
// TODO - Cambiar el titulo del método de pago en el reporte de ventas por método de pago (están en ingles)
// TODO - Unificar loaders en todas las tablas de parametrización, ventas, productos, inventarios. Loaders primarios y secundarios.
// TODO - Revisar filtro de este mes en reportes de clientes y generales
// TODO - Revisar card total clientes en filtro por tiendas en segmentación de clientes
// TODO - Limpiar interfaz de opciones sin usar de Shadcn/ui

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
