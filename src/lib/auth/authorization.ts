/**
 * ============================================
 * AUTHORIZATION UTILITIES
 * ============================================
 *
 * Sistema de autorización para verificar permisos y roles de usuario
 * Combina verificación de JWT + queries a base de datos
 */

import { cookies } from 'next/headers';
import { prisma } from '@/actions/utils';
import { User, UserRole } from '@/generated/prisma';
import { verifyToken, AuthError, AuthErrorCode } from './jwt';

// Configuración
const COOKIE_NAME = 'auth-token';

/**
 * Error de autorización personalizado
 */
export class AuthorizationError extends Error {
  constructor(
    public code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND',
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Obtiene el usuario actual desde cookie/JWT
 * Verifica el token y obtiene el usuario completo de la base de datos
 *
 * @returns Usuario completo o null si no está autenticado
 *
 * @example
 * const user = await getCurrentAuthUser();
 * if (user) {
 *   console.log('User:', user.email);
 * }
 */
export async function getCurrentAuthUser(): Promise<User | null> {
  try {
    // 1. Obtener token de la cookie
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    // 2. Verificar y decodificar JWT
    let payload;
    try {
      payload = verifyToken(token);
      if (!payload || !payload.userId) {
        return null;
      }
    } catch (error) {
      // Token inválido o expirado
      return null;
    }

    // 3. Obtener usuario completo de la base de datos
    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
        isDeleted: false,
      },
    });

    // 4. Verificar que el usuario esté activo
    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error getting current auth user:', error);
    return null;
  }
}

/**
 * Requiere que el usuario esté autenticado
 * Lanza error si no está autenticado
 *
 * @returns Usuario autenticado
 * @throws {AuthorizationError} Si no está autenticado
 *
 * @example
 * const user = await requireAuth();
 * // Si llega aquí, user siempre existe
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentAuthUser();

  if (!user) {
    throw new AuthorizationError(
      'UNAUTHORIZED',
      'Se requiere autenticación. Por favor inicie sesión para continuar.'
    );
  }

  return user;
}

/**
 * Requiere que el usuario sea ADMIN
 * Lanza error si no es ADMIN
 *
 * @returns Usuario ADMIN
 * @throws {AuthorizationError} Si no es ADMIN
 *
 * @example
 * const admin = await requireAdmin();
 * // Solo admins llegan aquí
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();

  if (user.role !== 'ADMIN') {
    throw new AuthorizationError(
      'FORBIDDEN',
      'Se requiere acceso de administrador. Esta acción está restringida a administradores.',
      { userRole: user.role }
    );
  }

  return user;
}

/**
 * Requiere que el usuario pertenezca a una organización específica
 * Lanza error si no pertenece
 *
 * @param orgId - ID de la organización requerida
 * @returns Usuario de la organización
 * @throws {AuthorizationError} Si no pertenece a la organización
 *
 * @example
 * const user = await requireOrganization('org-123');
 * // Solo usuarios de org-123 llegan aquí
 */
export async function requireOrganization(orgId: string): Promise<User> {
  const user = await requireAuth();

  if (!user.organizationId) {
    throw new AuthorizationError(
      'FORBIDDEN',
      'El usuario debe pertenecer a una organización para acceder a este recurso.'
    );
  }

  if (user.organizationId !== orgId) {
    throw new AuthorizationError(
      'FORBIDDEN',
      'Acceso denegado. No tiene permiso para acceder a esta organización.',
      {
        userOrganizationId: user.organizationId,
        requiredOrganizationId: orgId,
      }
    );
  }

  return user;
}

/**
 * Verifica si el usuario tiene un rol específico
 *
 * @param role - Rol requerido
 * @returns true si el usuario tiene el rol
 *
 * @example
 * const isAdmin = await hasRole('ADMIN');
 * if (isAdmin) {
 *   // Mostrar opciones de admin
 * }
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  try {
    const user = await getCurrentAuthUser();
    return user?.role === role;
  } catch {
    return false;
  }
}

/**
 * Verifica si el usuario puede acceder a una tienda específica
 * Los usuarios ADMIN pueden acceder a cualquier tienda de su organización
 * Los usuarios SELLER solo pueden acceder a su tienda asignada
 *
 * @param storeId - ID de la tienda
 * @returns true si puede acceder
 *
 * @example
 * const canAccess = await canAccessStore('store-123');
 * if (!canAccess) {
 *   return <div>Access denied</div>;
 * }
 */
export async function canAccessStore(storeId: string): Promise<boolean> {
  try {
    const user = await getCurrentAuthUser();

    if (!user) {
      return false;
    }

    // ADMIN puede acceder a cualquier tienda de su organización
    if (user.role === 'ADMIN') {
      // Verificar que la tienda pertenece a la organización del usuario
      const store = await prisma.store.findFirst({
        where: {
          id: storeId,
          organizationId: user.organizationId,
          isDeleted: false,
        },
      });

      return !!store;
    }

    // SELLER solo puede acceder a su tienda asignada
    if (user.role === 'SELLER') {
      return user.storeId === storeId;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Requiere que el usuario pueda acceder a una tienda específica
 * Lanza error si no puede acceder
 *
 * @param storeId - ID de la tienda
 * @returns Usuario con acceso
 * @throws {AuthorizationError} Si no puede acceder
 *
 * @example
 * const user = await requireStoreAccess('store-123');
 * // Solo usuarios con acceso llegan aquí
 */
export async function requireStoreAccess(storeId: string): Promise<User> {
  const user = await requireAuth();

  const hasAccess = await canAccessStore(storeId);

  if (!hasAccess) {
    throw new AuthorizationError(
      'FORBIDDEN',
      'Acceso denegado. No tiene permiso para acceder a esta tienda.',
      {
        userId: user.id,
        userStoreId: user.storeId,
        requestedStoreId: storeId,
        userRole: user.role,
      }
    );
  }

  return user;
}

/**
 * Verifica si el usuario es propietario de un recurso
 * Útil para verificar ownership antes de editar/eliminar
 *
 * @param resourceUserId - ID del usuario propietario del recurso
 * @returns true si es propietario o es ADMIN
 *
 * @example
 * const isOwner = await isResourceOwner(sale.userId);
 * if (!isOwner) {
 *   return { status: 403, message: 'Cannot modify this resource' };
 * }
 */
export async function isResourceOwner(resourceUserId: string): Promise<boolean> {
  try {
    const user = await getCurrentAuthUser();

    if (!user) {
      return false;
    }

    // ADMIN puede modificar cualquier recurso de su organización
    if (user.role === 'ADMIN') {
      return true;
    }

    // SELLER solo puede modificar sus propios recursos
    return user.id === resourceUserId;
  } catch {
    return false;
  }
}

/**
 * Requiere que el usuario sea propietario del recurso
 * Lanza error si no es propietario (excepto ADMIN)
 *
 * @param resourceUserId - ID del usuario propietario del recurso
 * @returns Usuario propietario
 * @throws {AuthorizationError} Si no es propietario
 *
 * @example
 * await requireResourceOwner(sale.userId);
 * // Solo propietario o ADMIN llegan aquí
 */
export async function requireResourceOwner(resourceUserId: string): Promise<User> {
  const user = await requireAuth();

  const isOwner = await isResourceOwner(resourceUserId);

  if (!isOwner) {
    throw new AuthorizationError(
      'FORBIDDEN',
      'Acceso denegado. Solo puede modificar sus propios recursos.',
      {
        userId: user.id,
        resourceUserId,
        userRole: user.role,
      }
    );
  }

  return user;
}

/**
 * Verifica si el usuario tiene la organización configurada
 *
 * @returns true si tiene organización
 *
 * @example
 * const hasOrg = await hasOrganization();
 * if (!hasOrg) {
 *   redirect('/onboarding');
 * }
 */
export async function hasOrganization(): Promise<boolean> {
  try {
    const user = await getCurrentAuthUser();
    return !!user?.organizationId;
  } catch {
    return false;
  }
}

/**
 * Requiere que el usuario tenga una organización configurada
 * Lanza error si no tiene organización
 *
 * @returns Usuario con organización
 * @throws {AuthorizationError} Si no tiene organización
 *
 * @example
 * const user = await requireUserOrganization();
 * // Solo usuarios con organización llegan aquí
 */
export async function requireUserOrganization(): Promise<User> {
  const user = await requireAuth();

  if (!user.organizationId) {
    throw new AuthorizationError(
      'FORBIDDEN',
      'Se requiere organización. Por favor complete el proceso de configuración inicial primero.'
    );
  }

  return user;
}

/**
 * Verifica múltiples permisos a la vez
 * Útil para verificaciones complejas
 *
 * @param checks - Array de funciones de verificación
 * @returns true si todas las verificaciones pasan
 *
 * @example
 * const hasAllPermissions = await checkPermissions([
 *   () => hasRole('ADMIN'),
 *   () => canAccessStore('store-123'),
 * ]);
 */
export async function checkPermissions(
  checks: (() => Promise<boolean>)[]
): Promise<boolean> {
  try {
    const results = await Promise.all(checks.map(check => check()));
    return results.every(result => result === true);
  } catch {
    return false;
  }
}

/**
 * Obtiene el usuario con verificación de organización activa
 * Verifica que tanto el usuario como su organización estén activos
 *
 * @returns Usuario con organización activa
 * @throws {AuthorizationError} Si la organización está inactiva
 *
 * @example
 * const user = await requireActiveOrganization();
 * // Usuario con organización activa
 */
export async function requireActiveOrganization(): Promise<User> {
  const user = await requireUserOrganization();

  // Verificar que la organización esté activa
  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId! },
    select: { isActive: true, isDeleted: true },
  });

  if (!organization || organization.isDeleted) {
    throw new AuthorizationError(
      'NOT_FOUND',
      'Organización no encontrada.'
    );
  }

  if (!organization.isActive) {
    throw new AuthorizationError(
      'FORBIDDEN',
      'La organización está inactiva. Por favor contacte a soporte.',
      { organizationId: user.organizationId }
    );
  }

  return user;
}

/**
 * Verifica si el usuario puede realizar acciones de ADMIN o es el propietario
 * Combina verificación de ADMIN + ownership
 *
 * @param resourceUserId - ID del usuario propietario del recurso
 * @returns true si es ADMIN o propietario
 *
 * @example
 * const canModify = await canModifyResource(sale.userId);
 */
export async function canModifyResource(resourceUserId: string): Promise<boolean> {
  try {
    const user = await getCurrentAuthUser();

    if (!user) {
      return false;
    }

    // ADMIN puede modificar todo
    if (user.role === 'ADMIN') {
      return true;
    }

    // Propietario puede modificar su recurso
    return user.id === resourceUserId;
  } catch {
    return false;
  }
}

/**
 * Obtiene el ID de la organización del usuario actual
 * Helper rápido para obtener solo el organizationId
 *
 * @returns Organization ID o null
 *
 * @example
 * const orgId = await getCurrentUserOrgId();
 */
export async function getCurrentUserOrgId(): Promise<string | null> {
  try {
    const user = await getCurrentAuthUser();
    return user?.organizationId || null;
  } catch {
    return null;
  }
}

/**
 * Obtiene el ID del usuario actual
 * Helper rápido para obtener solo el userId
 *
 * @returns User ID o null
 *
 * @example
 * const userId = await getCurrentUserIdAuth();
 */
export async function getCurrentUserIdAuth(): Promise<string | null> {
  try {
    const user = await getCurrentAuthUser();
    return user?.id || null;
  } catch {
    return null;
  }
}
