import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getStockStatusReport,
  getStockMovementsReport,
  getInventoryValuationReport,
  getInventoryRotationReport,
} from '@/actions/reports';
import { InventoryReportFilters } from '@/interfaces/reports';

/**
 * Custom Hooks for Inventory Reports
 *
 * TanStack Query hooks for fetching inventory report data.
 * All hooks follow strict TypeScript typing (ZERO `any` types).
 */

// ===========================
// STOCK STATUS REPORT HOOK
// ===========================

/**
 * Hook for fetching stock status report with current inventory levels
 *
 * @param filters - Inventory report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with stock status data
 */
export function useStockStatusReport(
  filters: InventoryReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'inventory', 'stock-status', filters],
    queryFn: async () => {
      const response = await getStockStatusReport(filters);

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
// STOCK MOVEMENTS REPORT HOOK
// ===========================

/**
 * Hook for fetching stock movements report with transaction history
 *
 * @param filters - Inventory report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with stock movement data
 */
export function useStockMovementsReport(
  filters: InventoryReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'inventory', 'movements', filters],
    queryFn: async () => {
      const response = await getStockMovementsReport(filters);

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
// INVENTORY VALUATION REPORT HOOK
// ===========================

/**
 * Hook for fetching inventory valuation report
 *
 * @param filters - Inventory report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with valuation data
 */
export function useInventoryValuationReport(
  filters: InventoryReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'inventory', 'valuation', filters],
    queryFn: async () => {
      const response = await getInventoryValuationReport(filters);

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
// INVENTORY ROTATION REPORT HOOK
// ===========================

/**
 * Hook for fetching inventory rotation report with ABC analysis
 *
 * @param filters - Inventory report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with rotation data
 */
export function useInventoryRotationReport(
  filters: InventoryReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'inventory', 'rotation', filters],
    queryFn: async () => {
      const response = await getInventoryRotationReport(filters);

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
