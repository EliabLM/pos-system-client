/**
 * Cash Flow Report Page
 *
 * Comprehensive cash flow analysis with:
 * - Cash inflows and outflows summary
 * - Net cash flow calculation
 * - Cash breakdown by payment method (pie chart)
 * - Period-based cash flow trend (area chart)
 * - PDF and Excel export functionality
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  IconCashBanknote,
  IconTrendingUp,
  IconTrendingDown,
  IconChartLine,
  IconCash,
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-react';
import { subDays, format } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ReportHeader } from '@/app/dashboard/reports/components/report-header';
import { ReportFilters } from '@/app/dashboard/reports/components/report-filters';
import { useCashFlowReport } from '@/hooks/useFinancialReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';

/**
 * Cash Flow Report Page Component
 */
export default function CashFlowReportPage(): React.ReactElement {
  // Get user from store
  const user = useStore((state) => state.user);

  // Date range state (default: last 30 days)
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  // Store filter state
  const [storeId, setStoreId] = useState<string | undefined>(undefined);

  // Fetch cash flow report data
  const { data: reportData, isLoading, error } = useCashFlowReport({
    organizationId: user?.organizationId || '',
    storeId,
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString(),
  });

  // Export hooks
  const { exportToPDF, exportToExcel, isExporting } = useExport<{
    periodo: string;
    entradas: string;
    salidas: string;
    flujo_neto: string;
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
      inflows: item.inflows,
      outflows: item.outflows,
      net: item.net,
    }));
  }, [reportData]);

  // Pie chart colors
  const pieColors = [
    'hsl(142 76% 36%)', // green
    'hsl(217 91% 60%)', // blue
    'hsl(262 83% 58%)', // purple
    'hsl(47 96% 53%)',  // yellow
    'hsl(0 84% 60%)',   // red
    'hsl(173 58% 39%)', // teal
    'hsl(24 95% 53%)',  // orange
  ];

  // Prepare Excel data
  const excelData = useMemo(() => {
    if (!reportData?.data) return [];
    return reportData.data.map((item) => ({
      periodo: item.period,
      entradas: formatCurrency(item.inflows),
      salidas: formatCurrency(item.outflows),
      flujo_neto: formatCurrency(item.net),
    }));
  }, [reportData]);

  // Export handlers
  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'cashflow-report-content',
      filename: `flujo-caja-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Reporte de Flujo de Caja',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    exportToExcel(excelData, {
      filename: `flujo-caja-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Flujo de Caja',
      includeHeaders: true,
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Report Header */}
      <ReportHeader
        title="Flujo de Caja"
        description="Entradas y salidas de efectivo por método de pago con flujo neto"
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
      <div id="cashflow-report-content" className="space-y-6">
        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
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
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title="Entradas de Efectivo"
              value={formatCurrency(reportData.summary.cashInflows)}
              icon={<IconTrendingUp className="size-5 text-green-600" />}
            />
            <KpiCard
              title="Salidas de Efectivo"
              value={formatCurrency(reportData.summary.cashOutflows)}
              icon={<IconTrendingDown className="size-5 text-red-600" />}
            />
            <KpiCard
              title="Flujo Neto"
              value={formatCurrency(reportData.summary.netCashFlow)}
              icon={
                <IconCash
                  className={`size-5 ${reportData.summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}
                />
              }
            />
          </div>
        ) : null}

        {/* Cash Flow Trend Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconChartLine className="size-5 text-primary" />
              <CardTitle>Tendencia de Flujo de Caja</CardTitle>
            </div>
            <CardDescription>
              Evolución de entradas, salidas y flujo neto en el período
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
                                <span className="text-muted-foreground">Entradas:</span>
                                <span className="font-medium text-green-600">
                                  {formatCurrency(payload[0].payload.inflows)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Salidas:</span>
                                <span className="font-medium text-red-600">
                                  {formatCurrency(payload[0].payload.outflows)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Flujo Neto:</span>
                                <span className={`font-bold ${payload[0].payload.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                  {formatCurrency(payload[0].payload.net)}
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
                    dataKey="inflows"
                    stroke="hsl(142 76% 36%)"
                    fill="hsl(142 76% 36%)"
                    fillOpacity={0.3}
                    strokeWidth={2}
                    name="Entradas"
                  />
                  <Area
                    type="monotone"
                    dataKey="outflows"
                    stroke="hsl(0 84% 60%)"
                    fill="hsl(0 84% 60%)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name="Salidas"
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke="hsl(217 91% 60%)"
                    fill="hsl(217 91% 60%)"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    name="Flujo Neto"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-center">
                  <IconCashBanknote className="mx-auto size-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No hay datos de flujo de caja para el período seleccionado
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cash by Payment Method */}
        {reportData?.summary?.cashByMethod && reportData.summary.cashByMethod.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <IconCashBanknote className="size-5 text-primary" />
                  <CardTitle>Distribución por Método de Pago</CardTitle>
                </div>
                <CardDescription>
                  Porcentaje de efectivo recibido por cada método
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.summary.cashByMethod}
                      dataKey="amount"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ method, percent }) =>
                        `${method} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {reportData.summary.cashByMethod.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={pieColors[index % pieColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Method List */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <IconCash className="size-5 text-primary" />
                  <CardTitle>Detalle por Método de Pago</CardTitle>
                </div>
                <CardDescription>
                  Montos recibidos por cada método de pago
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.summary.cashByMethod.map((method, index) => {
                    const percentage = reportData.summary
                      ? (method.amount / reportData.summary.cashInflows) * 100
                      : 0;

                    return (
                      <div
                        key={method.method}
                        className="flex items-center justify-between border-b pb-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="size-4 rounded-full"
                            style={{ backgroundColor: pieColors[index % pieColors.length] }}
                          />
                          <span className="font-medium">{method.method}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(method.amount)}</div>
                          <div className="text-xs text-muted-foreground">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary Breakdown */}
        {reportData?.summary && (
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Flujo de Caja</CardTitle>
              <CardDescription>
                Cálculo del flujo neto de efectivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2">
                    <IconArrowUp className="size-4 text-green-600" />
                    <span className="font-medium text-green-900 dark:text-green-100">
                      Entradas de Efectivo
                    </span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(reportData.summary.cashInflows)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2">
                    <IconArrowDown className="size-4 text-red-600" />
                    <span className="font-medium text-red-900 dark:text-red-100">
                      Salidas de Efectivo
                    </span>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    {formatCurrency(reportData.summary.cashOutflows)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 bg-blue-50 dark:bg-blue-950 px-3 rounded-md">
                  <span className="font-semibold text-blue-900 dark:text-blue-100">
                    Flujo Neto de Efectivo
                  </span>
                  <span className={`text-2xl font-bold ${reportData.summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(reportData.summary.netCashFlow)}
                  </span>
                </div>

                {/* Note about outflows */}
                {reportData.summary.cashOutflows === 0 && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-md">
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                      <span className="font-semibold">Nota:</span> Las salidas de efectivo
                      (compras a proveedores) no están implementadas en el sistema actual.
                      El flujo neto refleja únicamente las entradas por ventas.
                    </p>
                  </div>
                )}
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
