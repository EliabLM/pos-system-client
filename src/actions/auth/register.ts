'use server';

/**
 * ============================================
 * REGISTER USER ACTION
 * ============================================
 *
 * Server action para registro de nuevos usuarios
 */

import { cookies } from 'next/headers';
import { prisma } from '@/actions/utils';
import { ActionResponse } from '@/interfaces';
import {
  hashPassword,
  validateEmail,
  validatePasswordComplete,
  normalizeEmail,
  createSession,
  AuthError,
  AuthErrorCode,
} from '@/lib/auth';

// Configuración de cookies
const COOKIE_NAME = 'auth-token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 días en segundos

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  organizationId?: string;
  storeId?: string;
}

/**
 * Registra un nuevo usuario en el sistema
 *
 * @param formData - Datos del formulario de registro
 * @returns ActionResponse con el usuario creado o error
 *
 * @example
 * const result = await registerUser(formData);
 * if (result.status === 201) {
 *   // Usuario creado exitosamente
 *   redirect('/dashboard');
 * }
 */
export async function registerUser(formData: FormData): Promise<ActionResponse> {
  try {
    // 1. Extraer y validar datos del formulario
    const data: RegisterFormData = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
      organizationId: formData.get('organizationId') as string | undefined,
      storeId: formData.get('storeId') as string | undefined,
    };

    // Validar campos requeridos
    if (!data.firstName || data.firstName.trim().length === 0) {
      return {
        status: 400,
        message: 'First name is required',
        data: null,
      };
    }

    if (!data.lastName || data.lastName.trim().length === 0) {
      return {
        status: 400,
        message: 'Last name is required',
        data: null,
      };
    }

    if (!data.username || data.username.trim().length === 0) {
      return {
        status: 400,
        message: 'Username is required',
        data: null,
      };
    }

    // 2. Validar email
    try {
      validateEmail(data.email, {
        allowDisposable: false, // No permitir emails desechables
        maxLength: 254,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return {
          status: 400,
          message: error.message,
          data: null,
        };
      }
      throw error;
    }

    // Normalizar email
    const normalizedEmail = normalizeEmail(data.email);

    // 3. Validar password
    try {
      validatePasswordComplete(data.password, data.confirmPassword, {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecialChar: true,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return {
          status: 400,
          message: error.message,
          data: error.details,
        };
      }
      throw error;
    }

    // 4. Verificar que el email no existe (considerar soft delete)
    const existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        isDeleted: false, // Solo usuarios activos
      },
    });

    if (existingUser) {
      return {
        status: 409,
        message: 'A user with this email already exists',
        data: null,
      };
    }

    // Verificar si existe un usuario eliminado con este email
    const deletedUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        isDeleted: true,
      },
    });

    if (deletedUser) {
      return {
        status: 409,
        message: 'This email was previously used. Please contact support to reactivate your account',
        data: null,
      };
    }

    // 5. Hash password con bcrypt
    const hashedPassword = await hashPassword(data.password, {
      saltRounds: 12,
    });

    // 6. Crear usuario en DB
    const newUser = await prisma.user.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: normalizedEmail,
        username: data.username.trim(),
        password: hashedPassword,
        role: 'SELLER', // Role por defecto
        organizationId: data.organizationId || null,
        storeId: data.storeId || null,
        isActive: true,
        isDeleted: false,
        emailVerified: false, // Requerir verificación de email
        passwordChangedAt: new Date(),
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
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 7. Crear sesión y generar JWT
    // Obtener IP y User-Agent de headers (si están disponibles)
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || undefined;
    const userAgent = headersList.get('user-agent') || undefined;

    const session = await createSession({
      userId: newUser.id,
      ipAddress,
      userAgent,
      expirationDays: 7,
    });

    // 8. Set cookie con token (httpOnly, secure, sameSite)
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    // 9. Return success con user data (sin password)
    return {
      status: 201,
      message: 'User registered successfully',
      data: {
        user: newUser,
        sessionId: session.id,
      },
    };
  } catch (error) {
    console.error('Register error:', error);

    if (error instanceof AuthError) {
      return {
        status: 400,
        message: error.message,
        data: error.details || null,
      };
    }

    return {
      status: 500,
      message: 'Failed to register user. Please try again later',
      data: null,
    };
  }
}

// Importar headers dinámicamente para evitar errores de servidor
async function headers() {
  const { headers } = await import('next/headers');
  return headers();
}
