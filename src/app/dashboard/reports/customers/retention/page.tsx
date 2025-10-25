/**
 * Customer Retention Report Page
 *
 * Report showing:
 * - KPI cards for retention metrics
 * - Line chart showing retention rate over time
 * - Cohort analysis heatmap
 * - Customer activity segments
 * - Export functionality
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  IconUsers,
  IconTrendingUp,
  IconTrendingDown,
  IconUserCheck,
  IconUserX,
  IconChartLine,
  IconTable,
  IconChartPie,
} from '@tabler/icons-react';
import { subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  Pie,
  PieChart,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ReportHeader } from '@/app/dashboard/reports/components/report-header';
import { ReportFilters } from '@/app/dashboard/reports/components/report-filters';
import {
  useCustomerRetention,
  useCohortAnalysis,
  useCustomerActivitySegments,
} from '@/hooks/useCustomerReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';
import type { DateRangeFilter } from '@/interfaces/reports';

const SEGMENT_COLORS = [
  'hsl(142, 76%, 36%)',  // Green - Active
  'hsl(220, 90%, 56%)',  // Blue - Occasional
  'hsl(24, 95%, 53%)',   // Orange - Dormant
  'hsl(346, 87%, 43%)',  // Red - Inactive
  'hsl(220, 14%, 71%)',  // Gray - New
];

export default function CustomerRetentionReportPage(): React.ReactElement {
  const user = useStore((state) => state.user);

  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: subMonths(new Date(), 12),
    endDate: new Date(),
  });

  const [storeId, setStoreId] = useState<string | undefined>(undefined);

  const { data: retention, isLoading: isLoadingRetention, error: retentionError } = useCustomerRetention({
    organizationId: user?.organizationId || '',
    storeId,
    dateRange,
  });

  const { data: cohorts, isLoading: isLoadingCohorts } = useCohortAnalysis({
    organizationId: user?.organizationId || '',
    storeId,
    dateRange,
  });

  const { data: activitySegments, isLoading: isLoadingSegments } = useCustomerActivitySegments({
    organizationId: user?.organizationId || '',
    storeId,
    dateRange,
  });

  const { exportToPDF, exportToExcel, isExporting } = useExport<Record<string, string | number>>();

  // Pie chart data for activity segments
  const activityPieData = useMemo(() => {
    if (!activitySegments) return [];
    return activitySegments.map((segment) => ({
      name: segment.segment,
      value: segment.customerCount,
      percentage: segment.percentage,
    }));
  }, [activitySegments]);

  // Excel data
  const excelData = useMemo(() => {
    if (!activitySegments) return [];
    return activitySegments.map((segment) => ({
      segmento: segment.segment,
      clientes: segment.customerCount,
      porcentaje: `${segment.percentage.toFixed(2)}%`,
      promedio_gastado: segment.averageSpent,
      dias_ultima_compra: segment.daysSinceLastPurchase || 'N/A',
    }));
  }, [activitySegments]);

  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'retention-report',
      filename: `retencion-clientes-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Reporte de Retención de Clientes',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    exportToExcel(excelData, {
      filename: `retencion-clientes-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Retención de Clientes',
    });
  };

  const isLoading = isLoadingRetention || isLoadingCohorts || isLoadingSegments;

  return (
    <div className="space-y-6 p-6">
      <ReportHeader
        title="Retención de Clientes"
        description="Análisis de retención, churn rate y comportamiento de clientes en el tiempo"
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

      <div id="retention-report" className="space-y-6">
        {/* Summary KPIs */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
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
        ) : retention ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Tasa de Retención"
              value={`${retention.retentionRate}%`}
              icon={<IconTrendingUp className="size-5" />}
              className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
            />
            <KpiCard
              title="Tasa de Churn"
              value={`${retention.churnRate}%`}
              icon={<IconTrendingDown className="size-5" />}
              className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
            />
            <KpiCard
              title="Clientes Activos"
              value={retention.activeCustomers}
              icon={<IconUserCheck className="size-5" />}
              suffix=" clientes"
            />
            <KpiCard
              title="Clientes Inactivos"
              value={retention.inactiveCustomers}
              icon={<IconUserX className="size-5" />}
              suffix=" clientes"
            />
          </div>
        ) : null}

        {/* Additional Metrics */}
        {retention && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Clientes Nuevos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{retention.newCustomers}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  En el período seleccionado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Clientes Recurrentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{retention.returningCustomers}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Con múltiples compras
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Frecuencia Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {retention.averageDaysBetweenPurchases.toFixed(0)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Días entre compras
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Activity Segments Pie Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconChartPie className="size-5 text-primary" />
                <CardTitle>Segmentos por Actividad</CardTitle>
              </div>
              <CardDescription>Distribución de clientes según recencia de compra</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : activityPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={activityPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name.split(' ')[0]}: ${percentage.toFixed(1)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {activityPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]} />
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
                                  <span className="font-medium">{payload[0].value}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-muted-foreground">Porcentaje:</span>
                                  <span className="font-medium">
                                    {payload[0].payload.percentage.toFixed(1)}%
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
                      No hay datos de segmentos disponibles
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cohort Retention Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconChartLine className="size-5 text-primary" />
                <CardTitle>Retención por Cohorte</CardTitle>
              </div>
              <CardDescription>Porcentaje de retención en el tiempo</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : cohorts && cohorts.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={cohorts[0]?.retentionByMonth.slice(0, 6) || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="monthLabel"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value: number) => `${value}%`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-3 shadow-lg">
                              <p className="font-semibold text-sm mb-2">
                                {payload[0].payload.monthLabel}
                              </p>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-muted-foreground">Retención:</span>
                                  <span className="font-medium">{payload[0].value}%</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-muted-foreground">Clientes:</span>
                                  <span className="font-medium">
                                    {payload[0].payload.retainedCustomers}
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
                    <Line
                      type="monotone"
                      dataKey="retentionRate"
                      name="Tasa de Retención"
                      stroke="hsl(142, 76%, 36%)"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(142, 76%, 36%)', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[400px] items-center justify-center">
                  <div className="text-center">
                    <IconChartLine className="mx-auto size-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No hay datos de cohortes disponibles
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Segments Table */}
        {activitySegments && activitySegments.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconTable className="size-5 text-primary" />
                <CardTitle>Detalle de Segmentos de Actividad</CardTitle>
              </div>
              <CardDescription>
                Clientes clasificados por recencia de última compra
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Segmento</th>
                      <th className="text-right p-2 font-medium">Clientes</th>
                      <th className="text-right p-2 font-medium">% Total</th>
                      <th className="text-right p-2 font-medium">Promedio Gastado</th>
                      <th className="text-right p-2 font-medium">Días Última Compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activitySegments.map((segment, index) => (
                      <tr key={segment.segment} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="size-3 rounded-full"
                              style={{ backgroundColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }}
                            />
                            <span className="font-medium">{segment.segment}</span>
                          </div>
                        </td>
                        <td className="p-2 text-right">{segment.customerCount}</td>
                        <td className="p-2 text-right font-medium">
                          {segment.percentage.toFixed(1)}%
                        </td>
                        <td className="p-2 text-right">
                          {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 0,
                          }).format(segment.averageSpent)}
                        </td>
                        <td className="p-2 text-right">
                          {segment.daysSinceLastPurchase
                            ? `~${segment.daysSinceLastPurchase} días`
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cohort Heatmap Table */}
        {cohorts && cohorts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Cohortes</CardTitle>
              <CardDescription>
                Retención mensual de clientes agrupados por mes de primera compra (últimas 6 cohortes)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium sticky left-0 bg-background">
                        Cohorte
                      </th>
                      <th className="text-right p-2 font-medium">Tamaño</th>
                      {cohorts[0]?.retentionByMonth.slice(0, 6).map((month) => (
                        <th key={month.month} className="text-center p-2 font-medium min-w-[60px]">
                          Mes {month.month}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.slice(0, 6).map((cohort) => (
                      <tr key={cohort.cohortMonth} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium sticky left-0 bg-background">
                          {format(new Date(cohort.cohortMonth), 'MMM yyyy', { locale: es })}
                        </td>
                        <td className="p-2 text-right">{cohort.cohortSize}</td>
                        {cohort.retentionByMonth.slice(0, 6).map((month) => {
                          const rate = month.retentionRate;
                          const bgColor =
                            rate >= 75
                              ? 'bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-100'
                              : rate >= 50
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100'
                              : rate >= 25
                              ? 'bg-orange-100 dark:bg-orange-950 text-orange-900 dark:text-orange-100'
                              : 'bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-100';

                          return (
                            <td key={month.month} className="p-1 text-center">
                              <div className={`rounded px-2 py-1 font-medium ${bgColor}`}>
                                {rate.toFixed(0)}%
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded bg-green-500" />
                  <span>75%+</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded bg-blue-500" />
                  <span>50-75%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded bg-orange-500" />
                  <span>25-50%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded bg-red-500" />
                  <span>&lt;25%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {retentionError && (
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
