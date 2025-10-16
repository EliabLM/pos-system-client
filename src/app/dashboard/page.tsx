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
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>(undefined);
  const invalidateDashboard = useInvalidateDashboard();

  const handleRefresh = () => {
    invalidateDashboard();
    setLastUpdated(new Date());
  };

  const handleStoreChange = (storeId: string | undefined) => {
    setSelectedStoreId(storeId);
    setLastUpdated(new Date());
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6">
      <DashboardHeader
        onRefresh={handleRefresh}
        lastUpdated={lastUpdated}
        selectedStoreId={selectedStoreId}
        onStoreChange={handleStoreChange}
      />

      {/* KPIs Principales */}
      <DashboardKpis selectedStoreId={selectedStoreId} />

      {/* Fila con Gráfico y Alertas */}
      {/*
        Responsive Layout Strategy:
        - Mobile (default): Stack vertically (grid-cols-1)
        - Desktop (lg:): 2/3 chart + 1/3 alerts (grid-cols-3)
        - Full HD (2xl:): Same 2/3 + 1/3 ratio with more breathing room
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <DashboardSalesChart selectedStoreId={selectedStoreId} />
        </div>
        <div className="lg:col-span-1">
          <DashboardStockAlerts selectedStoreId={selectedStoreId} />
        </div>
      </div>

      {/* Fila con Top Productos y Estado de Caja */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <DashboardTopProducts selectedStoreId={selectedStoreId} />
        <DashboardCashStatus selectedStoreId={selectedStoreId} />
      </div>
    </div>
  );
}
