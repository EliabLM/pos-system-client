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

const COOKIE_NAME = 'auth-token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 días en segundos

/**
 * Refresca el token JWT del usuario actual
 * Útil después de actualizar datos críticos como organizationId
 *
 * @param userId - ID del usuario
 * @returns ActionResponse con el usuario actualizado
 */
export async function refreshToken(userId: string): Promise<ActionResponse> {
  try {
    if (!userId) {
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
      secure: process.env.NODE_ENV === 'production',
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
    console.error('Refresh token error:', error);

    return {
      status: 500,
      message: 'Error al actualizar token. Por favor intente más tarde',
      data: null,
    };
  }
}
