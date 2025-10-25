/**
 * Customer Segments Report Page
 *
 * Report showing:
 * - KPI cards for segment metrics
 * - Pie chart showing customer distribution
 * - Bar chart for revenue comparison by segment
 * - Data table with segment details
 * - Export functionality
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  IconUsers,
  IconCash,
  IconChartPie,
  IconChartBar,
} from '@tabler/icons-react';
import { subDays, format } from 'date-fns';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ReportHeader } from '@/app/dashboard/reports/components/report-header';
import { ReportFilters } from '@/app/dashboard/reports/components/report-filters';
import { useCustomerSegments, useCustomerSummary } from '@/hooks/useCustomerReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';
import type { DateRangeFilter } from '@/interfaces/reports';

const COLORS = [
  'hsl(262, 83%, 58%)', // Purple - VIP
  'hsl(220, 90%, 56%)', // Blue - Premium
  'hsl(142, 76%, 36%)', // Green - Regular
  'hsl(24, 95%, 53%)',  // Orange - Ocasional
];

export default function CustomerSegmentsReportPage(): React.ReactElement {
  const user = useStore((state) => state.user);

  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const [storeId, setStoreId] = useState<string | undefined>(undefined);

  const { data: segments, isLoading: isLoadingSegments, error } = useCustomerSegments({
    organizationId: user?.organizationId || '',
    storeId,
    dateRange,
  });

  const { data: summary, isLoading: isLoadingSummary } = useCustomerSummary({
    organizationId: user?.organizationId || '',
    storeId,
    dateRange,
  });

  const { exportToPDF, exportToExcel, isExporting } = useExport<{
    segmento: string;
    clientes: number;
    ingresos: string;
    promedio_gastado: string;
    porcentaje: string;
  }>();

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Pie chart data
  const pieChartData = useMemo(() => {
    if (!segments) return [];
    return segments.map((segment) => ({
      name: segment.segment,
      value: segment.customerCount,
      revenue: segment.totalRevenue,
    }));
  }, [segments]);

  // Bar chart data
  const barChartData = useMemo(() => {
    if (!segments) return [];
    return segments.map((segment) => ({
      name: segment.segment,
      revenue: segment.totalRevenue,
      customers: segment.customerCount,
    }));
  }, [segments]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    if (!segments) return { totalRevenue: 0, totalCustomers: 0 };
    return {
      totalRevenue: segments.reduce((sum, s) => sum + s.totalRevenue, 0),
      totalCustomers: segments.reduce((sum, s) => sum + s.customerCount, 0),
    };
  }, [segments]);

  // Excel data
  const excelData = useMemo(() => {
    if (!segments) return [];
    return segments.map((segment) => ({
      segmento: segment.segment,
      clientes: segment.customerCount,
      ingresos: formatCurrency(segment.totalRevenue),
      promedio_gastado: formatCurrency(segment.averageSpent),
      porcentaje: `${segment.percentage.toFixed(2)}%`,
    }));
  }, [segments]);

  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'customer-segments-report',
      filename: `segmentos-clientes-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Reporte de Segmentos de Clientes',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    exportToExcel(excelData, {
      filename: `segmentos-clientes-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Segmentos de Clientes',
    });
  };

  const isLoading = isLoadingSegments || isLoadingSummary;

  return (
    <div className="space-y-6 p-6">
      <ReportHeader
        title="Segmentos de Clientes"
        description="Clasificación de clientes por nivel de gasto (VIP, Premium, Regular, Ocasional)"
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        isExporting={isExporting}
      />

      <ReportFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        storeId={storeId}
        onStoreChange={setStoreId}
        showStoreFilter={true}
      />

      <div id="customer-segments-report" className="space-y-6">
        {/* Summary KPIs */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : summary ? (
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title="Total Clientes"
              value={summary.activeCustomers}
              icon={<IconUsers className="size-5" />}
              suffix=" clientes"
            />
            <KpiCard
              title="Ingresos Totales"
              value={formatCurrency(summaryMetrics.totalRevenue)}
              icon={<IconCash className="size-5" />}
            />
            <KpiCard
              title="Valor Promedio"
              value={formatCurrency(summary.averagePurchaseValue)}
              icon={<IconCash className="size-5" />}
            />
          </div>
        ) : null}

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart - Customer Distribution */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconChartPie className="size-5 text-primary" />
                <CardTitle>Distribución de Clientes</CardTitle>
              </div>
              <CardDescription>Cantidad de clientes por segmento</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-3 shadow-lg">
                              <p className="font-semibold text-sm mb-2">
                                {payload[0].name}
                              </p>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-muted-foreground">Clientes:</span>
                                  <span className="font-medium">
                                    {payload[0].value}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-muted-foreground">Ingresos:</span>
                                  <span className="font-medium">
                                    {formatCurrency(Number(payload[0].payload.revenue))}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[400px] items-center justify-center">
                  <div className="text-center">
                    <IconUsers className="mx-auto size-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No hay datos de clientes para el período seleccionado
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart - Revenue Comparison */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconChartBar className="size-5 text-primary" />
                <CardTitle>Ingresos por Segmento</CardTitle>
              </div>
              <CardDescription>Comparación de ingresos entre segmentos</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
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
                                {payload[0].payload.name}
                              </p>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-muted-foreground">Ingresos:</span>
                                  <span className="font-medium">
                                    {formatCurrency(Number(payload[0].value))}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-muted-foreground">Clientes:</span>
                                  <span className="font-medium">
                                    {payload[0].payload.customers}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Ingresos" radius={[4, 4, 0, 0]}>
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Segments Table */}
        {segments && segments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Segmentos</CardTitle>
              <CardDescription>
                Métricas detalladas por segmento de clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Segmento</th>
                      <th className="text-right p-2 font-medium">Clientes</th>
                      <th className="text-right p-2 font-medium">Ingresos</th>
                      <th className="text-right p-2 font-medium">Promedio Gastado</th>
                      <th className="text-right p-2 font-medium">% Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((segment, index) => (
                      <tr key={segment.segment} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="size-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{segment.segment}</span>
                          </div>
                        </td>
                        <td className="p-2 text-right">{segment.customerCount}</td>
                        <td className="p-2 text-right font-medium text-green-600">
                          {formatCurrency(segment.totalRevenue)}
                        </td>
                        <td className="p-2 text-right">
                          {formatCurrency(segment.averageSpent)}
                        </td>
                        <td className="p-2 text-right font-medium">
                          {segment.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td className="p-2">Total</td>
                      <td className="p-2 text-right">
                        {summaryMetrics.totalCustomers}
                      </td>
                      <td className="p-2 text-right text-green-600">
                        {formatCurrency(summaryMetrics.totalRevenue)}
                      </td>
                      <td className="p-2 text-right">
                        {summaryMetrics.totalCustomers > 0
                          ? formatCurrency(summaryMetrics.totalRevenue / summaryMetrics.totalCustomers)
                          : '$0'}
                      </td>
                      <td className="p-2 text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

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
