/**
 * ============================================
 * AUTH UTILITIES - CENTRAL EXPORT
 * ============================================
 *
 * Punto central de exportación para todas las utilidades de autenticación
 * Importar desde: @/lib/auth
 */

// ============================================
// SERVER UTILITIES (Server Components)
// ============================================

export {
  getUserFromHeaders,
  getUserIdFromHeaders,
  getOrganizationIdFromHeaders,
  getStoreIdFromHeaders,
  hasRole,
  isAdminUser,
  requireUser,
  requireOrganizationId,
} from './server';

export type { UserFromHeaders } from './server';

// ============================================
// AUTHORIZATION UTILITIES
// ============================================

export {
  // Usuario actual
  getCurrentAuthUser,
  getCurrentUserOrgId,
  getCurrentUserIdAuth,

  // Requerir autenticación
  requireAuth,
  requireAdmin,
  requireOrganization,
  requireStoreAccess,
  requireResourceOwner,
  requireUserOrganization,
  requireActiveOrganization,

  // Verificaciones
  hasRole,
  hasOrganization,
  canAccessStore,
  isResourceOwner,
  canModifyResource,
  checkPermissions,

  // Error class
  AuthorizationError,
} from './authorization';

// ============================================
// TYPES & INTERFACES
// ============================================

export type {
  // JWT
  JWTPayload,
  TokenGenerationOptions,
  VerifyTokenResult,

  // Session
  SessionData,
  CreateSessionOptions,
  CleanupSessionsResult,

  // Password
  PasswordValidationResult,
  PasswordRequirements,
  HashPasswordOptions,
  ComparePasswordResult,

  // Password Reset
  PasswordResetToken,
  CreatePasswordResetOptions,

  // Email Verification
  EmailVerificationToken,
  CreateEmailVerificationOptions,

  // Login Attempt
  LoginAttempt,
} from './types';

export {
  // Error Handling
  AuthError,
  AuthErrorCode,
} from './types';

// ============================================
// CRYPTO UTILITIES (Password Hashing)
// ============================================

export {
  // Password Hashing
  hashPassword,
  comparePassword,
  needsRehash,
  generateSalt,
  estimateHashTime,
} from './crypto';

// ============================================
// JWT UTILITIES (Token Management)
// ============================================

export {
  // Token Generation & Verification
  generateToken,
  verifyToken,
  safeVerifyToken,
  decodeToken,

  // Token Validation
  isTokenExpired,
  getTokenRemainingTime,
  refreshTokenIfNeeded,
} from './jwt';

// ============================================
// SESSION UTILITIES (Session Management)
// ============================================

export {
  // Session CRUD
  createSession,
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,

  // Session Cleanup
  cleanExpiredSessions,
  getUserActiveSessions,
  hasActiveSession,
  renewSession,
} from './session';

// ============================================
// VALIDATION UTILITIES
// ============================================

export {
  // Email Validation
  validateEmail,
  normalizeEmail,
  getEmailDomain,

  // Password Validation
  validatePassword,
  getPasswordSuggestions,
  verifyPasswordMatch,
  validatePasswordComplete,
  estimateCrackTime,
} from './validation';

// ============================================
// RE-EXPORTS CONVENIENTES
// ============================================

/**
 * Objeto con todas las utilidades de autenticación
 * Útil para importar todo en un solo objeto
 *
 * @example
 * import { Auth } from '@/lib/auth';
 *
 * const hash = await Auth.crypto.hashPassword('password');
 * const token = Auth.jwt.generateToken(payload);
 * const session = await Auth.session.createSession(options);
 */
export const Auth = {
  // Crypto
  crypto: {
    hashPassword: require('./crypto').hashPassword,
    comparePassword: require('./crypto').comparePassword,
    needsRehash: require('./crypto').needsRehash,
    generateSalt: require('./crypto').generateSalt,
    estimateHashTime: require('./crypto').estimateHashTime,
  },

  // JWT
  jwt: {
    generateToken: require('./jwt').generateToken,
    verifyToken: require('./jwt').verifyToken,
    safeVerifyToken: require('./jwt').safeVerifyToken,
    decodeToken: require('./jwt').decodeToken,
    isTokenExpired: require('./jwt').isTokenExpired,
    getTokenRemainingTime: require('./jwt').getTokenRemainingTime,
    refreshTokenIfNeeded: require('./jwt').refreshTokenIfNeeded,
  },

  // Session
  session: {
    createSession: require('./session').createSession,
    validateSession: require('./session').validateSession,
    invalidateSession: require('./session').invalidateSession,
    invalidateAllUserSessions: require('./session').invalidateAllUserSessions,
    cleanExpiredSessions: require('./session').cleanExpiredSessions,
    getUserActiveSessions: require('./session').getUserActiveSessions,
    hasActiveSession: require('./session').hasActiveSession,
    renewSession: require('./session').renewSession,
  },

  // Validation
  validation: {
    validateEmail: require('./validation').validateEmail,
    normalizeEmail: require('./validation').normalizeEmail,
    getEmailDomain: require('./validation').getEmailDomain,
    validatePassword: require('./validation').validatePassword,
    getPasswordSuggestions: require('./validation').getPasswordSuggestions,
    verifyPasswordMatch: require('./validation').verifyPasswordMatch,
    validatePasswordComplete: require('./validation').validatePasswordComplete,
    estimateCrackTime: require('./validation').estimateCrackTime,
  },

  // Error handling
  AuthError: require('./types').AuthError,
  AuthErrorCode: require('./types').AuthErrorCode,
} as const;
