/**
 * Profitability Analysis Report Page
 *
 * Comprehensive profitability analysis with:
 * - Top products by profit margin
 * - Category profitability comparison
 * - Bar charts showing margins and revenues
 * - Data tables for products and categories
 * - PDF and Excel export functionality
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  IconChartPie,
  IconTrendingUp,
  IconPackage,
  IconCategory,
  IconPercentage,
  IconCash,
} from '@tabler/icons-react';
import { subDays, format } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ReportHeader } from '@/app/dashboard/reports/components/report-header';
import { ReportFilters } from '@/app/dashboard/reports/components/report-filters';
import { useProfitabilityReport } from '@/hooks/useFinancialReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';


/**
 * Profitability Analysis Report Page Component
 */
export default function ProfitabilityReportPage(): React.ReactElement {
  // Get user from store
  const user = useStore((state) => state.user);

  // Date range state (default: last 30 days)
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  // Store filter state
  const [storeId, setStoreId] = useState<string | undefined>(undefined);

  // Fetch profitability report data
  const { data: reportData, isLoading, error } = useProfitabilityReport({
    organizationId: user?.organizationId || '',
    storeId,
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString(),
  });

  // Export hooks
  const { exportToPDF, exportToExcel, isExporting } = useExport<Record<string, string | number>>();

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Top 10 products by margin
  const topProductsByMargin = useMemo(() => {
    if (!reportData?.byProduct) return [];
    return reportData.byProduct.slice(0, 10);
  }, [reportData]);

  // Top 10 products by revenue
  const topProductsByRevenue = useMemo(() => {
    if (!reportData?.byProduct) return [];
    return [...reportData.byProduct]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [reportData]);

  // Chart colors
  const chartColors = [
    'hsl(142 76% 36%)', // green
    'hsl(217 91% 60%)', // blue
    'hsl(262 83% 58%)', // purple
    'hsl(47 96% 53%)',  // yellow
    'hsl(0 84% 60%)',   // red
  ];


  // Export handlers
  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'profitability-report-content',
      filename: `rentabilidad-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Análisis de Rentabilidad',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    if (!reportData) return;

    const productData: Array<Record<string, string | number>> = reportData.byProduct.map((p) => ({
      producto: p.productName,
      unidades: p.units,
      ingresos: formatCurrency(p.revenue),
      costo: formatCurrency(p.cost),
      ganancia: formatCurrency(p.profit),
      margen: `${p.margin.toFixed(2)}%`,
    }));

    exportToExcel(productData, {
      filename: `rentabilidad-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Rentabilidad por Producto',
      includeHeaders: true,
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Report Header */}
      <ReportHeader
        title="Análisis de Rentabilidad"
        description="Rentabilidad por producto y categoría con identificación de mejores márgenes"
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
      <div id="profitability-report-content" className="space-y-6">
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
              title="Margen Promedio"
              value={`${reportData.summary.averageMargin.toFixed(2)}%`}
              icon={<IconPercentage className="size-5" />}
            />
            <KpiCard
              title="Mayor Margen"
              value={reportData.summary.topMarginProduct}
              icon={<IconTrendingUp className="size-5" />}
            />
            <KpiCard
              title="Mayor Ingreso"
              value={reportData.summary.topRevenueProduct}
              icon={<IconCash className="size-5" />}
            />
          </div>
        ) : null}

        {/* Top Products by Margin Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconChartPie className="size-5 text-primary" />
              <CardTitle>Top 10 Productos por Margen</CardTitle>
            </div>
            <CardDescription>
              Productos con los mejores márgenes de ganancia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : topProductsByMargin.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topProductsByMargin} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value: number) => `${value.toFixed(0)}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={150}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-lg">
                            <p className="font-semibold text-sm mb-2">{data.productName}</p>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Margen:</span>
                                <span className="font-bold text-green-600">
                                  {data.margin.toFixed(2)}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Ganancia:</span>
                                <span className="font-medium">{formatCurrency(data.profit)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Ingresos:</span>
                                <span className="font-medium">{formatCurrency(data.revenue)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                    {topProductsByMargin.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-center">
                  <IconPackage className="mx-auto size-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No hay datos de rentabilidad para el período seleccionado
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products by Revenue Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconCash className="size-5 text-primary" />
              <CardTitle>Top 10 Productos por Ingresos</CardTitle>
            </div>
            <CardDescription>
              Productos que generan mayores ingresos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : topProductsByRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topProductsByRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="productName"
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
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-lg">
                            <p className="font-semibold text-sm mb-2">{data.productName}</p>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Ingresos:</span>
                                <span className="font-bold text-primary">
                                  {formatCurrency(data.revenue)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Ganancia:</span>
                                <span className="font-medium text-green-600">
                                  {formatCurrency(data.profit)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Margen:</span>
                                <span className="font-medium">{data.margin.toFixed(2)}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {topProductsByRevenue.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>

        {/* Products Table */}
        {reportData?.byProduct && reportData.byProduct.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconPackage className="size-5 text-primary" />
                <CardTitle>Rentabilidad por Producto</CardTitle>
              </div>
              <CardDescription>
                Todos los productos ordenados por margen de ganancia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Producto</th>
                      <th className="text-right p-3 font-semibold">Unidades</th>
                      <th className="text-right p-3 font-semibold">Ingresos</th>
                      <th className="text-right p-3 font-semibold">Costo</th>
                      <th className="text-right p-3 font-semibold">Ganancia</th>
                      <th className="text-right p-3 font-semibold">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.byProduct.map((product, index) => (
                      <tr key={product.productId} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                        <td className="p-3 font-medium">{product.productName}</td>
                        <td className="p-3 text-right">{product.units}</td>
                        <td className="p-3 text-right">{formatCurrency(product.revenue)}</td>
                        <td className="p-3 text-right text-red-600">{formatCurrency(product.cost)}</td>
                        <td className="p-3 text-right text-green-600 font-medium">
                          {formatCurrency(product.profit)}
                        </td>
                        <td className={`p-3 text-right font-semibold ${
                          product.margin > 30
                            ? 'text-green-600'
                            : product.margin > 15
                            ? 'text-blue-600'
                            : 'text-orange-600'
                        }`}>
                          {product.margin.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Categories Table */}
        {reportData?.byCategory && reportData.byCategory.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconCategory className="size-5 text-primary" />
                <CardTitle>Rentabilidad por Categoría</CardTitle>
              </div>
              <CardDescription>
                Análisis de rentabilidad agrupado por categorías
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Categoría</th>
                      <th className="text-right p-3 font-semibold">Ingresos</th>
                      <th className="text-right p-3 font-semibold">Costo</th>
                      <th className="text-right p-3 font-semibold">Ganancia</th>
                      <th className="text-right p-3 font-semibold">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.byCategory.map((category, index) => (
                      <tr key={category.categoryId} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                        <td className="p-3 font-medium">{category.categoryName}</td>
                        <td className="p-3 text-right">{formatCurrency(category.revenue)}</td>
                        <td className="p-3 text-right text-red-600">{formatCurrency(category.cost)}</td>
                        <td className="p-3 text-right text-green-600 font-medium">
                          {formatCurrency(category.profit)}
                        </td>
                        <td className={`p-3 text-right font-semibold ${
                          category.margin > 30
                            ? 'text-green-600'
                            : category.margin > 15
                            ? 'text-blue-600'
                            : 'text-orange-600'
                        }`}>
                          {category.margin.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
