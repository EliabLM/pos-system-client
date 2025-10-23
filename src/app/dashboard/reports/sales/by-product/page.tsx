/**
 * Sales by Product Report Page
 *
 * Report showing:
 * - Top products by revenue with KPI cards
 * - Horizontal bar chart showing top 10 products
 * - Data table with all product sales details
 * - Export functionality
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  IconPackage,
  IconCash,
  IconTrendingUp,
  IconChartBar,
} from '@tabler/icons-react';
import { subDays, format } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { useSalesByProduct } from '@/hooks/useSalesReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';
import type { DateRangeFilter } from '@/interfaces/reports';

// Colores para el gráfico de barras - Solo HSL hardcodeados
const CHART_COLORS = [
  'hsl(220, 90%, 56%)',  // Blue
  'hsl(142, 71%, 45%)',  // Green
  'hsl(280, 65%, 60%)',  // Purple
  'hsl(25, 95%, 53%)',   // Orange
  'hsl(340, 75%, 55%)',  // Pink
  'hsl(199, 89%, 48%)',  // Cyan
  'hsl(48, 96%, 53%)',   // Yellow
  'hsl(160, 60%, 45%)',  // Teal
  'hsl(0, 84%, 60%)',    // Red
  'hsl(262, 52%, 47%)',  // Deep Purple
];

export default function SalesByProductReportPage(): React.ReactElement {
  const user = useStore((state) => state.user);

  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const [storeId, setStoreId] = useState<string | undefined>(undefined);

  const { data: products, isLoading, error } = useSalesByProduct({
    organizationId: user?.organizationId || '',
    storeId,
    dateRange,
  });

  const { exportToPDF, exportToExcel, isExporting } = useExport<{
    producto: string;
    categoria: string;
    marca: string;
    cantidad: number;
    ingresos: string;
    ganancia: string;
    margen: string;
  }>();

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Top 10 products for chart
  const chartData = useMemo(() => {
    if (!products) return [];
    return products.slice(0, 10).map((product) => ({
      name: product.productName.length > 20
        ? `${product.productName.substring(0, 20)}...`
        : product.productName,
      revenue: product.revenue,
      quantity: product.quantity,
    }));
  }, [products]);

  // Top 3 products for KPI cards
  const topProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.slice(0, 3);
  }, [products]);

  // Summary metrics
  const summary = useMemo(() => {
    if (!products) return { totalProducts: 0, totalRevenue: 0, totalProfit: 0 };
    return {
      totalProducts: products.length,
      totalRevenue: products.reduce((sum, p) => sum + p.revenue, 0),
      totalProfit: products.reduce((sum, p) => sum + p.profit, 0),
    };
  }, [products]);

  // Excel data
  const excelData = useMemo(() => {
    if (!products) return [];
    return products.map((product) => ({
      producto: product.productName,
      categoria: product.category || 'Sin categoría',
      unidad: product.unitMeasure || '-',
      marca: product.brand || 'Sin marca',
      cantidad: product.quantity,
      ingresos: formatCurrency(product.revenue),
      ganancia: formatCurrency(product.profit),
      margen: `${product.profitMargin.toFixed(2)}%`,
    }));
  }, [products]);

  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'product-sales-report',
      filename: `ventas-por-producto-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Reporte de Ventas por Producto',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    exportToExcel(excelData, {
      filename: `ventas-por-producto-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Ventas por Producto',
    });
  };

  return (
    <div className="space-y-6 p-6">
      <ReportHeader
        title="Ventas por Producto"
        description="Análisis de ventas agrupadas por producto con ranking de los más vendidos"
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

      <div id="product-sales-report" className="space-y-6">
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
              title="Productos Vendidos"
              value={summary.totalProducts}
              icon={<IconPackage className="size-5" />}
              suffix=" productos"
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

        {/* Top 3 Products Cards */}
        {topProducts.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Top 3 Productos</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {topProducts.map((product, index) => (
                <Card key={product.productId} className="border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        #{index + 1} Producto
                      </CardTitle>
                      <div className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                        {product.quantity} uds
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold text-lg mb-1 truncate">{product.productName}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ingresos:</span>
                        <span className="font-medium">{formatCurrency(product.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ganancia:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(product.profit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Margen:</span>
                        <span className="font-medium">{product.profitMargin.toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Top 10 Products Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconChartBar className="size-5 text-primary" />
              <CardTitle>Top 10 Productos por Ingresos</CardTitle>
            </div>
            <CardDescription>Ranking de productos más vendidos</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[500px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value: number) =>
                      new Intl.NumberFormat('es-CO', {
                        notation: 'compact',
                        compactDisplay: 'short',
                      }).format(value)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={100}
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
                                <span className="text-muted-foreground">Cantidad:</span>
                                <span className="font-medium">
                                  {payload[0].payload.quantity} unidades
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
                    dataKey="revenue"
                    radius={[0, 4, 4, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[500px] items-center justify-center">
                <div className="text-center">
                  <IconPackage className="mx-auto size-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No hay datos de productos para el período seleccionado
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products Table */}
        {products && products.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Productos</CardTitle>
              <CardDescription>
                Lista completa de productos vendidos en el período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Producto</th>
                      <th className="text-left p-2 font-medium">Categoría</th>
                      <th className="text-left p-2 font-medium">Unidad</th>
                      <th className="text-right p-2 font-medium">Cantidad</th>
                      <th className="text-right p-2 font-medium">Ingresos</th>
                      <th className="text-right p-2 font-medium">Ganancia</th>
                      <th className="text-right p-2 font-medium">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <tr key={product.productId} className="border-b hover:bg-muted/50">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2 font-medium">{product.productName}</td>
                        <td className="p-2 text-muted-foreground">
                          {product.category || 'Sin categoría'}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {product.unitMeasure || '-'}
                        </td>
                        <td className="p-2 text-right">{product.quantity}</td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(product.revenue)}
                        </td>
                        <td className="p-2 text-right text-green-600 font-medium">
                          {formatCurrency(product.profit)}
                        </td>
                        <td className="p-2 text-right">{product.profitMargin.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
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
