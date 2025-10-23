/**
 * Detailed Sales Report Page
 *
 * Comprehensive sales report with:
 * - KPI summary cards
 * - Area chart showing sales trends over time
 * - Data table with all sales transactions
 * - PDF and Excel export functionality
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  IconCash,
  IconShoppingCart,
  IconTrendingUp,
  IconReceipt,
  IconPackage,
  IconChartLine,
} from '@tabler/icons-react';
import { subDays } from 'date-fns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ReportHeader } from '@/app/dashboard/reports/components/report-header';
import { ReportFilters } from '@/app/dashboard/reports/components/report-filters';
import { useSalesReport } from '@/hooks/useSalesReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';
import type { DateRangeFilter } from '@/interfaces/reports';

/**
 * Detailed Sales Report Page Component
 */
export default function DetailedSalesReportPage(): React.ReactElement {
  // Get user from store
  const user = useStore((state) => state.user);

  // Date range state
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  // Store filter state
  const [storeId, setStoreId] = useState<string | undefined>(undefined);

  // Fetch sales report data
  const { data: reportData, isLoading, error } = useSalesReport({
    organizationId: user?.organizationId || '',
    storeId,
    dateRange,
    period: 'day',
  });

  // Export hooks
  const { exportToPDF, exportToExcel, isExporting } = useExport<{
    periodo: string;
    ventas: number;
    ingresos: string;
    costo: string;
    ganancia: string;
    margen: string;
  }>();

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Format chart data
  const chartData = useMemo(() => {
    if (!reportData?.data) return [];
    return reportData.data.map((item) => ({
      period: format(new Date(item.period), 'dd MMM', { locale: es }),
      revenue: item.revenue,
      profit: item.profit,
      sales: item.salesCount,
    }));
  }, [reportData]);

  // Prepare Excel data
  const excelData = useMemo(() => {
    if (!reportData?.data) return [];
    return reportData.data.map((item) => ({
      periodo: format(new Date(item.period), 'dd/MM/yyyy', { locale: es }),
      ventas: item.salesCount,
      ingresos: formatCurrency(item.revenue),
      costo: formatCurrency(item.cost),
      ganancia: formatCurrency(item.profit),
      margen: `${item.profitMargin.toFixed(2)}%`,
    }));
  }, [reportData]);

  // Export handlers
  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'sales-report-content',
      filename: `ventas-detalladas-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Reporte de Ventas Detalladas',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    exportToExcel(excelData, {
      filename: `ventas-detalladas-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Ventas',
      includeHeaders: true,
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Report Header */}
      <ReportHeader
        title="Ventas Detalladas"
        description="Análisis completo de ventas con tendencias y métricas clave"
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        isExporting={isExporting}
      />

      {/* Filters */}
      <ReportFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        storeId={storeId}
        onStoreChange={setStoreId}
        showStoreFilter={true}
      />

      {/* Report Content */}
      <div id="sales-report-content" className="space-y-6">
        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-4 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reportData?.summary ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Ventas"
              value={reportData.summary.totalSales}
              icon={<IconShoppingCart className="size-5" />}
              suffix=" ventas"
            />
            <KpiCard
              title="Ingresos Totales"
              value={formatCurrency(reportData.summary.totalRevenue)}
              icon={<IconCash className="size-5" />}
            />
            <KpiCard
              title="Ganancia Neta"
              value={formatCurrency(reportData.summary.totalProfit)}
              icon={<IconTrendingUp className="size-5" />}
            />
            <KpiCard
              title="Ticket Promedio"
              value={formatCurrency(reportData.summary.averageTicket)}
              icon={<IconReceipt className="size-5" />}
            />
          </div>
        ) : null}

        {/* Sales Trend Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconChartLine className="size-5 text-primary" />
              <CardTitle>Tendencia de Ventas</CardTitle>
            </div>
            <CardDescription>
              Evolución de ingresos y ganancias en el período seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="period"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value: number) =>
                      new Intl.NumberFormat('es-CO', {
                        notation: 'compact',
                        compactDisplay: 'short',
                      }).format(value)
                    }
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-lg">
                            <p className="font-semibold text-sm mb-2">
                              {payload[0].payload.period}
                            </p>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Ingresos:</span>
                                <span className="font-medium">
                                  {formatCurrency(Number(payload[0].value))}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Ganancia:</span>
                                <span className="font-medium text-green-600">
                                  {formatCurrency(Number(payload[1].value))}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Ventas:</span>
                                <span className="font-medium">
                                  {payload[0].payload.sales}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(220, 90%, 56%)"
                    fill="hsl(220, 90%, 56%)"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="hsl(142 76% 36%)"
                    fill="hsl(142 76% 36%)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-center">
                  <IconPackage className="mx-auto size-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No hay datos de ventas para el período seleccionado
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        {reportData?.summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Margen de Ganancia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {reportData.summary.profitMargin.toFixed(2)}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Promedio del período
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Items Vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {reportData.summary.totalItems.toLocaleString('es-CO')}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Unidades totales
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Costo Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrency(reportData.summary.totalCost)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Costo de mercancía vendida
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">
                Error al cargar el reporte. Por favor, intenta nuevamente.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
