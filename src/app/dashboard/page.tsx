'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardKpis } from './features/dashboard-kpis';
import { DashboardSalesChart } from './features/dashboard-sales-chart';
import { DashboardStockAlerts } from './features/dashboard-stock-alerts';
import { DashboardTopProducts } from './features/dashboard-top-products';
import { DashboardCashStatus } from './features/dashboard-cash-status';
import { useInvalidateDashboard } from '@/hooks/useDashboard';

export default function DashboardPage() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const invalidateDashboard = useInvalidateDashboard();

  const handleRefresh = () => {
    invalidateDashboard();
    setLastUpdated(new Date());
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <DashboardHeader onRefresh={handleRefresh} lastUpdated={lastUpdated} />

      {/* KPIs Principales */}
      <DashboardKpis />

      {/* Fila con Gráfico y Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardSalesChart />
        </div>
        <div className="lg:col-span-1">
          <DashboardStockAlerts />
        </div>
      </div>

      {/* Fila con Top Productos y Estado de Caja */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardTopProducts />
        <DashboardCashStatus />
      </div>
    </div>
  );
}
