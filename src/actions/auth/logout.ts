'use server';

/**
 * ============================================
 * LOGOUT USER ACTION
 * ============================================
 *
 * Server action para cerrar sesión de usuarios
 */

import { cookies } from 'next/headers';
import { ActionResponse } from '@/interfaces';
import {
  invalidateSession,
  AuthError,
} from '@/lib/auth';

// Configuración
const COOKIE_NAME = 'auth-token';

/**
 * Cierra la sesión del usuario actual
 *
 * @returns ActionResponse indicando el resultado del logout
 *
 * @example
 * const result = await logoutUser();
 * if (result.status === 200) {
 *   // Logout exitoso
 *   redirect('/auth/login');
 * }
 */
export async function logoutUser(): Promise<ActionResponse> {
  try {
    // 1. Get token from cookie
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      // No hay token, pero igual limpiamos la cookie por si acaso
      cookieStore.delete(COOKIE_NAME);

      return {
        status: 200,
        message: 'Cierre de sesión exitoso (sin sesión activa)',
        data: null,
      };
    }

    // 2. Invalidar sesión en DB
    try {
      await invalidateSession(token);
    } catch (error) {
      // Si hay error invalidando la sesión (ej: ya estaba invalidada),
      // igual limpiamos la cookie y retornamos success
      console.warn('Error invalidating session:', error);
    }

    // 3. Clear cookie
    cookieStore.delete(COOKIE_NAME);

    // 4. Return success
    return {
      status: 200,
      message: 'Cierre de sesión exitoso',
      data: null,
    };
  } catch (error) {
    console.error('Logout error:', error);

    // Intentar limpiar cookie aunque haya error
    try {
      const cookieStore = await cookies();
      cookieStore.delete(COOKIE_NAME);
    } catch {
      // Silenciar error de cookie
    }

    if (error instanceof AuthError) {
      return {
        status: 400,
        message: error.message,
        data: error.details || null,
      };
    }

    return {
      status: 500,
      message: 'Error al cerrar sesión. Por favor intente nuevamente',
      data: null,
    };
  }
}

/**
 * Cierra todas las sesiones del usuario en todos los dispositivos
 *
 * @returns ActionResponse indicando el resultado
 *
 * @example
 * const result = await logoutAllDevices();
 * if (result.status === 200) {
 *   // Todas las sesiones cerradas
 *   redirect('/auth/login');
 * }
 */
export async function logoutAllDevices(): Promise<ActionResponse> {
  try {
    // Importar dinámicamente para obtener el usuario actual
    const { getCurrentUser } = await import('./getCurrentUser');

    // Obtener usuario actual para obtener su ID
    const userResponse = await getCurrentUser();

    if (userResponse.status !== 200 || !userResponse.data) {
      return {
        status: 401,
        message: 'Usuario no autenticado',
        data: null,
      };
    }

    const userId = (userResponse.data as { user: { id: string } }).user.id;

    // Invalidar todas las sesiones del usuario
    const { invalidateAllUserSessions } = await import('@/lib/auth');
    const sessionsInvalidated = await invalidateAllUserSessions(userId);

    // Limpiar cookie actual
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);

    return {
      status: 200,
      message: `Sesión cerrada exitosamente en ${sessionsInvalidated} dispositivo(s)`,
      data: {
        sessionsInvalidated,
      },
    };
  } catch (error) {
    console.error('Logout all devices error:', error);

    if (error instanceof AuthError) {
      return {
        status: 400,
        message: error.message,
        data: error.details || null,
      };
    }

    return {
      status: 500,
      message: 'Error al cerrar sesión en todos los dispositivos',
      data: null,
    };
  }
}
