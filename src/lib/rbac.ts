import { UserRole } from '@/generated/prisma';

// ============================================
// ROLE-BASED ACCESS CONTROL (RBAC) UTILITIES
// ============================================

/**
 * Define allowed routes per role
 *
 * ADMIN: Full access to all routes including:
 * - Reports module (analytics and insights)
 * - Suppliers management
 * - Parametrization (categories, brands, payment methods, stores)
 * - Users management
 * - Customers management
 * - Products management
 * - Inventory movements
 *
 * SELLER: Limited access only to:
 * - Dashboard (view only)
 * - Sales operations (create, view sales)
 *
 * SELLER RESTRICTIONS:
 * - NO access to Reports module
 * - NO access to Suppliers management
 * - NO access to Parametrization
 * - NO access to Users management
 * - NO access to Customers management
 * - NO access to Products management
 * - NO access to Inventory movements
 */
export const ROLE_ROUTES = {
  ADMIN: [
    '/dashboard',
    '/dashboard/brands',
    '/dashboard/categories',
    '/dashboard/customers',
    '/dashboard/movements',
    '/dashboard/payment-methods',
    '/dashboard/products',
    '/dashboard/reports', // Reports module - ADMIN ONLY
    '/dashboard/sales',
    '/dashboard/stores',
    '/dashboard/suppliers', // Suppliers - ADMIN ONLY
    '/dashboard/users',
  ],
  SELLER: [
    '/dashboard',
    '/dashboard/sales',
    // SELLER ONLY has access to Dashboard and Sales
    // NO access to: /dashboard/reports
    // NO access to: /dashboard/suppliers
    // NO access to: /dashboard/customers
    // NO access to: /dashboard/products
    // NO access to: /dashboard/movements
    // NO access to: Parametrization routes (brands, categories, payment-methods, stores)
    // NO access to: /dashboard/users
  ],
} as const;

/**
 * Check if a user role has access to a specific route
 *
 * @param role - User role (ADMIN or SELLER)
 * @param pathname - Route pathname to check
 * @returns true if user has access, false otherwise
 */
export function hasRouteAccess(role: string, pathname: string): boolean {
  // ADMIN has access to all routes
  if (role === 'ADMIN') {
    return true;
  }

  // SELLER only has access to specific routes
  if (role === 'SELLER') {
    const sellerRoutes = ROLE_ROUTES.SELLER;

    // Check if the pathname starts with any allowed route
    return sellerRoutes.some(route => {
      // Exact match for root routes
      if (pathname === route) {
        return true;
      }
      // Check if pathname starts with the route path (for nested routes)
      // e.g., /dashboard/sales/new should match /dashboard/sales
      if (pathname.startsWith(`${route}/`)) {
        return true;
      }
      return false;
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
