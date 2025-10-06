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
import * as cryptoModule from './crypto';
import * as jwtModule from './jwt';
import * as sessionModule from './session';
import * as validationModule from './validation';
import { AuthError, AuthErrorCode } from './types';

export const Auth = {
  // Crypto
  crypto: {
    hashPassword: cryptoModule.hashPassword,
    comparePassword: cryptoModule.comparePassword,
    needsRehash: cryptoModule.needsRehash,
    generateSalt: cryptoModule.generateSalt,
    estimateHashTime: cryptoModule.estimateHashTime,
  },

  // JWT
  jwt: {
    generateToken: jwtModule.generateToken,
    verifyToken: jwtModule.verifyToken,
    safeVerifyToken: jwtModule.safeVerifyToken,
    decodeToken: jwtModule.decodeToken,
    isTokenExpired: jwtModule.isTokenExpired,
    getTokenRemainingTime: jwtModule.getTokenRemainingTime,
    refreshTokenIfNeeded: jwtModule.refreshTokenIfNeeded,
  },

  // Session
  session: {
    createSession: sessionModule.createSession,
    validateSession: sessionModule.validateSession,
    invalidateSession: sessionModule.invalidateSession,
    invalidateAllUserSessions: sessionModule.invalidateAllUserSessions,
    cleanExpiredSessions: sessionModule.cleanExpiredSessions,
    getUserActiveSessions: sessionModule.getUserActiveSessions,
    hasActiveSession: sessionModule.hasActiveSession,
    renewSession: sessionModule.renewSession,
  },

  // Validation
  validation: {
    validateEmail: validationModule.validateEmail,
    normalizeEmail: validationModule.normalizeEmail,
    getEmailDomain: validationModule.getEmailDomain,
    validatePassword: validationModule.validatePassword,
    getPasswordSuggestions: validationModule.getPasswordSuggestions,
    verifyPasswordMatch: validationModule.verifyPasswordMatch,
    validatePasswordComplete: validationModule.validatePasswordComplete,
    estimateCrackTime: validationModule.estimateCrackTime,
  },

  // Error handling
  AuthError,
  AuthErrorCode,
} as const;
