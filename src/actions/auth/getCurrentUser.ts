'use server';

/**
 * ============================================
 * GET CURRENT USER ACTION
 * ============================================
 *
 * Server action para obtener el usuario autenticado actual
 */

import { cookies } from 'next/headers';
import { prisma } from '@/actions/utils';
import { ActionResponse } from '@/interfaces';
import {
  verifyToken,
  validateSession,
  AuthError,
  AuthErrorCode,
} from '@/lib/auth';

// Configuración
const COOKIE_NAME = 'auth-token';

/**
 * Obtiene los datos del usuario autenticado actual
 *
 * @returns ActionResponse con los datos del usuario o error
 *
 * @example
 * const result = await getCurrentUser();
 * if (result.status === 200) {
 *   console.log('Current user:', result.data.user);
 * }
 */
interface GetCurrentUserResponse {
  user?: Record<string, unknown>;
  organizationDeactivated?: boolean;
  storeDeactivated?: boolean;
  session?: Record<string, unknown>;
}

export async function getCurrentUser(): Promise<ActionResponse<GetCurrentUserResponse>> {
  try {
    // 1. Get token from cookie
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return {
        status: 401,
        message: 'No autenticado',
        data: null,
      };
    }

    // 2. Verify y decode JWT
    let payload;
    try {
      payload = verifyToken(token);

      if (!payload) {
        return {
          status: 401,
          message: 'Token de autenticación inválido',
          data: null,
        };
      }
    } catch (error) {
      if (error instanceof AuthError) {
        // Token expirado o inválido - limpiar cookie
        cookieStore.delete(COOKIE_NAME);

        return {
          status: 401,
          message: error.code === AuthErrorCode.EXPIRED_TOKEN
            ? 'Session expired. Please login again'
            : 'Invalid authentication token',
          data: null,
        };
      }
      throw error;
    }

    // 3. Validar sesión en DB
    try {
      await validateSession(token);
    } catch (error) {
      if (error instanceof AuthError) {
        // Sesión inválida o expirada - limpiar cookie
        cookieStore.delete(COOKIE_NAME);

        return {
          status: 401,
          message: error.code === AuthErrorCode.SESSION_EXPIRED
            ? 'Session expired. Please login again'
            : error.code === AuthErrorCode.SESSION_REVOKED
            ? 'Session has been revoked. Please login again'
            : 'Invalid session',
          data: null,
        };
      }
      throw error;
    }

    // 4. Fetch user data (sin password) con organization y store data
    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
        isDeleted: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        organizationId: true,
        storeId: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,

        // Organization data
        organization: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            isActive: true,
            createdAt: true,
          },
        },

        // Store data
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            isActive: true,
            organizationId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      // Usuario no existe o fue eliminado - limpiar cookie y sesión
      cookieStore.delete(COOKIE_NAME);

      const { invalidateSession } = await import('@/lib/auth');
      await invalidateSession(token).catch(() => {
        // Silenciar error si la sesión ya no existe
      });

      return {
        status: 401,
        message: 'Usuario no encontrado o ha sido eliminado',
        data: null,
      };
    }

    // Verificar que el usuario esté activo
    if (!user.isActive) {
      // Usuario inactivo - limpiar cookie y sesión
      cookieStore.delete(COOKIE_NAME);

      const { invalidateSession } = await import('@/lib/auth');
      await invalidateSession(token).catch(() => {
        // Silenciar error
      });

      return {
        status: 403,
        message: 'La cuenta ha sido desactivada',
        data: null,
      };
    }

    // Verificar organización activa (si aplica)
    if (user.organizationId && user.organization && !user.organization.isActive) {
      return {
        status: 403,
        message: 'Su organización ha sido desactivada',
        data: {
          user,
          organizationDeactivated: true,
        },
      };
    }

    // Verificar tienda activa (si aplica)
    if (user.storeId && user.store && !user.store.isActive) {
      return {
        status: 403,
        message: 'Su tienda ha sido desactivada',
        data: {
          user,
          storeDeactivated: true,
        },
      };
    }

    // 5. Return user con organization y store data
    return {
      status: 200,
      message: 'Usuario obtenido exitosamente',
      data: {
        user,
        session: {
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
          issuedAt: payload.iat ? new Date(payload.iat * 1000) : null,
        },
      },
    };
  } catch (error) {
    console.error('Get current user error:', error);

    if (error instanceof AuthError) {
      return {
        status: 401,
        message: error.message,
        data: error.details || null,
      };
    }

    return {
      status: 500,
      message: 'Error al obtener información del usuario',
      data: null,
    };
  }
}

/**
 * Verifica si hay un usuario autenticado (sin retornar datos completos)
 * Útil para checks rápidos de autenticación
 *
 * @returns ActionResponse con boolean indicando si está autenticado
 */
export async function isAuthenticated(): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return {
        status: 200,
        message: 'No autenticado',
        data: { authenticated: false },
      };
    }

    // Verificar token y sesión
    try {
      const payload = verifyToken(token);
      if (!payload) {
        return {
          status: 200,
          message: 'Token inválido',
          data: { authenticated: false },
        };
      }

      await validateSession(token);

      return {
        status: 200,
        message: 'Autenticado',
        data: {
          authenticated: true,
          userId: payload.userId,
          role: payload.role,
        },
      };
    } catch (error) {
      if (error instanceof AuthError) {
        // Token/sesión inválido - limpiar cookie
        cookieStore.delete(COOKIE_NAME);

        return {
          status: 200,
          message: 'Sesión inválida',
          data: { authenticated: false },
        };
      }
      throw error;
    }
  } catch (error) {
    console.error('Is authenticated error:', error);

    return {
      status: 200,
      message: 'Verificación de autenticación fallida',
      data: { authenticated: false },
    };
  }
}

/**
 * Obtiene el ID del usuario autenticado actual
 * Útil para operaciones que solo necesitan el userId
 *
 * @returns userId o null si no está autenticado
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);
    return payload?.userId || null;
  } catch {
    return null;
  }
}
