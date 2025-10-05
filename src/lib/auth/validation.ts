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
      'El correo electrónico no puede estar vacío'
    );
  }

  // Normalizar email (lowercase, trim)
  const normalizedEmail = email.toLowerCase().trim();

  // Validar longitud máxima (RFC 5321)
  if (normalizedEmail.length > maxLength) {
    throw new AuthError(
      AuthErrorCode.INVALID_EMAIL,
      `El correo electrónico no puede tener más de ${maxLength} caracteres`,
      { length: normalizedEmail.length }
    );
  }

  // Validar formato usando regex
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new AuthError(
      AuthErrorCode.INVALID_EMAIL,
      'Formato de correo electrónico inválido',
      { email: normalizedEmail }
    );
  }

  // Verificar dominio desechable (si está habilitado)
  if (!allowDisposable) {
    const domain = normalizedEmail.split('@')[1];
    if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
      throw new AuthError(
        AuthErrorCode.INVALID_EMAIL,
        'No se permiten direcciones de correo electrónico desechables',
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
      errors: ['La contraseña no puede estar vacía'],
    };
  }

  // Validar longitud mínima
  if (password.length < reqs.minLength) {
    errors.push(`La contraseña debe tener al menos ${reqs.minLength} caracteres`);
  }

  // Validar mayúsculas
  if (reqs.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra mayúscula');
  }

  // Validar minúsculas
  if (reqs.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra minúscula');
  }

  // Validar números
  if (reqs.requireNumber && !/\d/.test(password)) {
    errors.push('La contraseña debe contener al menos un número');
  }

  // Validar caracteres especiales
  if (reqs.requireSpecialChar && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('La contraseña debe contener al menos un carácter especial');
  }

  // Verificar passwords comunes
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.includes(lowerPassword)) {
    errors.push('Esta contraseña es muy común. Por favor elija una contraseña más única');
  }

  // Verificar patrones repetitivos (ej: "aaaa", "1111")
  if (/(.)\1{3,}/.test(password)) {
    errors.push('La contraseña no puede contener caracteres repetitivos');
  }

  // Verificar secuencias (ej: "1234", "abcd")
  // if (hasSequentialChars(password)) {
  //   errors.push('Password cannot contain sequential characters');
  // }

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
    suggestions.push('Considere hacer su contraseña de al menos 12 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    suggestions.push('Agregue letras mayúsculas para mejor seguridad');
  }

  if (!/[a-z]/.test(password)) {
    suggestions.push('Agregue letras minúsculas para mejor seguridad');
  }

  if (!/\d/.test(password)) {
    suggestions.push('Agregue números para mejor seguridad');
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    suggestions.push('Agregue caracteres especiales para mejor seguridad');
  }

  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    suggestions.push('Evite contraseñas comunes. Use una combinación única');
  }

  // if (hasSequentialChars(password)) {
  //   suggestions.push('Evite caracteres secuenciales (ej: "1234", "abcd")');
  // }

  const uniqueChars = new Set(password).size;
  if (uniqueChars < password.length * 0.5) {
    suggestions.push('Use una mayor variedad de caracteres');
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
      'Las contraseñas no coinciden'
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
      result.errors[0] || 'La contraseña no cumple con los requisitos de seguridad',
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

  if (years > 1000) return '1000+ años';
  if (years > 100) return '100+ años';
  if (years > 1) return `${Math.floor(years)} años`;
  if (days > 1) return `${Math.floor(days)} días`;
  if (hours > 1) return `${Math.floor(hours)} horas`;
  if (minutes > 1) return `${Math.floor(minutes)} minutos`;
  return 'menos de un minuto';
}
