/**
 * ============================================
 * AUTH TYPES & INTERFACES
 * ============================================
 *
 * Tipos TypeScript para el sistema de autenticación
 */

import { UserRole } from '@/generated/prisma';

// ============================================
// JWT PAYLOAD
// ============================================

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
  storeId?: string | null;
  iat?: number; // Issued at (timestamp)
  exp?: number; // Expiration (timestamp)
}

// ============================================
// SESSION
// ============================================

export interface SessionData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  isActive: boolean;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface CreateSessionOptions {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  expirationDays?: number; // Default: 7 días
}

// ============================================
// PASSWORD VALIDATION
// ============================================

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength?: 'weak' | 'medium' | 'strong' | 'very-strong';
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

// ============================================
// AUTH ERRORS
// ============================================

export enum AuthErrorCode {
  // JWT Errors
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  MALFORMED_TOKEN = 'MALFORMED_TOKEN',

  // Session Errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_REVOKED = 'SESSION_REVOKED',

  // Password Errors
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  PASSWORD_MISMATCH = 'PASSWORD_MISMATCH',

  // User Errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  USER_LOCKED = 'USER_LOCKED',

  // Email Errors
  INVALID_EMAIL = 'INVALID_EMAIL',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',

  // Generic Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

// ============================================
// CRYPTO
// ============================================

export interface HashPasswordOptions {
  saltRounds?: number; // Default: 12
}

export interface ComparePasswordResult {
  isValid: boolean;
  needsRehash?: boolean; // Si el hash usa rounds antiguos
}

// ============================================
// TOKEN GENERATION
// ============================================

export interface TokenGenerationOptions {
  expiresIn?: string | number; // Default: '7d'
  algorithm?: 'HS256' | 'HS384' | 'HS512'; // Default: 'HS256'
}

export interface VerifyTokenResult {
  payload: JWTPayload | null;
  error?: AuthError;
}

// ============================================
// SESSION CLEANUP
// ============================================

export interface CleanupSessionsResult {
  deletedCount: number;
  expiredSessions: string[]; // IDs de sesiones eliminadas
}

// ============================================
// LOGIN ATTEMPT
// ============================================

export interface LoginAttempt {
  userId?: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  timestamp: Date;
}

// ============================================
// PASSWORD RESET
// ============================================

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}

export interface CreatePasswordResetOptions {
  userId: string;
  expirationMinutes?: number; // Default: 15 minutos
  ipAddress?: string;
  userAgent?: string;
}

// ============================================
// EMAIL VERIFICATION
// ============================================

export interface EmailVerificationToken {
  id: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  verified: boolean;
}

export interface CreateEmailVerificationOptions {
  userId: string;
  email: string;
  expirationDays?: number; // Default: 7 días
  ipAddress?: string;
  userAgent?: string;
}
