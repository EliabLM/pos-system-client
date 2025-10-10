import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDashboardKPIs,
  getSalesByPeriod,
  getTopProducts,
  getStockAlerts,
  getCashStatus,
} from '@/actions/dashboard';
import {
  DashboardKPIs,
  SalesByPeriod,
  TopProduct,
  StockAlert,
  CashStatus,
} from '@/interfaces';

/**
 * Hook para obtener los KPIs del dashboard (métricas principales)
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @returns Query con datos de KPIs del dashboard
 */
export function useKPIs(organizationId?: string, storeId?: string | null) {
  return useQuery({
    queryKey: ['dashboard', 'kpis', organizationId, storeId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      const response = await getDashboardKPIs(organizationId, storeId);
      if (response.status !== 200) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Auto-refresh cada 5 minutos
  });
}

/**
 * Hook para obtener las ventas agrupadas por periodo
 *
 * @param organizationId - ID de la organización
 * @param period - Periodo de agrupación ('day' | 'week' | 'month' | 'year')
 * @param storeId - ID de la tienda (opcional)
 * @param referenceDate - Fecha de referencia en formato ISO (opcional)
 * @returns Query con array de ventas por periodo
 */
export function useSalesByPeriod(
  organizationId?: string,
  period: 'day' | 'week' | 'month' | 'year' = 'week',
  storeId?: string | null,
  referenceDate?: string
) {
  return useQuery({
    queryKey: ['dashboard', 'sales-by-period', organizationId, period, storeId, referenceDate],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      const response = await getSalesByPeriod(organizationId, period, storeId, referenceDate);
      if (response.status !== 200) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Auto-refresh cada 5 minutos
  });
}

/**
 * Hook para obtener los productos más vendidos
 *
 * @param organizationId - ID de la organización
 * @param period - Periodo de análisis ('today' | 'week' | 'month' | 'year')
 * @param storeId - ID de la tienda (opcional)
 * @param limit - Número máximo de productos a retornar (default: 10)
 * @returns Query con array de productos más vendidos
 */
export function useTopProducts(
  organizationId?: string,
  period: 'today' | 'week' | 'month' | 'year' = 'week',
  storeId?: string | null,
  limit: number = 10
) {
  return useQuery({
    queryKey: ['dashboard', 'top-products', organizationId, period, storeId, limit],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      const response = await getTopProducts(organizationId, period, storeId, limit);
      if (response.status !== 200) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Auto-refresh cada 5 minutos
  });
}

/**
 * Hook para obtener alertas de stock bajo
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @returns Query con array de alertas de productos con stock bajo
 */
export function useStockAlerts(organizationId?: string, storeId?: string | null) {
  return useQuery({
    queryKey: ['dashboard', 'stock-alerts', organizationId, storeId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      const response = await getStockAlerts(organizationId, storeId);
      if (response.status !== 200) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Auto-refresh cada 5 minutos
  });
}

/**
 * Hook para obtener el estado de caja (ingresos por método de pago)
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @param date - Fecha en formato ISO (opcional, default: hoy)
 * @returns Query con array de estado de caja por método de pago
 */
export function useCashStatus(
  organizationId?: string,
  storeId?: string | null,
  date?: string
) {
  return useQuery({
    queryKey: ['dashboard', 'cash-status', organizationId, storeId, date],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      const response = await getCashStatus(organizationId, storeId, date);
      if (response.status !== 200) {
        throw new Error(response.message);
      }
      return response.data;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Auto-refresh cada 5 minutos
  });
}

/**
 * Hook de utilidad para invalidar todas las queries del dashboard
 *
 * @returns Función para invalidar queries del dashboard
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

// ============================================================================
// HOOKS DE CONVENIENCIA (WRAPPERS)
// ============================================================================

/**
 * Hook para obtener KPIs del día actual
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @returns Query con KPIs de hoy comparados con ayer
 */
export function useTodayKPIs(organizationId?: string, storeId?: string | null) {
  return useKPIs(organizationId, storeId);
}

/**
 * Hook para obtener ventas de la semana actual
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @returns Query con ventas agrupadas por día de la semana
 */
export function useWeeklySales(organizationId?: string, storeId?: string | null) {
  return useSalesByPeriod(organizationId, 'week', storeId);
}

/**
 * Hook para obtener ventas del mes actual
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @returns Query con ventas agrupadas por día del mes
 */
export function useMonthlySales(organizationId?: string, storeId?: string | null) {
  return useSalesByPeriod(organizationId, 'month', storeId);
}

/**
 * Hook para obtener ventas del año actual
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @returns Query con ventas agrupadas por mes del año
 */
export function useYearlySales(organizationId?: string, storeId?: string | null) {
  return useSalesByPeriod(organizationId, 'year', storeId);
}

/**
 * Hook para obtener productos más vendidos del día
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @param limit - Número máximo de productos (default: 10)
 * @returns Query con top productos de hoy
 */
export function useTodayTopProducts(
  organizationId?: string,
  storeId?: string | null,
  limit: number = 10
) {
  return useTopProducts(organizationId, 'today', storeId, limit);
}

/**
 * Hook para obtener productos más vendidos de la semana
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @param limit - Número máximo de productos (default: 10)
 * @returns Query con top productos de la semana
 */
export function useWeeklyTopProducts(
  organizationId?: string,
  storeId?: string | null,
  limit: number = 10
) {
  return useTopProducts(organizationId, 'week', storeId, limit);
}

/**
 * Hook para obtener productos más vendidos del mes
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @param limit - Número máximo de productos (default: 10)
 * @returns Query con top productos del mes
 */
export function useMonthlyTopProducts(
  organizationId?: string,
  storeId?: string | null,
  limit: number = 10
) {
  return useTopProducts(organizationId, 'month', storeId, limit);
}

/**
 * Hook para obtener estado de caja del día actual
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @returns Query con estado de caja de hoy
 */
export function useTodayCashStatus(organizationId?: string, storeId?: string | null) {
  return useCashStatus(organizationId, storeId);
}

// ============================================================================
// HOOK COMBINADO PARA DASHBOARD COMPLETO
// ============================================================================

/**
 * Tipo de retorno para el hook useDashboardData
 */
export interface DashboardDataResult {
  kpis: ReturnType<typeof useKPIs>;
  salesByPeriod: ReturnType<typeof useSalesByPeriod>;
  topProducts: ReturnType<typeof useTopProducts>;
  stockAlerts: ReturnType<typeof useStockAlerts>;
  cashStatus: ReturnType<typeof useCashStatus>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook combinado que obtiene todos los datos del dashboard en una sola llamada
 * Útil para cargar el dashboard completo de una vez
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @param period - Periodo para ventas y top productos (default: 'week')
 * @returns Objeto con todas las queries del dashboard y estados combinados
 */
export function useDashboardData(
  organizationId?: string,
  storeId?: string | null,
  period: 'day' | 'week' | 'month' | 'year' = 'week'
): DashboardDataResult {
  const kpis = useKPIs(organizationId, storeId);
  const salesByPeriod = useSalesByPeriod(organizationId, period, storeId);

  // Map period to top products period type
  const topProductsPeriod: 'today' | 'week' | 'month' | 'year' =
    period === 'day' ? 'today' : period;

  const topProducts = useTopProducts(organizationId, topProductsPeriod, storeId);
  const stockAlerts = useStockAlerts(organizationId, storeId);
  const cashStatus = useCashStatus(organizationId, storeId);

  // Combinar estados de carga
  const isLoading =
    kpis.isLoading ||
    salesByPeriod.isLoading ||
    topProducts.isLoading ||
    stockAlerts.isLoading ||
    cashStatus.isLoading;

  // Combinar errores (retornar el primer error encontrado)
  const error =
    kpis.error ||
    salesByPeriod.error ||
    topProducts.error ||
    stockAlerts.error ||
    cashStatus.error;

  return {
    kpis,
    salesByPeriod,
    topProducts,
    stockAlerts,
    cashStatus,
    isLoading,
    error,
  };
}

/**
 * Hook para obtener vista completa del dashboard del día actual
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @returns Datos completos del dashboard para el día actual
 */
export function useTodayDashboard(organizationId?: string, storeId?: string | null) {
  return useDashboardData(organizationId, storeId, 'day');
}

/**
 * Hook para obtener vista completa del dashboard semanal
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @returns Datos completos del dashboard para la semana actual
 */
export function useWeeklyDashboard(organizationId?: string, storeId?: string | null) {
  return useDashboardData(organizationId, storeId, 'week');
}

/**
 * Hook para obtener vista completa del dashboard mensual
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @returns Datos completos del dashboard para el mes actual
 */
export function useMonthlyDashboard(organizationId?: string, storeId?: string | null) {
  return useDashboardData(organizationId, storeId, 'month');
}

/**
 * Hook para obtener vista completa del dashboard anual
 *
 * @param organizationId - ID de la organización
 * @param storeId - ID de la tienda (opcional)
 * @returns Datos completos del dashboard para el año actual
 */
export function useYearlyDashboard(organizationId?: string, storeId?: string | null) {
  return useDashboardData(organizationId, storeId, 'year');
}
