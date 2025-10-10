/**
 * KPI Card Component - Usage Examples
 *
 * This file demonstrates how to use the KpiCard component in different scenarios.
 * Import this component in your dashboard pages to display key performance indicators.
 */

import { KpiCard } from './kpi-card';
import {
  IconCash,
  IconShoppingCart,
  IconUsers,
  IconTrendingUp,
  IconPackage,
} from '@tabler/icons-react';

export function KpiCardExamples() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Example 1: Sales with positive trend */}
      <KpiCard
        title="Ventas del Día"
        value={1250000}
        prefix="$"
        icon={<IconCash className="h-5 w-5" />}
        trend={{ value: 15.5, label: 'vs ayer' }}
      />

      {/* Example 2: Transactions with negative trend */}
      <KpiCard
        title="Transacciones"
        value={45}
        icon={<IconShoppingCart className="h-5 w-5" />}
        trend={{ value: -8.2, label: 'vs semana pasada' }}
      />

      {/* Example 3: Customers with neutral trend */}
      <KpiCard
        title="Clientes Nuevos"
        value={12}
        icon={<IconUsers className="h-5 w-5" />}
        trend={{ value: 0, label: 'vs mes anterior' }}
      />

      {/* Example 4: Products without trend */}
      <KpiCard
        title="Productos Vendidos"
        value={237}
        icon={<IconPackage className="h-5 w-5" />}
      />

      {/* Example 5: Percentage value with suffix */}
      <KpiCard
        title="Tasa de Conversión"
        value={68.5}
        suffix="%"
        icon={<IconTrendingUp className="h-5 w-5" />}
        trend={{ value: 3.2, label: 'vs ayer' }}
      />

      {/* Example 6: String value */}
      <KpiCard
        title="Estado del Sistema"
        value="Activo"
        icon={<IconCash className="h-5 w-5" />}
      />

      {/* Example 7: Loading state */}
      <KpiCard
        title="Cargando..."
        value={0}
        icon={<IconCash className="h-5 w-5" />}
        loading={true}
      />

      {/* Example 8: Large numbers with custom styling */}
      <KpiCard
        title="Inventario Total"
        value={9876543.21}
        prefix="$"
        icon={<IconPackage className="h-5 w-5" />}
        trend={{ value: 25.8, label: 'vs trimestre anterior' }}
        className="border-primary/20"
      />
    </div>
  );
}

/**
 * Real-world usage in a dashboard page:
 *
 * import { KpiCard } from '@/components/dashboard/kpi-card';
 * import { IconCash, IconShoppingCart } from '@tabler/icons-react';
 * import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
 *
 * export default function DashboardPage() {
 *   const { data, isLoading } = useDashboardMetrics();
 *
 *   return (
 *     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
 *       <KpiCard
 *         title="Ventas del Día"
 *         value={data?.todaySales ?? 0}
 *         prefix="$"
 *         icon={<IconCash className="h-5 w-5" />}
 *         trend={{
 *           value: data?.salesTrend ?? 0,
 *           label: 'vs ayer'
 *         }}
 *         loading={isLoading}
 *       />
 *       <KpiCard
 *         title="Transacciones"
 *         value={data?.transactionCount ?? 0}
 *         icon={<IconShoppingCart className="h-5 w-5" />}
 *         loading={isLoading}
 *       />
 *     </div>
 *   );
 * }
 */
