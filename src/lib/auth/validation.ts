/**
 * ============================================
 * VALIDATION UTILITIES - EMAIL & PASSWORD
 * ============================================
 *
 * Utilidades para validar emails y passwords
 * Incluye validación de fuerza de contraseña y formato de email
 */

import {
  AuthError,
  AuthErrorCode,
  type PasswordValidationResult,
  type PasswordRequirements
} from './types';

// ============================================
// EMAIL VALIDATION
// ============================================

/**
 * Regex RFC 5322 simplificado para validación de email
 * Cubre la mayoría de casos comunes sin ser demasiado estricto
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Dominios de email desechables conocidos (blacklist)
 * Se puede extender según necesidades
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  'throwaway.email',
  'guerrillamail.com',
  '10minutemail.com',
  'mailinator.com',
  'maildrop.cc',
  'temp-mail.org',
];

/**
 * Valida el formato de un email
 *
 * @param email - Email a validar
 * @param options - Opciones de validación
 * @returns true si el email es válido
 * @throws {AuthError} Si el email es inválido
 *
 * @example
 * validateEmail('user@example.com'); // true
 * validateEmail('invalid-email');    // throws AuthError
 */
export function validateEmail(
  email: string,
  options: {
    allowDisposable?: boolean;
    maxLength?: number;
  } = {}
): boolean {
  const { allowDisposable = false, maxLength = 254 } = options;

  // Validar que no esté vacío
  if (!email || email.trim().length === 0) {
    throw new AuthError(
      AuthErrorCode.INVALID_EMAIL,
      'Email cannot be empty'
    );
  }

  // Normalizar email (lowercase, trim)
  const normalizedEmail = email.toLowerCase().trim();

  // Validar longitud máxima (RFC 5321)
  if (normalizedEmail.length > maxLength) {
    throw new AuthError(
      AuthErrorCode.INVALID_EMAIL,
      `Email cannot be longer than ${maxLength} characters`,
      { length: normalizedEmail.length }
    );
  }

  // Validar formato usando regex
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new AuthError(
      AuthErrorCode.INVALID_EMAIL,
      'Invalid email format',
      { email: normalizedEmail }
    );
  }

  // Verificar dominio desechable (si está habilitado)
  if (!allowDisposable) {
    const domain = normalizedEmail.split('@')[1];
    if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
      throw new AuthError(
        AuthErrorCode.INVALID_EMAIL,
        'Disposable email addresses are not allowed',
        { domain }
      );
    }
  }

  return true;
}

/**
 * Normaliza un email (lowercase y trim)
 *
 * @param email - Email a normalizar
 * @returns Email normalizado
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Extrae el dominio de un email
 *
 * @param email - Email del cual extraer el dominio
 * @returns Dominio del email
 *
 * @example
 * getEmailDomain('user@example.com'); // 'example.com'
 */
export function getEmailDomain(email: string): string {
  const normalized = normalizeEmail(email);
  const parts = normalized.split('@');
  return parts.length === 2 ? parts[1] : '';
}

// ============================================
// PASSWORD VALIDATION
// ============================================

/**
 * Requisitos por defecto de password
 */
const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
};

/**
 * Lista de passwords comunes/débiles (top 100)
 * En producción, usar una lista más extensa desde archivo o DB
 */
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '12345678', 'qwerty',
  'abc123', 'monkey', '1234567', 'letmein', 'trustno1',
  'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123',
  '654321', 'superman', 'qazwsx', 'michael', 'football',
];

/**
 * Valida la fuerza de un password
 *
 * @param password - Password a validar
 * @param requirements - Requisitos personalizados (opcional)
 * @returns Resultado de la validación con errores y nivel de fuerza
 *
 * @example
 * const result = validatePassword('MySecurePass123!');
 * if (!result.valid) {
 *   console.error('Password errors:', result.errors);
 * } else {
 *   console.log('Password strength:', result.strength);
 * }
 */
export function validatePassword(
  password: string,
  requirements: Partial<PasswordRequirements> = {}
): PasswordValidationResult {
  const reqs = { ...DEFAULT_PASSWORD_REQUIREMENTS, ...requirements };
  const errors: string[] = [];

  // Validar que no esté vacío
  if (!password || password.trim().length === 0) {
    return {
      valid: false,
      errors: ['Password cannot be empty'],
    };
  }

  // Validar longitud mínima
  if (password.length < reqs.minLength) {
    errors.push(`Password must be at least ${reqs.minLength} characters long`);
  }

  // Validar mayúsculas
  if (reqs.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Validar minúsculas
  if (reqs.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Validar números
  if (reqs.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Validar caracteres especiales
  if (reqs.requireSpecialChar && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Verificar passwords comunes
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.includes(lowerPassword)) {
    errors.push('This password is too common. Please choose a more unique password');
  }

  // Verificar patrones repetitivos (ej: "aaaa", "1111")
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password cannot contain repetitive characters');
  }

  // Verificar secuencias (ej: "1234", "abcd")
  if (hasSequentialChars(password)) {
    errors.push('Password cannot contain sequential characters');
  }

  // Calcular fuerza del password
  const strength = calculatePasswordStrength(password, errors.length === 0);

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Verifica si un password contiene caracteres secuenciales
 *
 * @param password - Password a verificar
 * @returns true si contiene secuencias
 */
function hasSequentialChars(password: string): boolean {
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    '0123456789',
  ];

  for (const sequence of sequences) {
    for (let i = 0; i < sequence.length - 3; i++) {
      const substring = sequence.substring(i, i + 4);
      if (password.includes(substring)) {
        return true;
      }
      // Verificar secuencia invertida
      if (password.includes(substring.split('').reverse().join(''))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calcula la fuerza de un password
 *
 * @param password - Password a evaluar
 * @param passesValidation - Si pasa las validaciones básicas
 * @returns Nivel de fuerza
 */
function calculatePasswordStrength(
  password: string,
  passesValidation: boolean
): 'weak' | 'medium' | 'strong' | 'very-strong' {
  if (!passesValidation) {
    return 'weak';
  }

  let score = 0;

  // Longitud (max 3 puntos)
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Variedad de caracteres (max 4 puntos)
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;

  // Complejidad adicional (max 2 puntos)
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.6) score++; // Alta variedad
  if (password.length >= 20) score++; // Extra largo

  // Clasificar según puntaje
  if (score >= 8) return 'very-strong';
  if (score >= 6) return 'strong';
  if (score >= 4) return 'medium';
  return 'weak';
}

/**
 * Genera sugerencias para mejorar un password débil
 *
 * @param password - Password a evaluar
 * @returns Lista de sugerencias
 *
 * @example
 * const suggestions = getPasswordSuggestions('password123');
 * // ['Add uppercase letters', 'Add special characters', 'Make it longer']
 */
export function getPasswordSuggestions(password: string): string[] {
  const suggestions: string[] = [];

  if (password.length < 12) {
    suggestions.push('Consider making your password at least 12 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    suggestions.push('Add uppercase letters for better security');
  }

  if (!/[a-z]/.test(password)) {
    suggestions.push('Add lowercase letters for better security');
  }

  if (!/\d/.test(password)) {
    suggestions.push('Add numbers for better security');
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    suggestions.push('Add special characters for better security');
  }

  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    suggestions.push('Avoid common passwords. Use a unique combination');
  }

  if (hasSequentialChars(password)) {
    suggestions.push('Avoid sequential characters (e.g., "1234", "abcd")');
  }

  const uniqueChars = new Set(password).size;
  if (uniqueChars < password.length * 0.5) {
    suggestions.push('Use a wider variety of characters');
  }

  return suggestions;
}

/**
 * Verifica si dos passwords coinciden
 *
 * @param password - Password principal
 * @param confirmPassword - Password de confirmación
 * @returns true si coinciden
 * @throws {AuthError} Si no coinciden
 */
export function verifyPasswordMatch(
  password: string,
  confirmPassword: string
): boolean {
  if (password !== confirmPassword) {
    throw new AuthError(
      AuthErrorCode.PASSWORD_MISMATCH,
      'Passwords do not match'
    );
  }

  return true;
}

/**
 * Valida un password completo (fuerza + confirmación)
 * Helper que combina validatePassword y verifyPasswordMatch
 *
 * @param password - Password a validar
 * @param confirmPassword - Password de confirmación
 * @param requirements - Requisitos personalizados
 * @returns Resultado de validación
 * @throws {AuthError} Si hay errores críticos
 */
export function validatePasswordComplete(
  password: string,
  confirmPassword: string,
  requirements?: Partial<PasswordRequirements>
): PasswordValidationResult {
  // Validar coincidencia
  verifyPasswordMatch(password, confirmPassword);

  // Validar fuerza
  const result = validatePassword(password, requirements);

  if (!result.valid) {
    throw new AuthError(
      AuthErrorCode.WEAK_PASSWORD,
      'Password does not meet security requirements',
      { errors: result.errors }
    );
  }

  return result;
}

/**
 * Estima el tiempo para crackear un password mediante fuerza bruta
 * Basado en la entropía del password
 *
 * @param password - Password a evaluar
 * @returns Tiempo estimado en formato legible
 *
 * @example
 * estimateCrackTime('Password123!'); // '3 months'
 * estimateCrackTime('xK9$mP2@qL5#'); // '100+ years'
 */
export function estimateCrackTime(password: string): string {
  // Calcular el espacio de caracteres
  let charSpace = 0;
  if (/[a-z]/.test(password)) charSpace += 26;
  if (/[A-Z]/.test(password)) charSpace += 26;
  if (/\d/.test(password)) charSpace += 10;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) charSpace += 32;

  // Calcular combinaciones posibles
  const combinations = Math.pow(charSpace, password.length);

  // Asumiendo 1 billón de intentos por segundo (GPU moderna)
  const attemptsPerSecond = 1_000_000_000_000;
  const secondsToCrack = combinations / attemptsPerSecond;

  // Convertir a tiempo legible
  const minutes = secondsToCrack / 60;
  const hours = minutes / 60;
  const days = hours / 24;
  const years = days / 365;

  if (years > 1000) return '1000+ years';
  if (years > 100) return '100+ years';
  if (years > 1) return `${Math.floor(years)} years`;
  if (days > 1) return `${Math.floor(days)} days`;
  if (hours > 1) return `${Math.floor(hours)} hours`;
  if (minutes > 1) return `${Math.floor(minutes)} minutes`;
  return 'less than a minute';
}
