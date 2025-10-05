/**
 * ============================================
 * CRYPTO UTILITIES - PASSWORD HASHING
 * ============================================
 *
 * Utilidades para hash y verificación de passwords usando bcrypt
 */

import bcrypt from 'bcrypt';
import { AuthError, AuthErrorCode, type HashPasswordOptions, type ComparePasswordResult } from './types';

// Configuración
const DEFAULT_SALT_ROUNDS = 12;
const RECOMMENDED_SALT_ROUNDS = 12; // Para verificar si necesita rehash

/**
 * Hashea un password usando bcrypt
 *
 * @param password - Password en texto plano
 * @param options - Opciones de hashing (saltRounds)
 * @returns Hash del password
 * @throws {AuthError} Si el password está vacío o hay error en bcrypt
 *
 * @example
 * const hash = await hashPassword('MySecurePass123!');
 * // Returns: $2b$12$...
 */
export async function hashPassword(
  password: string,
  options: HashPasswordOptions = {}
): Promise<string> {
  try {
    // Validar que el password no esté vacío
    if (!password || password.trim().length === 0) {
      throw new AuthError(
        AuthErrorCode.INVALID_PASSWORD,
        'La contraseña no puede estar vacía'
      );
    }

    const saltRounds = options.saltRounds ?? DEFAULT_SALT_ROUNDS;

    // Validar salt rounds
    if (saltRounds < 10 || saltRounds > 15) {
      throw new AuthError(
        AuthErrorCode.INTERNAL_ERROR,
        'Los rounds de salt deben estar entre 10 y 15',
        { saltRounds }
      );
    }

    // Generar hash
    const hash = await bcrypt.hash(password, saltRounds);

    return hash;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    throw new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'Error al hashear contraseña',
      { originalError: error }
    );
  }
}

/**
 * Compara un password en texto plano con un hash
 *
 * @param password - Password en texto plano
 * @param hash - Hash bcrypt a comparar
 * @returns Resultado de la comparación con flag de rehash si es necesario
 * @throws {AuthError} Si alguno de los parámetros está vacío
 *
 * @example
 * const result = await comparePassword('MySecurePass123!', storedHash);
 * if (result.isValid) {
 *   if (result.needsRehash) {
 *     // Actualizar hash con salt rounds más recientes
 *   }
 *   // Password correcto
 * }
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<ComparePasswordResult> {
  try {
    // Validar inputs
    if (!password || password.trim().length === 0) {
      throw new AuthError(
        AuthErrorCode.INVALID_PASSWORD,
        'La contraseña no puede estar vacía'
      );
    }

    if (!hash || hash.trim().length === 0) {
      throw new AuthError(
        AuthErrorCode.INVALID_PASSWORD,
        'El hash no puede estar vacío'
      );
    }

    // Verificar formato del hash (debe empezar con $2b$ o $2a$)
    if (!hash.startsWith('$2b$') && !hash.startsWith('$2a$')) {
      throw new AuthError(
        AuthErrorCode.INVALID_PASSWORD,
        'Formato de hash bcrypt inválido'
      );
    }

    // Comparar password
    const isValid = await bcrypt.compare(password, hash);

    // Verificar si necesita rehash (salt rounds antiguos)
    let needsRehash = false;
    if (isValid) {
      // Extraer salt rounds del hash existente
      const rounds = parseInt(hash.split('$')[2], 10);
      needsRehash = rounds < RECOMMENDED_SALT_ROUNDS;
    }

    return {
      isValid,
      needsRehash,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    throw new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'Error al comparar contraseña',
      { originalError: error }
    );
  }
}

/**
 * Verifica si un hash de password necesita ser rehashed
 * debido a salt rounds desactualizados
 *
 * @param hash - Hash bcrypt a verificar
 * @returns true si necesita rehash
 *
 * @example
 * if (needsRehash(user.password)) {
 *   const newHash = await hashPassword(plainPassword);
 *   await updateUserPassword(user.id, newHash);
 * }
 */
export function needsRehash(hash: string): boolean {
  try {
    if (!hash.startsWith('$2b$') && !hash.startsWith('$2a$')) {
      return false;
    }

    const rounds = parseInt(hash.split('$')[2], 10);
    return rounds < RECOMMENDED_SALT_ROUNDS;
  } catch {
    return false;
  }
}

/**
 * Genera un salt de forma manual (uso avanzado)
 * Normalmente bcrypt.hash genera el salt automáticamente
 *
 * @param rounds - Número de rounds (default: 12)
 * @returns Salt generado
 */
export async function generateSalt(rounds: number = DEFAULT_SALT_ROUNDS): Promise<string> {
  try {
    return await bcrypt.genSalt(rounds);
  } catch (error) {
    throw new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'Error al generar salt',
      { originalError: error }
    );
  }
}

/**
 * Estima el tiempo de hashing basado en salt rounds
 * Útil para testing y optimización
 *
 * @param rounds - Número de rounds
 * @returns Tiempo estimado en milisegundos
 */
export function estimateHashTime(rounds: number): number {
  // Aproximación: cada round duplica el tiempo
  // Base: ~50ms para round 10
  const baseTime = 50;
  return baseTime * Math.pow(2, rounds - 10);
}
