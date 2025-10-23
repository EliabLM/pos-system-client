/**
 * Profit & Loss Report Page
 *
 * Comprehensive P&L report with:
 * - Revenue, COGS, gross profit, and net profit metrics
 * - Area chart showing P&L trends over time
 * - Margin percentages and financial ratios
 * - PDF and Excel export functionality
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  IconCash,
  IconTrendingUp,
  IconChartLine,
  IconPercentage,
  IconReportMoney,
  IconArrowDown,
  IconArrowUp,
} from '@tabler/icons-react';
import { subDays, format } from 'date-fns';
import {
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ReportHeader } from '@/app/dashboard/reports/components/report-header';
import { ReportFilters } from '@/app/dashboard/reports/components/report-filters';
import { useProfitLossReport } from '@/hooks/useFinancialReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';

/**
 * Profit & Loss Report Page Component
 */
export default function ProfitLossReportPage(): React.ReactElement {
  // Get user from store
  const user = useStore((state) => state.user);

  // Date range state (default: last 30 days)
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  // Store filter state
  const [storeId, setStoreId] = useState<string | undefined>(undefined);

  // Fetch P&L report data
  const { data: reportData, isLoading, error } = useProfitLossReport({
    organizationId: user?.organizationId || '',
    storeId,
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString(),
  });

  // Export hooks
  const { exportToPDF, exportToExcel, isExporting } = useExport<{
    periodo: string;
    ingresos: string;
    costo: string;
    ganancia_bruta: string;
    ganancia_neta: string;
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
      period: item.period,
      revenue: item.revenue,
      cogs: item.cogs,
      grossProfit: item.grossProfit,
      netProfit: item.netProfit,
    }));
  }, [reportData]);

  // Prepare Excel data
  const excelData = useMemo(() => {
    if (!reportData?.data) return [];
    return reportData.data.map((item) => ({
      periodo: item.period,
      ingresos: formatCurrency(item.revenue),
      costo: formatCurrency(item.cogs),
      ganancia_bruta: formatCurrency(item.grossProfit),
      ganancia_neta: formatCurrency(item.netProfit),
    }));
  }, [reportData]);

  // Export handlers
  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'pl-report-content',
      filename: `estado-resultados-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Estado de Resultados (P&L)',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    exportToExcel(excelData, {
      filename: `estado-resultados-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Estado de Resultados',
      includeHeaders: true,
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Report Header */}
      <ReportHeader
        title="Estado de Resultados (P&L)"
        description="Análisis de ingresos, costos, ganancia bruta y neta"
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
      <div id="pl-report-content" className="space-y-6">
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
              title="Ingresos Totales"
              value={formatCurrency(reportData.summary.totalRevenue)}
              icon={<IconCash className="size-5" />}
            />
            <KpiCard
              title="Ganancia Bruta"
              value={formatCurrency(reportData.summary.grossProfit)}
              icon={<IconTrendingUp className="size-5" />}
            />
            <KpiCard
              title="Margen Bruto"
              value={`${reportData.summary.grossMargin.toFixed(2)}%`}
              icon={<IconPercentage className="size-5" />}
            />
            <KpiCard
              title="Ganancia Neta"
              value={formatCurrency(reportData.summary.netProfit)}
              icon={<IconReportMoney className="size-5" />}
            />
          </div>
        ) : null}

        {/* P&L Trend Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconChartLine className="size-5 text-primary" />
              <CardTitle>Tendencia de P&L</CardTitle>
            </div>
            <CardDescription>
              Evolución de ingresos, costos y ganancias en el período
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData}>
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
                                  {formatCurrency(payload[0].payload.revenue)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Costo:</span>
                                <span className="font-medium text-red-600">
                                  {formatCurrency(payload[0].payload.cogs)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">G. Bruta:</span>
                                <span className="font-medium text-green-600">
                                  {formatCurrency(payload[0].payload.grossProfit)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">G. Neta:</span>
                                <span className="font-medium text-blue-600">
                                  {formatCurrency(payload[0].payload.netProfit)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="cogs"
                    fill="hsl(0 84% 60%)"
                    fillOpacity={0.6}
                    name="Costo"
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    strokeWidth={2}
                    name="Ingresos"
                  />
                  <Area
                    type="monotone"
                    dataKey="grossProfit"
                    stroke="hsl(142 76% 36%)"
                    fill="hsl(142 76% 36%)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name="Ganancia Bruta"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-center">
                  <IconReportMoney className="mx-auto size-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No hay datos financieros para el período seleccionado
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
                <CardTitle className="text-base">Costo de Ventas (COGS)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {formatCurrency(reportData.summary.costOfGoodsSold)}
                </div>
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <IconArrowDown className="size-4" />
                  <span>Egresos del período</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Margen Neto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {reportData.summary.netMargin.toFixed(2)}%
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Ganancia neta / Ingresos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Gastos Operativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrency(reportData.summary.operatingExpenses)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  No registrados en el sistema
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* P&L Breakdown Card */}
        {reportData?.summary && (
          <Card>
            <CardHeader>
              <CardTitle>Desglose del Estado de Resultados</CardTitle>
              <CardDescription>
                Flujo de cálculo desde ingresos hasta ganancia neta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2">
                    <IconArrowUp className="size-4 text-green-600" />
                    <span className="font-medium">Ingresos Totales</span>
                  </div>
                  <span className="text-lg font-bold">
                    {formatCurrency(reportData.summary.totalRevenue)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2 pl-4">
                    <IconArrowDown className="size-4 text-red-600" />
                    <span className="text-muted-foreground">(-) Costo de Ventas</span>
                  </div>
                  <span className="text-red-600 font-medium">
                    {formatCurrency(reportData.summary.costOfGoodsSold)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b bg-green-50 dark:bg-green-950 px-3 rounded-md">
                  <span className="font-semibold text-green-900 dark:text-green-100">
                    Ganancia Bruta
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(reportData.summary.grossProfit)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2 pl-4">
                    <IconArrowDown className="size-4 text-red-600" />
                    <span className="text-muted-foreground">(-) Gastos Operativos</span>
                  </div>
                  <span className="text-red-600 font-medium">
                    {formatCurrency(reportData.summary.operatingExpenses)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 bg-blue-50 dark:bg-blue-950 px-3 rounded-md">
                  <span className="font-semibold text-blue-900 dark:text-blue-100">
                    Ganancia Neta
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(reportData.summary.netProfit)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
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
