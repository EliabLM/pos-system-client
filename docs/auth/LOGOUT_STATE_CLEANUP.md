# Logout State Cleanup Documentation

## Overview

This document describes the comprehensive state cleanup mechanism implemented to prevent data leakage between user sessions when users log out of the POS system.

## Problem Statement

In multi-user environments where multiple users can access the same device or browser session, it's critical to ensure that when a user logs out:

1. **No data persists** that could be viewed by the next user
2. **All cached API responses** are cleared
3. **All local state** is reset to initial values
4. **Session storage** is completely wiped

Without proper cleanup, the following security and UX issues can occur:
- Previous user's data visible to new users
- Incorrect data displayed due to stale cache
- State conflicts when switching accounts
- Privacy violations with sensitive information exposure

## Solution Architecture

### Core Cleanup Utility

**File**: `src/lib/logout-cleanup.ts`

This centralized utility provides three key functions:

#### 1. `clearZustandStorage()`
Removes all persisted Zustand state from sessionStorage.

```typescript
export function clearZustandStorage(): void {
  try {
    sessionStorage.removeItem('pos-system-storage');
  } catch (error) {
    console.error('Error clearing Zustand storage:', error);
  }
}
```

**What it clears**:
- User authentication state (`user` object)
- Login flow state (`stepIndex`, `tempUser`)
- Any future state slices added to the Zustand store

#### 2. `clearQueryCache(queryClient)`
Clears all TanStack Query (React Query) cached data.

```typescript
export function clearQueryCache(queryClient: QueryClient): void {
  try {
    queryClient.clear();
  } catch (error) {
    console.error('Error clearing query cache:', error);
  }
}
```

**What it clears**:
- All cached API responses (categories, brands, products, sales, etc.)
- Query states (loading, error states)
- Invalidated queries
- Background refetch timers

#### 3. `performLogoutCleanup(queryClient)`
Main function that orchestrates complete cleanup.

```typescript
export function performLogoutCleanup(queryClient: QueryClient): void {
  // Clear TanStack Query cache
  clearQueryCache(queryClient);

  // Clear Zustand sessionStorage
  clearZustandStorage();
}
```

### Implementation in Components

The cleanup is implemented in all logout handlers across the application:

#### NavUser Component (`src/components/nav-user.tsx`)

```typescript
import { performLogoutCleanup } from '@/lib/logout-cleanup';

const handleLogout = async () => {
  try {
    const result = await logoutUser();

    if (result.status === 200) {
      // Perform complete cleanup: clear query cache and sessionStorage
      performLogoutCleanup(queryClient);

      toast.success('Sesión cerrada exitosamente');
      router.push('/auth/login');
    }
  } catch (error) {
    console.error('Logout error:', error);
    toast.error('Error al cerrar sesión. Por favor intenta de nuevo');
  }
};
```

#### SiteHeader Component (`src/components/site-header.tsx`)

```typescript
import { performLogoutCleanup } from '@/lib/logout-cleanup';

const handleLogout = async () => {
  try {
    const result = await logoutUser();

    if (result.status === 200) {
      // Perform complete cleanup: clear query cache and sessionStorage
      performLogoutCleanup(queryClient);

      toast.success('Sesión cerrada exitosamente');
      router.push('/auth/login');
    }
  } catch (error) {
    console.error('Logout error:', error);
    toast.error('Error al cerrar sesión. Por favor intenta de nuevo');
  }
};
```

## Logout Flow Sequence

1. **User triggers logout** (clicks logout button in NavUser or SiteHeader)
2. **Server action called** (`logoutUser()` from `@/actions/auth`)
   - Invalidates JWT session in database
   - Clears HTTP-only `auth-token` cookie
   - Returns success/error response
3. **Client-side cleanup** (if logout successful)
   - **Step 1**: Clear TanStack Query cache
     - Removes all cached API responses
     - Resets query client state
   - **Step 2**: Clear Zustand sessionStorage
     - Removes `pos-system-storage` key from sessionStorage
     - Clears all persisted state
4. **User feedback** - Show success toast message
5. **Navigation** - Redirect to `/auth/login`

## State That Gets Cleared

### Zustand Store State (sessionStorage)

The following Zustand slices are completely cleared:

```typescript
// AuthSlice
{
  user: User | null  // Current authenticated user data
}

// LoginSlice
{
  stepIndex: number           // Login wizard step
  tempUser: TempUser | null  // Temporary user during registration
}
```

### TanStack Query Cache

All cached queries are cleared, including:

- **Categories** (`useCategories` hook)
- **Brands** (`useBrands` hook)
- **Payment Methods** (`usePaymentMethods` hook)
- **Stores** (`useStores` hook)
- **Products** (`useProducts` hook)
- **Customers** (`useCustomers` hook)
- **Users** (`useUsers` hook)
- **Sales** (`useSales` hook)
- **Sale Items** (`useSaleItems` hook)
- **Sale Payments** (`useSalePayments` hook)
- **Stock Movements** (`useStockMovement` hook)
- **Organizations** (`useOrganizations` hook)

## Testing the Implementation

### Manual Testing Steps

1. **Login as User A**
   - Navigate to dashboard
   - View some data (products, sales, etc.)
   - Observe cached data in DevTools

2. **Verify State Persistence**
   - Open browser DevTools → Application tab
   - Check sessionStorage → `pos-system-storage` key exists
   - Open React Query DevTools
   - Verify cached queries exist

3. **Logout**
   - Click logout from NavUser or SiteHeader
   - Observe cleanup happening

4. **Verify Complete Cleanup**
   - Check sessionStorage → `pos-system-storage` should be removed
   - Check React Query cache → should be empty
   - Verify redirect to `/auth/login`

5. **Login as User B**
   - Login with different account
   - Verify NO data from User A is visible
   - Verify fresh data loads for User B

### Automated Testing Considerations

```typescript
// Example test case (for future implementation)
describe('Logout Cleanup', () => {
  it('should clear all state on logout', async () => {
    // 1. Login and populate state
    await loginUser({ email: 'test@example.com', password: 'password' });

    // 2. Verify state exists
    expect(sessionStorage.getItem('pos-system-storage')).toBeTruthy();
    expect(queryClient.getQueryCache().getAll()).toHaveLength > 0;

    // 3. Logout
    await handleLogout();

    // 4. Verify cleanup
    expect(sessionStorage.getItem('pos-system-storage')).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
```

## Security Considerations

### What This Protects Against

1. **Session Hijacking via Cached Data**
   - Prevents next user from viewing previous user's cached responses

2. **State Confusion**
   - Eliminates bugs from stale state when switching accounts

3. **Privacy Violations**
   - Ensures sensitive business data (sales, customers) is not leaked

### What This Does NOT Protect Against

1. **Server-side Session Theft**
   - JWT tokens in HTTP-only cookies (handled by server action)

2. **Network Interception**
   - Requires HTTPS (handled by deployment configuration)

3. **Browser Extensions**
   - Cannot prevent malicious extensions from accessing data before logout

## Migration Guide

If you're adding new logout functionality elsewhere in the app:

### ✅ DO:
```typescript
import { performLogoutCleanup } from '@/lib/logout-cleanup';
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const handleLogout = async () => {
  const result = await logoutUser();

  if (result.status === 200) {
    performLogoutCleanup(queryClient);  // Use centralized cleanup
    router.push('/auth/login');
  }
};
```

### ❌ DON'T:
```typescript
// DON'T manually clear state - incomplete cleanup
const handleLogout = async () => {
  const result = await logoutUser();

  if (result.status === 200) {
    setUser(null);  // ❌ Only clears user, not other state
    router.push('/auth/login');
  }
};
```

```typescript
// DON'T duplicate cleanup logic - use the utility
const handleLogout = async () => {
  const result = await logoutUser();

  if (result.status === 200) {
    queryClient.clear();                        // ❌ Duplicated logic
    sessionStorage.removeItem('pos-system-storage');  // ❌ Duplicated logic
    router.push('/auth/login');
  }
};
```

## Adding New State to Cleanup

If you add new state storage mechanisms to the app:

1. **Update `clearZustandStorage()`** if using different storage keys:
```typescript
export function clearZustandStorage(): void {
  try {
    sessionStorage.removeItem('pos-system-storage');
    sessionStorage.removeItem('new-storage-key');  // Add new key
  } catch (error) {
    console.error('Error clearing Zustand storage:', error);
  }
}
```

2. **Add new cleanup function** for other storage types:
```typescript
export function clearLocalStorage(): void {
  try {
    localStorage.removeItem('user-preferences');
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

// Update main cleanup function
export function performLogoutCleanup(queryClient: QueryClient): void {
  clearQueryCache(queryClient);
  clearZustandStorage();
  clearLocalStorage();  // Add new cleanup
}
```

## Related Files

- `src/lib/logout-cleanup.ts` - Core cleanup utilities
- `src/components/nav-user.tsx` - Sidebar logout implementation
- `src/components/site-header.tsx` - Header logout implementation
- `src/actions/auth/logout.ts` - Server-side logout action
- `src/store/index.ts` - Zustand store configuration
- `src/middleware.ts` - JWT authentication middleware

## Future Enhancements

1. **Logout Analytics**
   - Track logout events for security auditing
   - Monitor cleanup performance

2. **Partial Cleanup Options**
   - Allow selective cache clearing for specific scenarios
   - Preserve user preferences across sessions

3. **Offline Support**
   - Handle cleanup when offline
   - Queue logout requests for later

4. **Multi-Tab Coordination**
   - Broadcast logout to other tabs
   - Synchronize cleanup across browser tabs

## Troubleshooting

### Issue: State persists after logout

**Symptoms**: User data or cached queries visible after logging in as different user

**Solution**:
1. Verify `performLogoutCleanup()` is called in logout handler
2. Check browser DevTools → Application → sessionStorage
3. Check React Query DevTools → Query Cache
4. Clear browser cache and try again

### Issue: Errors during cleanup

**Symptoms**: Console errors when logging out

**Solution**:
1. Check that `queryClient` is properly initialized with `useQueryClient()`
2. Verify sessionStorage is available (not in incognito mode restrictions)
3. Review error logs in `clearZustandStorage()` and `clearQueryCache()`

### Issue: Logout redirects before cleanup completes

**Symptoms**: Cleanup appears to not run

**Solution**:
- Ensure cleanup happens BEFORE `router.push('/auth/login')`
- The current implementation is synchronous and should complete before redirect
- If using async cleanup, await the cleanup promise before navigation

## Changelog

### Version 1.0.0 (2025-10-04)
- Initial implementation of centralized logout cleanup
- Created `src/lib/logout-cleanup.ts` utility
- Updated `nav-user.tsx` to use centralized cleanup
- Updated `site-header.tsx` to use centralized cleanup
- Added comprehensive documentation
