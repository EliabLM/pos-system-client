import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getProfitLossReport,
  getProfitabilityReport,
  getCashFlowReport,
  FinancialReportFilters,
} from '@/actions/reports/financial-reports';

/**
 * Custom Hooks for Financial Reports
 *
 * TanStack Query hooks for fetching financial report data.
 * All hooks follow strict TypeScript typing (ZERO `any` types).
 */

// ===========================
// PROFIT & LOSS REPORT HOOK
// ===========================

/**
 * Hook for fetching Profit & Loss report
 *
 * @param filters - Financial report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with P&L data
 */
export function useProfitLossReport(
  filters: FinancialReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'financial', 'profit-loss', filters],
    queryFn: async () => {
      const response = await getProfitLossReport(filters);

      if (response.status !== 200 || !response.data) {
        toast.error(response.message);
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: enabled && Boolean(
      filters.organizationId &&
      filters.startDate &&
      filters.endDate
    ),
    staleTime: 10 * 60 * 1000, // 10 minutes - financial data changes less frequently
    refetchOnWindowFocus: false,
  });
}

// ===========================
// PROFITABILITY REPORT HOOK
// ===========================

/**
 * Hook for fetching profitability analysis by product and category
 *
 * @param filters - Financial report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with profitability data
 */
export function useProfitabilityReport(
  filters: FinancialReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'financial', 'profitability', filters],
    queryFn: async () => {
      const response = await getProfitabilityReport(filters);

      if (response.status !== 200 || !response.data) {
        toast.error(response.message);
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: enabled && Boolean(
      filters.organizationId &&
      filters.startDate &&
      filters.endDate
    ),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// ===========================
// CASH FLOW REPORT HOOK
// ===========================

/**
 * Hook for fetching cash flow report
 *
 * @param filters - Financial report filters
 * @param enabled - Whether the query should run (default: true)
 * @returns TanStack Query result with cash flow data
 */
export function useCashFlowReport(
  filters: FinancialReportFilters,
  enabled = true
) {
  return useQuery({
    queryKey: ['reports', 'financial', 'cash-flow', filters],
    queryFn: async () => {
      const response = await getCashFlowReport(filters);

      if (response.status !== 200 || !response.data) {
        toast.error(response.message);
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: enabled && Boolean(
      filters.organizationId &&
      filters.startDate &&
      filters.endDate
    ),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}
