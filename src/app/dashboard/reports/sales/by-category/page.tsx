/**
 * Sales by Category Report Page
 *
 * Report showing:
 * - KPI cards for category metrics
 * - Pie chart showing category distribution
 * - Bar chart for category comparison
 * - Data table with category breakdowns
 * - Export functionality
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  IconCategory,
  IconCash,
  IconTrendingUp,
  IconChartPie,
  IconChartBar,
} from '@tabler/icons-react';
import { subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
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
import { useSalesByCategory } from '@/hooks/useSalesReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';
import type { DateRangeFilter } from '@/interfaces/reports';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142 76% 36%)',
  'hsl(221 83% 53%)',
  'hsl(262 83% 58%)',
  'hsl(24 95% 53%)',
  'hsl(142 71% 45%)',
  'hsl(346 87% 43%)',
  'hsl(48 96% 53%)',
];

export default function SalesByCategoryReportPage(): React.ReactElement {
  const user = useStore((state) => state.user);

  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const [storeId, setStoreId] = useState<string | undefined>(undefined);

  const { data: categories, isLoading, error } = useSalesByCategory({
    organizationId: user?.organizationId || '',
    storeId,
    dateRange,
  });

  const { exportToPDF, exportToExcel, isExporting } = useExport<{
    categoria: string;
    ventas: number;
    ingresos: string;
    ganancia: string;
    margen: string;
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
    if (!categories) return [];
    return categories.map((cat) => ({
      name: cat.categoryName,
      value: cat.revenue,
      percentage: cat.percentage,
    }));
  }, [categories]);

  // Bar chart data
  const barChartData = useMemo(() => {
    if (!categories) return [];
    return categories.map((cat) => ({
      name: cat.categoryName.length > 15
        ? `${cat.categoryName.substring(0, 15)}...`
        : cat.categoryName,
      revenue: cat.revenue,
      profit: cat.profit,
    }));
  }, [categories]);

  // Summary metrics
  const summary = useMemo(() => {
    if (!categories) return { totalCategories: 0, totalRevenue: 0, totalProfit: 0 };
    return {
      totalCategories: categories.length,
      totalRevenue: categories.reduce((sum, c) => sum + c.revenue, 0),
      totalProfit: categories.reduce((sum, c) => sum + c.profit, 0),
    };
  }, [categories]);

  // Excel data
  const excelData = useMemo(() => {
    if (!categories) return [];
    return categories.map((cat) => ({
      categoria: cat.categoryName,
      ventas: cat.salesCount,
      ingresos: formatCurrency(cat.revenue),
      ganancia: formatCurrency(cat.profit),
      margen: `${cat.profitMargin.toFixed(2)}%`,
      porcentaje: `${cat.percentage.toFixed(2)}%`,
    }));
  }, [categories]);

  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'category-sales-report',
      filename: `ventas-por-categoria-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Reporte de Ventas por Categoría',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    exportToExcel(excelData, {
      filename: `ventas-por-categoria-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Ventas por Categoría',
    });
  };

  return (
    <div className="space-y-6 p-6">
      <ReportHeader
        title="Ventas por Categoría"
        description="Distribución de ventas por categorías de productos con porcentajes"
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

      <div id="category-sales-report" className="space-y-6">
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
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title="Categorías"
              value={summary.totalCategories}
              icon={<IconCategory className="size-5" />}
              suffix=" categorías"
            />
            <KpiCard
              title="Ingresos Totales"
              value={formatCurrency(summary.totalRevenue)}
              icon={<IconCash className="size-5" />}
            />
            <KpiCard
              title="Ganancia Total"
              value={formatCurrency(summary.totalProfit)}
              icon={<IconTrendingUp className="size-5" />}
            />
          </div>
        )}

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart - Distribution */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconChartPie className="size-5 text-primary" />
                <CardTitle>Distribución por Categoría</CardTitle>
              </div>
              <CardDescription>Porcentaje de ingresos por categoría</CardDescription>
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
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
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
                                  <span className="text-muted-foreground">Ingresos:</span>
                                  <span className="font-medium">
                                    {formatCurrency(Number(payload[0].value))}
                                  </span>
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
                    <IconCategory className="mx-auto size-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No hay datos de categorías para el período seleccionado
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart - Comparison */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconChartBar className="size-5 text-primary" />
                <CardTitle>Comparación de Categorías</CardTitle>
              </div>
              <CardDescription>Ingresos y ganancias por categoría</CardDescription>
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
                      angle={-45}
                      textAnchor="end"
                      height={100}
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
                                  <span className="text-muted-foreground">Ganancia:</span>
                                  <span className="font-medium text-green-600">
                                    {formatCurrency(Number(payload[1].value))}
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
                    <Bar dataKey="revenue" name="Ingresos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Ganancia" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Categories Table */}
        {categories && categories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Categorías</CardTitle>
              <CardDescription>
                Lista completa de categorías con métricas de ventas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Categoría</th>
                      <th className="text-right p-2 font-medium">Ventas</th>
                      <th className="text-right p-2 font-medium">Ingresos</th>
                      <th className="text-right p-2 font-medium">Ganancia</th>
                      <th className="text-right p-2 font-medium">Margen</th>
                      <th className="text-right p-2 font-medium">% Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category, index) => (
                      <tr key={category.categoryId} className="border-b hover:bg-muted/50">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2 font-medium">{category.categoryName}</td>
                        <td className="p-2 text-right">{category.salesCount}</td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(category.revenue)}
                        </td>
                        <td className="p-2 text-right text-green-600 font-medium">
                          {formatCurrency(category.profit)}
                        </td>
                        <td className="p-2 text-right">{category.profitMargin.toFixed(1)}%</td>
                        <td className="p-2 text-right font-medium">
                          {category.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td colSpan={2} className="p-2">Total</td>
                      <td className="p-2 text-right">
                        {categories.reduce((sum, c) => sum + c.salesCount, 0)}
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(summary.totalRevenue)}
                      </td>
                      <td className="p-2 text-right text-green-600">
                        {formatCurrency(summary.totalProfit)}
                      </td>
                      <td className="p-2 text-right">
                        {((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1)}%
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
