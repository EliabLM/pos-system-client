'use server';

/**
 * ============================================
 * REFRESH TOKEN ACTION
 * ============================================
 *
 * Server action para refrescar el token JWT después de
 * actualizar datos del usuario (ej: organizationId)
 */

import { cookies } from 'next/headers';
import { prisma } from '@/actions/utils';
import { ActionResponse } from '@/interfaces';
import { createSession } from '@/lib/auth';
import { AuthError, AuthErrorCode } from '@/lib/auth/types';

const COOKIE_NAME = 'auth-token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 días en segundos

/**
 * Refresca el token JWT del usuario actual
 * Útil después de actualizar datos críticos como organizationId
 *
 * @param userId - ID del usuario
 * @returns ActionResponse con el usuario actualizado
 */
interface RefreshTokenResponse {
  user?: Record<string, unknown>;
  token?: string;
  sessionId?: string;
}

export async function refreshToken(userId: string): Promise<ActionResponse<RefreshTokenResponse>> {
  try {
    if (!userId) {
      console.error('[RefreshToken] Error: userId no proporcionado');
      return {
        status: 400,
        message: 'El ID de usuario es requerido',
        data: null,
      };
    }

    // Obtener usuario actualizado de la base de datos
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        isDeleted: false,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        role: true,
        organizationId: true,
        storeId: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      console.error('[RefreshToken] Usuario no encontrado o inactivo:', userId);
      return {
        status: 404,
        message: 'Usuario no encontrado o inactivo',
        data: null,
      };
    }

    // Crear nueva sesión con JWT actualizado
    const { headers } = await import('next/headers');
    const headersList = await headers();
    const ipAddress =
      headersList.get('x-forwarded-for') ||
      headersList.get('x-real-ip') ||
      undefined;
    const userAgent = headersList.get('user-agent') || undefined;

    const session = await createSession({
      userId: user.id,
      ipAddress,
      userAgent,
      expirationDays: 7,
    });

    // Actualizar cookie con nuevo token
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return {
      status: 200,
      message: 'Token actualizado exitosamente',
      data: {
        user,
        sessionId: session.id,
      },
    };
  } catch (error) {
    console.error('[RefreshToken] Error en refresh token:', error);

    // Manejo específico de errores de autenticación
    if (error instanceof AuthError) {
      console.error('[RefreshToken] AuthError detectado:', {
        code: error.code,
        message: error.message,
      });

      switch (error.code) {
        case AuthErrorCode.USER_NOT_FOUND:
          return {
            status: 404,
            message: 'Usuario no encontrado',
            data: null,
          };
        case AuthErrorCode.USER_INACTIVE:
          return {
            status: 403,
            message: 'La cuenta de usuario está inactiva',
            data: null,
          };
        case AuthErrorCode.SESSION_EXPIRED:
          return {
            status: 401,
            message: 'La sesión ha expirado',
            data: null,
          };
        default:
          return {
            status: 500,
            message: error.message || 'Error en la autenticación',
            data: null,
          };
      }
    }

    // Error genérico
    return {
      status: 500,
      message: 'Error al actualizar token. Por favor intente más tarde',
      data: null,
    };
  }
}
