/**
 * ============================================
 * SESSION UTILITIES - SESSION MANAGEMENT
 * ============================================
 *
 * Utilidades para crear, validar y gestionar sesiones de usuario
 * Usa Prisma para persistir sesiones en la base de datos
 */

import crypto from 'crypto';
import { prisma } from '@/actions/utils';
import {
  AuthError,
  AuthErrorCode,
  type CreateSessionOptions,
  type SessionData,
  type CleanupSessionsResult
} from './types';
import { generateToken, verifyToken } from './jwt';

// Configuración
const DEFAULT_EXPIRATION_DAYS = 7;
const MAX_SESSIONS_PER_USER = 5; // Limitar sesiones concurrentes

/**
 * Genera un hash SHA-256 de un token
 * Usado para almacenar tokens de sesión de forma segura
 *
 * @param token - Token a hashear
 * @returns Hash SHA-256 del token
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Crea una nueva sesión de usuario
 *
 * @param options - Opciones de creación de sesión
 * @returns Datos de la sesión creada con el token JWT
 * @throws {AuthError} Si el usuario no existe o hay error al crear
 *
 * @example
 * const session = await createSession({
 *   userId: user.id,
 *   ipAddress: req.ip,
 *   userAgent: req.headers['user-agent']
 * });
 * // Returns: { id, userId, token, expiresAt, ... }
 */
export async function createSession(
  options: CreateSessionOptions
): Promise<SessionData & { token: string }> {
  try {
    const { userId, ipAddress, userAgent, deviceId, expirationDays } = options;

    // Validar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        storeId: true,
        isActive: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new AuthError(
        AuthErrorCode.USER_NOT_FOUND,
        'User not found or has been deleted'
      );
    }

    if (!user.isActive) {
      throw new AuthError(
        AuthErrorCode.USER_INACTIVE,
        'User account is inactive'
      );
    }

    // Limpiar sesiones expiradas del usuario
    await cleanupUserSessions(userId);

    // Limitar número de sesiones concurrentes
    const activeSessions = await prisma.session.count({
      where: { userId, isActive: true },
    });

    if (activeSessions >= MAX_SESSIONS_PER_USER) {
      // Eliminar la sesión más antigua
      const oldestSession = await prisma.session.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      if (oldestSession) {
        await prisma.session.update({
          where: { id: oldestSession.id },
          data: { isActive: false },
        });
      }
    }

    // Generar JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      storeId: user.storeId,
    });

    // Hash del token para almacenar
    const tokenHash = hashToken(token);

    // Calcular fecha de expiración
    const days = expirationDays ?? DEFAULT_EXPIRATION_DAYS;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    // Crear sesión en la base de datos
    const session = await prisma.session.create({
      data: {
        userId,
        token: tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
        deviceId,
        isActive: true,
      },
    });

    // Actualizar lastLoginAt del usuario
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        loginAttempts: 0, // Reset intentos fallidos
      },
    });

    return {
      ...session,
      token, // Retornar el token original (no el hash)
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    throw new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'Failed to create session',
      { originalError: error }
    );
  }
}

/**
 * Valida una sesión existente
 *
 * @param token - Token JWT de la sesión
 * @returns Datos de la sesión si es válida, null si no lo es
 * @throws {AuthError} Si el token es inválido o la sesión ha expirado
 *
 * @example
 * const session = await validateSession(token);
 * if (session) {
 *   // Sesión válida, proceder
 *   console.log(session.userId);
 * }
 */
export async function validateSession(token: string): Promise<SessionData | null> {
  try {
    // Verificar y decodificar el token JWT
    const payload = verifyToken(token);

    if (!payload) {
      throw new AuthError(
        AuthErrorCode.INVALID_TOKEN,
        'Invalid token'
      );
    }

    // Hash del token para buscar en DB
    const tokenHash = hashToken(token);

    // Buscar sesión en la base de datos
    const session = await prisma.session.findUnique({
      where: { token: tokenHash },
    });

    if (!session) {
      throw new AuthError(
        AuthErrorCode.SESSION_NOT_FOUND,
        'Session not found'
      );
    }

    // Verificar que la sesión esté activa
    if (!session.isActive) {
      throw new AuthError(
        AuthErrorCode.SESSION_REVOKED,
        'Session has been revoked'
      );
    }

    // Verificar expiración
    if (session.expiresAt < new Date()) {
      // Marcar sesión como inactiva
      await prisma.session.update({
        where: { id: session.id },
        data: { isActive: false },
      });

      throw new AuthError(
        AuthErrorCode.SESSION_EXPIRED,
        'Session has expired'
      );
    }

    // Actualizar última actividad
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    return session;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    throw new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'Failed to validate session',
      { originalError: error }
    );
  }
}

/**
 * Invalida una sesión (logout)
 *
 * @param token - Token JWT de la sesión a invalidar
 * @returns true si la sesión fue invalidada
 * @throws {AuthError} Si hay error al invalidar
 *
 * @example
 * await invalidateSession(token);
 * // Sesión invalidada exitosamente
 */
export async function invalidateSession(token: string): Promise<boolean> {
  try {
    const tokenHash = hashToken(token);

    // Marcar sesión como inactiva
    const result = await prisma.session.updateMany({
      where: {
        token: tokenHash,
        isActive: true,
      },
      data: { isActive: false },
    });

    return result.count > 0;
  } catch (error) {
    throw new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'Failed to invalidate session',
      { originalError: error }
    );
  }
}

/**
 * Invalida todas las sesiones de un usuario
 * Útil para "cerrar sesión en todos los dispositivos"
 *
 * @param userId - ID del usuario
 * @returns Número de sesiones invalidadas
 *
 * @example
 * const count = await invalidateAllUserSessions(userId);
 * console.log(`${count} sesiones cerradas`);
 */
export async function invalidateAllUserSessions(userId: string): Promise<number> {
  try {
    const result = await prisma.session.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: { isActive: false },
    });

    return result.count;
  } catch (error) {
    throw new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'Failed to invalidate user sessions',
      { originalError: error }
    );
  }
}

/**
 * Limpia sesiones expiradas de un usuario específico
 *
 * @param userId - ID del usuario
 * @returns Número de sesiones eliminadas
 */
async function cleanupUserSessions(userId: string): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      userId,
      expiresAt: { lt: new Date() },
    },
  });

  return result.count;
}

/**
 * Limpia todas las sesiones expiradas del sistema
 * Debe ejecutarse periódicamente (ej: cron job diario)
 *
 * @returns Resultado de la limpieza con IDs eliminados
 *
 * @example
 * const result = await cleanExpiredSessions();
 * console.log(`Eliminadas ${result.deletedCount} sesiones expiradas`);
 */
export async function cleanExpiredSessions(): Promise<CleanupSessionsResult> {
  try {
    // Obtener IDs de sesiones expiradas antes de eliminar
    const expiredSessions = await prisma.session.findMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            isActive: false,
            lastActivityAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 días inactivas
          },
        ],
      },
      select: { id: true },
    });

    const sessionIds = expiredSessions.map((s) => s.id);

    // Eliminar sesiones expiradas
    const result = await prisma.session.deleteMany({
      where: { id: { in: sessionIds } },
    });

    return {
      deletedCount: result.count,
      expiredSessions: sessionIds,
    };
  } catch (error) {
    throw new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'Failed to cleanup expired sessions',
      { originalError: error }
    );
  }
}

/**
 * Obtiene todas las sesiones activas de un usuario
 *
 * @param userId - ID del usuario
 * @returns Lista de sesiones activas
 *
 * @example
 * const sessions = await getUserActiveSessions(userId);
 * sessions.forEach(s => {
 *   console.log(`Device: ${s.userAgent}, Last active: ${s.lastActivityAt}`);
 * });
 */
export async function getUserActiveSessions(userId: string): Promise<SessionData[]> {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    return sessions;
  } catch (error) {
    throw new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'Failed to get user sessions',
      { originalError: error }
    );
  }
}

/**
 * Verifica si un usuario tiene sesiones activas
 *
 * @param userId - ID del usuario
 * @returns true si el usuario tiene al menos una sesión activa
 */
export async function hasActiveSession(userId: string): Promise<boolean> {
  const count = await prisma.session.count({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
  });

  return count > 0;
}

/**
 * Renueva una sesión existente
 * Extiende la fecha de expiración sin crear una nueva sesión
 *
 * @param token - Token de la sesión actual
 * @param additionalDays - Días adicionales de validez (default: 7)
 * @returns Nueva fecha de expiración
 *
 * @example
 * const newExpiration = await renewSession(token);
 * console.log(`Sesión renovada hasta: ${newExpiration}`);
 */
export async function renewSession(
  token: string,
  additionalDays: number = DEFAULT_EXPIRATION_DAYS
): Promise<Date> {
  try {
    const tokenHash = hashToken(token);

    const newExpiration = new Date();
    newExpiration.setDate(newExpiration.getDate() + additionalDays);

    const session = await prisma.session.update({
      where: { token: tokenHash },
      data: {
        expiresAt: newExpiration,
        lastActivityAt: new Date(),
      },
    });

    return session.expiresAt;
  } catch (error) {
    throw new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'Failed to renew session',
      { originalError: error }
    );
  }
}
