/**
 * ============================================
 * AUTH SERVER UTILITIES
 * ============================================
 *
 * Utilidades para autenticación en Server Components
 * Lee headers agregados por el middleware
 */

import { headers } from 'next/headers';

/**
 * Información del usuario extraída de headers del middleware
 */
export interface UserFromHeaders {
  userId: string;
  email: string;
  role: string;
  organizationId: string | null;
  storeId: string | null;
}

/**
 * Obtiene la información del usuario desde los headers del middleware
 * Para usar en Server Components
 *
 * @returns Información del usuario o null si no está autenticado
 *
 * @example
 * // En un Server Component
 * const user = await getUserFromHeaders();
 * if (!user) {
 *   redirect('/auth/login');
 * }
 * console.log('User ID:', user.userId);
 */
export async function getUserFromHeaders(): Promise<UserFromHeaders | null> {
  try {
    const headersList = await headers();

    const userId = headersList.get('x-user-id');
    const email = headersList.get('x-user-email');
    const role = headersList.get('x-user-role');
    const organizationId = headersList.get('x-organization-id');
    const storeId = headersList.get('x-store-id');

    if (!userId || !email || !role) {
      return null;
    }

    return {
      userId,
      email,
      role,
      organizationId: organizationId || null,
      storeId: storeId || null,
    };
  } catch {
    return null;
  }
}

/**
 * Obtiene solo el ID del usuario desde los headers
 *
 * @returns User ID o null
 *
 * @example
 * const userId = await getUserIdFromHeaders();
 */
export async function getUserIdFromHeaders(): Promise<string | null> {
  try {
    const headersList = await headers();
    return headersList.get('x-user-id');
  } catch {
    return null;
  }
}

/**
 * Obtiene solo el organization ID desde los headers
 *
 * @returns Organization ID o null
 *
 * @example
 * const orgId = await getOrganizationIdFromHeaders();
 */
export async function getOrganizationIdFromHeaders(): Promise<string | null> {
  try {
    const headersList = await headers();
    return headersList.get('x-organization-id');
  } catch {
    return null;
  }
}

/**
 * Obtiene solo el store ID desde los headers
 *
 * @returns Store ID o null
 *
 * @example
 * const storeId = await getStoreIdFromHeaders();
 */
export async function getStoreIdFromHeaders(): Promise<string | null> {
  try {
    const headersList = await headers();
    return headersList.get('x-store-id');
  } catch {
    return null;
  }
}

/**
 * Verifica si el usuario tiene un rol específico
 *
 * @param requiredRole - Rol requerido
 * @returns true si el usuario tiene el rol
 *
 * @example
 * const isAdmin = await hasRole('ADMIN');
 * if (!isAdmin) {
 *   return <div>Acceso denegado</div>;
 * }
 */
export async function hasRole(requiredRole: string): Promise<boolean> {
  try {
    const headersList = await headers();
    const role = headersList.get('x-user-role');
    return role === requiredRole;
  } catch {
    return false;
  }
}

/**
 * Verifica si el usuario es ADMIN
 *
 * @returns true si el usuario es admin
 *
 * @example
 * const isAdmin = await isAdminUser();
 */
export async function isAdminUser(): Promise<boolean> {
  return hasRole('ADMIN');
}

/**
 * Obtiene información completa del usuario o lanza error
 * Útil cuando se requiere autenticación obligatoria
 *
 * @throws Error si no hay usuario autenticado
 *
 * @example
 * const user = await requireUser();
 * // Si llega aquí, user siempre existe
 */
export async function requireUser(): Promise<UserFromHeaders> {
  const user = await getUserFromHeaders();

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Obtiene organization ID o lanza error
 * Útil cuando se requiere organización obligatoria
 *
 * @throws Error si no hay organization ID
 *
 * @example
 * const orgId = await requireOrganizationId();
 */
export async function requireOrganizationId(): Promise<string> {
  const orgId = await getOrganizationIdFromHeaders();

  if (!orgId) {
    throw new Error('Organization required');
  }

  return orgId;
}
