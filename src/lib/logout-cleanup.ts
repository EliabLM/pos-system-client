/**
 * ============================================
 * LOGOUT CLEANUP UTILITIES
 * ============================================
 *
 * Centralized utilities for cleaning up application state
 * during user logout to prevent data leakage between sessions
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Clears all Zustand persisted state from sessionStorage
 *
 * This ensures no user data remains in sessionStorage after logout,
 * preventing data leakage when users switch accounts.
 */
export function clearZustandStorage(): void {
  try {
    // Remove the persisted Zustand store
    sessionStorage.removeItem('pos-system-storage');
  } catch (error) {
    console.error('Error clearing Zustand storage:', error);
  }
}

/**
 * Clears all TanStack Query cache
 *
 * This removes all cached API responses, ensuring the next user
 * doesn't see data from the previous session.
 *
 * @param queryClient - The TanStack Query client instance
 */
export function clearQueryCache(queryClient: QueryClient): void {
  try {
    queryClient.clear();
  } catch (error) {
    console.error('Error clearing query cache:', error);
  }
}

/**
 * Performs complete logout cleanup
 *
 * This function should be called during logout to ensure all
 * application state is properly cleared before navigation.
 *
 * @param queryClient - The TanStack Query client instance
 *
 * @example
 * ```typescript
 * import { performLogoutCleanup } from '@/lib/logout-cleanup';
 * import { useQueryClient } from '@tanstack/react-query';
 *
 * const queryClient = useQueryClient();
 * const result = await logoutUser();
 *
 * if (result.status === 200) {
 *   performLogoutCleanup(queryClient);
 *   router.push('/auth/login');
 * }
 * ```
 */
export function performLogoutCleanup(queryClient: QueryClient): void {
  // Clear TanStack Query cache
  clearQueryCache(queryClient);

  // Clear Zustand sessionStorage
  clearZustandStorage();
}
