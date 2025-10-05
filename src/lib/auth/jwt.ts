/**
 * ============================================
 * JWT UTILITIES - TOKEN GENERATION & VERIFICATION
 * ============================================
 *
 * Utilidades para crear y verificar JSON Web Tokens
 * Usa jsonwebtoken para Node.js runtime (Server Actions, API Routes)
 */

import jwt from 'jsonwebtoken';
import { AuthError, AuthErrorCode, type JWTPayload, type TokenGenerationOptions, type VerifyTokenResult } from './types';

// Configuración
const DEFAULT_EXPIRATION = '7d'; // 7 días
const DEFAULT_ALGORITHM = 'HS256';

/**
 * Obtiene el JWT secret desde las variables de entorno
 * @throws {AuthError} Si JWT_SECRET no está definido
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'JWT_SECRET no está definido en las variables de entorno'
    );
  }

  if (secret.length < 32) {
    throw new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'JWT_SECRET debe tener al menos 32 caracteres',
      { length: secret.length }
    );
  }

  return secret;
}

/**
 * Genera un JWT token
 *
 * @param payload - Datos a incluir en el token
 * @param options - Opciones de generación (expiresIn, algorithm)
 * @returns JWT token firmado
 * @throws {AuthError} Si el payload es inválido o falta JWT_SECRET
 *
 * @example
 * const token = generateToken({
 *   userId: user.id,
 *   email: user.email,
 *   role: user.role,
 *   organizationId: user.organizationId,
 *   storeId: user.storeId
 * });
 */
export function generateToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  options: TokenGenerationOptions = {}
): string {
  try {
    // Validar payload
    if (!payload.userId || !payload.email) {
      throw new AuthError(
        AuthErrorCode.INVALID_TOKEN,
        'El payload del token debe incluir userId y email',
        { payload }
      );
    }

    const secret = getJWTSecret();
    const expiresIn = options.expiresIn ?? DEFAULT_EXPIRATION;
    const algorithm = options.algorithm ?? DEFAULT_ALGORITHM;

    // Generar token
    const token = jwt.sign(
      payload,
      secret,
      {
        expiresIn: expiresIn as string | number,
        algorithm: algorithm as jwt.Algorithm,
      }
    );

    return token;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    throw new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'Error al generar token',
      { originalError: error }
    );
  }
}

/**
 * Verifica y decodifica un JWT token
 *
 * @param token - JWT token a verificar
 * @returns Payload decodificado o null si es inválido
 * @throws {AuthError} Si el token es malformado o ha expirado
 *
 * @example
 * const payload = verifyToken(token);
 * if (payload) {
 *   // Token válido, usar payload
 *   console.log(payload.userId);
 * }
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    if (!token || token.trim().length === 0) {
      throw new AuthError(
        AuthErrorCode.INVALID_TOKEN,
        'El token no puede estar vacío'
      );
    }

    const secret = getJWTSecret();

    // Verificar token
    const decoded = jwt.verify(token, secret) as JWTPayload;

    // Validar que el payload tiene los campos requeridos
    if (!decoded.userId || !decoded.email) {
      throw new AuthError(
        AuthErrorCode.MALFORMED_TOKEN,
        'El payload del token está faltando campos requeridos',
        { decoded }
      );
    }

    return decoded;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    // Errores específicos de jsonwebtoken
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthError(
        AuthErrorCode.EXPIRED_TOKEN,
        'El token ha expirado',
        { expiredAt: error.expiredAt }
      );
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthError(
        AuthErrorCode.INVALID_TOKEN,
        'El token es inválido',
        { message: error.message }
      );
    }

    throw new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'Error al verificar token',
      { originalError: error }
    );
  }
}

/**
 * Verifica un token sin lanzar excepciones
 * Útil cuando quieres manejar el error de forma custom
 *
 * @param token - JWT token a verificar
 * @returns Objeto con payload y error (si aplica)
 *
 * @example
 * const result = safeVerifyToken(token);
 * if (result.payload) {
 *   // Token válido
 * } else {
 *   console.error('Token error:', result.error);
 * }
 */
export function safeVerifyToken(token: string): VerifyTokenResult {
  try {
    const payload = verifyToken(token);
    return { payload };
  } catch (error) {
    if (error instanceof AuthError) {
      return { payload: null, error };
    }

    return {
      payload: null,
      error: new AuthError(
        AuthErrorCode.INTERNAL_ERROR,
        'Error inesperado al verificar token',
        { originalError: error }
      ),
    };
  }
}

/**
 * Decodifica un token sin verificar la firma
 * SOLO PARA DEBUG - No usar en producción para autenticación
 *
 * @param token - JWT token a decodificar
 * @returns Payload decodificado (sin verificar)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload | null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verifica si un token está expirado sin validar la firma
 *
 * @param token - JWT token a verificar
 * @returns true si el token está expirado
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JWTPayload | null;

    if (!decoded || !decoded.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch {
    return true;
  }
}

/**
 * Obtiene el tiempo restante de un token en segundos
 *
 * @param token - JWT token
 * @returns Segundos restantes o 0 si está expirado
 */
export function getTokenRemainingTime(token: string): number {
  try {
    const decoded = jwt.decode(token) as JWTPayload | null;

    if (!decoded || !decoded.exp) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const remaining = decoded.exp - now;

    return Math.max(0, remaining);
  } catch {
    return 0;
  }
}

/**
 * Refresca un token si está cerca de expirar
 * Genera un nuevo token con el mismo payload pero nueva expiración
 *
 * @param token - Token actual
 * @param thresholdSeconds - Segundos antes de expiración para refrescar (default: 1 día)
 * @returns Nuevo token si fue refrescado, null si no es necesario
 *
 * @example
 * const newToken = refreshTokenIfNeeded(oldToken);
 * if (newToken) {
 *   // Actualizar token en la sesión
 *   await updateSession(sessionId, newToken);
 * }
 */
export function refreshTokenIfNeeded(
  token: string,
  thresholdSeconds: number = 86400 // 1 día
): string | null {
  try {
    const remaining = getTokenRemainingTime(token);

    if (remaining > thresholdSeconds) {
      return null; // No necesita refresh
    }

    const payload = verifyToken(token);

    if (!payload) {
      return null;
    }

    // Generar nuevo token con mismo payload
    const { iat, exp, ...dataPayload } = payload;
    const newToken = generateToken(dataPayload as Omit<JWTPayload, 'iat' | 'exp'>);

    return newToken;
  } catch {
    return null;
  }
}
