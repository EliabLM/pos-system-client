'use client';

import { IconCash, IconShoppingCart, IconReceipt } from '@tabler/icons-react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useKPIs } from '@/hooks/useDashboard';
import { useStore } from '@/store';

interface DashboardKpisProps {
  selectedStoreId?: string;
}

export function DashboardKpis({ selectedStoreId }: DashboardKpisProps) {
  // Get user from Zustand store
  const user = useStore((state) => state.user);
  const organizationId = user?.organizationId;

  // RBAC: SELLER users must use their assigned storeId (ignoring selectedStoreId prop)
  // ADMIN users use selectedStoreId from selector (can be undefined = toda la org)
  const storeId = user?.role === 'SELLER' ? user?.storeId : selectedStoreId;

  // Fetch KPIs data
  const { data: kpis, isLoading, error } = useKPIs(organizationId, storeId);

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error al cargar los KPIs: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  // No data state (only show when not loading and no data)
  if (!isLoading && !kpis) {
    return (
      <Alert>
        <AlertDescription>No hay datos disponibles</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {/* Daily Sales KPI */}
      <KpiCard
        title="Ventas del día"
        value={kpis?.totalSales || 0}
        icon={<IconCash className="h-5 w-5" />}
        prefix="$"
        trend={
          kpis?.salesChange !== undefined
            ? {
                value: kpis.salesChange,
                label: 'vs ayer',
              }
            : undefined
        }
        loading={isLoading}
      />

      {/* Number of Transactions KPI */}
      <KpiCard
        title="Número de transacciones"
        value={kpis?.totalTransactions || 0}
        icon={<IconShoppingCart className="h-5 w-5" />}
        trend={
          kpis?.transactionsChange !== undefined
            ? {
                value: kpis.transactionsChange,
                label: 'vs ayer',
              }
            : undefined
        }
        loading={isLoading}
      />

      {/* Average Ticket KPI */}
      <KpiCard
        title="Ticket promedio"
        value={kpis?.averageTicket || 0}
        icon={<IconReceipt className="h-5 w-5" />}
        prefix="$"
        trend={
          kpis?.averageTicketChange !== undefined
            ? {
                value: kpis.averageTicketChange,
                label: 'vs ayer',
              }
            : undefined
        }
        loading={isLoading}
      />
    </div>
  );
}
