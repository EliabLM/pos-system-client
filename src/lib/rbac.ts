import { UserRole } from '@/generated/prisma';

// ============================================
// ROLE-BASED ACCESS CONTROL (RBAC) UTILITIES
// ============================================

/**
 * Define allowed routes per role
 */
export const ROLE_ROUTES = {
  ADMIN: [
    '/dashboard',
    '/dashboard/sales',
    '/dashboard/products',
    '/dashboard/users',
    '/dashboard/movements',
    '/dashboard/categories',
    '/dashboard/brands',
    '/dashboard/payment-methods',
    '/dashboard/stores',
  ],
  SELLER: [
    '/dashboard',
    '/dashboard/sales',
  ],
} as const;

/**
 * Check if a user role has access to a specific route
 */
export function hasRouteAccess(role: string, pathname: string): boolean {
  // ADMIN has access to all routes
  if (role === 'ADMIN') {
    return true;
  }

  // SELLER only has access to dashboard and sales
  if (role === 'SELLER') {
    const sellerRoutes = ROLE_ROUTES.SELLER;

    // Check if the pathname starts with any allowed route
    return sellerRoutes.some(route => {
      // Exact match or starts with the route path
      return pathname === route || pathname.startsWith(`${route}/`);
    });
  }

  // Unknown roles have no access
  return false;
}

/**
 * Check if a user has permission to perform mutations (create, update, delete)
 */
export function canMutate(role: string): boolean {
  return role === 'ADMIN';
}

/**
 * Check if a user can edit sale status
 */
export function canEditSaleStatus(role: string): boolean {
  return role === 'ADMIN';
}

/**
 * Check if a user can cancel sales
 */
export function canCancelSale(role: string): boolean {
  return role === 'ADMIN';
}

/**
 * Check if a user can delete sales
 */
export function canDeleteSale(role: string): boolean {
  return role === 'ADMIN';
}

/**
 * Check if a user has admin role
 */
export function isAdmin(role: string): boolean {
  return role === 'ADMIN';
}

/**
 * Check if a user has seller role
 */
export function isSeller(role: string): boolean {
  return role === 'SELLER';
}

/**
 * Get redirect path for unauthorized access
 */
export function getUnauthorizedRedirect(): string {
  return '/dashboard';
}
