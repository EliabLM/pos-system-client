/**
 * Inventory Valuation Report Page
 *
 * Comprehensive inventory valuation report with:
 * - KPI summary cards (total value, average value, categories, brands)
 * - Pie chart showing value distribution by category
 * - Bar chart showing value by brand
 * - Data table with all products and their valuations
 * - PDF and Excel export functionality
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  IconCurrencyDollar,
  IconCategory,
  IconTags,
  IconPackage,
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
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ReportHeader } from '@/app/dashboard/reports/components/report-header';
import { ReportFilters } from '@/app/dashboard/reports/components/report-filters';
import { useInventoryValuationReport } from '@/hooks/useInventoryReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';
import type { DateRangeFilter } from '@/interfaces/reports';

/**
 * Chart colors for pie/bar charts
 */
const CHART_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c7c',
  '#a78bfa',
];

/**
 * Inventory Valuation Report Page Component
 */
export default function InventoryValuationReportPage(): React.ReactElement {
  // Get user from store
  const user = useStore((state) => state.user);

  // Date range state (not used for valuation but required for filters)
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  // Fetch inventory valuation report data
  const { data: reportData, isLoading, error } = useInventoryValuationReport({
    organizationId: user?.organizationId || '',
    dateRange,
  });

  // Export hooks
  const { exportToPDF, exportToExcel, isExporting } = useExport<{
    producto: string;
    sku: string | null;
    stock_actual: number;
    costo_unitario: string;
    valor_total: string;
    categoria: string;
    marca: string;
  }>();

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Format category chart data
  const categoryChartData = useMemo(() => {
    if (!reportData?.summary.valueByCategory) return [];

    return Object.entries(reportData.summary.valueByCategory)
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories
  }, [reportData]);

  // Format brand chart data
  const brandChartData = useMemo(() => {
    if (!reportData?.summary.valueByBrand) return [];

    return Object.entries(reportData.summary.valueByBrand)
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 brands
  }, [reportData]);

  // Prepare Excel data
  const excelData = useMemo(() => {
    if (!reportData?.data) return [];
    return reportData.data.map((item) => ({
      producto: item.productName,
      sku: item.sku,
      stock_actual: item.currentStock,
      costo_unitario: formatCurrency(item.costPrice),
      valor_total: formatCurrency(item.totalValue),
      categoria: item.category || 'Sin Categoría',
      marca: item.brand || 'Sin Marca',
    }));
  }, [reportData]);

  // Export handlers
  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'valuation-report-content',
      filename: `valoracion-inventario-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Reporte de Valoración de Inventario',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    exportToExcel(excelData, {
      filename: `valoracion-inventario-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Valoración',
      includeHeaders: true,
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Report Header */}
      <ReportHeader
        title="Valoración de Inventario"
        description="Análisis completo del valor del inventario por categorías y marcas"
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        isExporting={isExporting}
      />

      {/* Filters */}
      <ReportFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showStoreFilter={false}
      />

      {/* Report Content */}
      <div id="valuation-report-content" className="space-y-6">
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
              title="Valor Total de Inventario"
              value={formatCurrency(reportData.summary.totalInventoryValue)}
              icon={<IconCurrencyDollar className="size-5" />}
            />
            <KpiCard
              title="Total Productos"
              value={reportData.summary.totalProducts}
              icon={<IconPackage className="size-5" />}
              suffix=" productos"
            />
            <KpiCard
              title="Categorías"
              value={Object.keys(reportData.summary.valueByCategory).length}
              icon={<IconCategory className="size-5" />}
              suffix=" categorías"
            />
            <KpiCard
              title="Marcas"
              value={Object.keys(reportData.summary.valueByBrand).length}
              icon={<IconTags className="size-5" />}
              suffix=" marcas"
            />
          </div>
        ) : null}

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Category Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconChartPie className="size-5 text-primary" />
                <CardTitle>Distribución por Categoría</CardTitle>
              </div>
              <CardDescription>
                Valor de inventario por categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => entry.name}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-3 shadow-lg">
                              <p className="font-semibold text-sm mb-1">
                                {payload[0].name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Valor: {formatCurrency(Number(payload[0].value))}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[350px] items-center justify-center">
                  <div className="text-center">
                    <IconPackage className="mx-auto size-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No hay datos disponibles
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Brand Value Bar Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconChartBar className="size-5 text-primary" />
                <CardTitle>Valor por Marca</CardTitle>
              </div>
              <CardDescription>
                Top 10 marcas por valor de inventario
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : brandChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={brandChartData}
                    margin={{ top: 5, right: 20, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      className="text-xs"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: '#6b7280' }}
                      domain={[0, 'dataMax']}
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
                              <p className="font-semibold text-sm mb-1">
                                {payload[0].payload.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Valor: {formatCurrency(Number(payload[0].value))}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                      minPointSize={5}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[350px] items-center justify-center">
                  <div className="text-center">
                    <IconPackage className="mx-auto size-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No hay datos disponibles
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products by Value */}
        {reportData?.data && reportData.data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Productos con Mayor Valor en Inventario</CardTitle>
              <CardDescription>
                Top 15 productos ordenados por valor total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reportData.data.slice(0, 15).map((product, index) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{product.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {product.sku} • Stock: {product.currentStock} unidades
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.category} • {product.brand}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">
                        {formatCurrency(product.totalValue)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(product.costPrice)}/unidad
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Statistics */}
        {reportData?.summary && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Valor Promedio por Producto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {reportData.summary.totalProducts > 0
                    ? formatCurrency(
                        reportData.summary.totalInventoryValue / reportData.summary.totalProducts
                      )
                    : formatCurrency(0)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Valor promedio en inventario
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Categoría con Mayor Valor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {categoryChartData.length > 0 ? categoryChartData[0].name : 'N/A'}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {categoryChartData.length > 0
                    ? formatCurrency(categoryChartData[0].value)
                    : formatCurrency(0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Marca con Mayor Valor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {brandChartData.length > 0 ? brandChartData[0].name : 'N/A'}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {brandChartData.length > 0
                    ? formatCurrency(brandChartData[0].value)
                    : formatCurrency(0)}
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
