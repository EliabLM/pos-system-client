import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getSalesReport,
  getSalesByProduct,
  getSalesByCategory,
  getSalesByPayment,
  getSalesBySeller,
} from '@/actions/reports';
import {
  SalesReportFilters,
  SalesSummary,
  SalesPeriodData,
  TopProductData,
} from '@/interfaces/reports';

/**
 * Custom Hooks for Sales Reports
 *
 * TanStack Query hooks for fetching sales report data.
 * All hooks follow strict TypeScript typing (ZERO `any` types).
 */

// ===========================
// SALES REPORT HOOK
// ===========================

/**
 * Hook for fetching detailed sales report with summary and period data
 *
 * @param filters - Sales report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with sales data
 */
export function useSalesReport(
  filters: SalesReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'sales', 'detailed', filters],
    queryFn: async () => {
      const response = await getSalesReport(filters);

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
// SALES BY PRODUCT HOOK
// ===========================

/**
 * Hook for fetching sales aggregated by product
 *
 * @param filters - Sales report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with product sales data
 */
export function useSalesByProduct(
  filters: SalesReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'sales', 'by-product', filters],
    queryFn: async () => {
      const response = await getSalesByProduct(filters);

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
// SALES BY CATEGORY HOOK
// ===========================

/**
 * Hook for fetching sales aggregated by category
 *
 * @param filters - Sales report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with category sales data
 */
export function useSalesByCategory(
  filters: SalesReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'sales', 'by-category', filters],
    queryFn: async () => {
      const response = await getSalesByCategory(filters);

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
// SALES BY PAYMENT METHOD HOOK
// ===========================

/**
 * Hook for fetching sales aggregated by payment method
 *
 * @param filters - Sales report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with payment method sales data
 */
export function useSalesByPayment(
  filters: SalesReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'sales', 'by-payment', filters],
    queryFn: async () => {
      const response = await getSalesByPayment(filters);

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
// SALES BY SELLER HOOK
// ===========================

/**
 * Hook for fetching sales aggregated by seller/user
 *
 * @param filters - Sales report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with seller performance data
 */
export function useSalesBySeller(
  filters: SalesReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'sales', 'by-seller', filters],
    queryFn: async () => {
      const response = await getSalesBySeller(filters);

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
