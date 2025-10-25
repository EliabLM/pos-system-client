import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getCustomerSummary,
  getTopCustomers,
  getCustomerPurchaseHistory,
  getCustomerSegments,
} from '@/actions/reports';
import {
  CustomerReportFilters,
} from '@/interfaces/reports';

/**
 * Custom Hooks for Customer Reports
 *
 * TanStack Query hooks for fetching customer report data.
 * All hooks follow strict TypeScript typing (ZERO `any` types).
 */

// ===========================
// CUSTOMER SUMMARY HOOK
// ===========================

/**
 * Hook for fetching customer summary
 *
 * @param filters - Customer report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with customer summary data
 */
export function useCustomerSummary(
  filters: CustomerReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'customers', 'summary', filters],
    queryFn: async () => {
      const response = await getCustomerSummary(filters);

      if (response.status !== 200 || !response.data) {
        toast.error(response.message);
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: enabled && Boolean(
      filters.organizationId &&
      filters.dateRange.startDate &&
      filters.dateRange.endDate
    ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ===========================
// TOP CUSTOMERS HOOK
// ===========================

/**
 * Hook for fetching top customers
 *
 * @param filters - Customer report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with top customers data
 */
export function useTopCustomers(
  filters: CustomerReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'customers', 'top', filters],
    queryFn: async () => {
      const response = await getTopCustomers(filters);

      if (response.status !== 200 || !response.data) {
        toast.error(response.message);
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: enabled && Boolean(
      filters.organizationId &&
      filters.dateRange.startDate &&
      filters.dateRange.endDate
    ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ===========================
// CUSTOMER PURCHASE HISTORY HOOK
// ===========================

/**
 * Hook for fetching customer purchase history
 *
 * @param customerId - Customer ID
 * @param filters - Customer report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with customer purchase history
 */
export function useCustomerPurchaseHistory(
  customerId: string,
  filters: CustomerReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'customers', 'purchase-history', customerId, filters],
    queryFn: async () => {
      const response = await getCustomerPurchaseHistory(customerId, filters);

      if (response.status !== 200 || !response.data) {
        toast.error(response.message);
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: enabled && Boolean(
      customerId &&
      filters.organizationId &&
      filters.dateRange.startDate &&
      filters.dateRange.endDate
    ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ===========================
// CUSTOMER SEGMENTS HOOK
// ===========================

/**
 * Hook for fetching customer segments
 *
 * @param filters - Customer report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with customer segments data
 */
export function useCustomerSegments(
  filters: CustomerReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'customers', 'segments', filters],
    queryFn: async () => {
      const response = await getCustomerSegments(filters);

      if (response.status !== 200 || !response.data) {
        toast.error(response.message);
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: enabled && Boolean(
      filters.organizationId &&
      filters.dateRange.startDate &&
      filters.dateRange.endDate
    ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
