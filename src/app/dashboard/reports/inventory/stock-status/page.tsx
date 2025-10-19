/**
 * Stock Status Report Page
 *
 * Comprehensive stock status report with:
 * - KPI summary cards (total products, low stock, out of stock, total value)
 * - Bar chart showing stock value by category
 * - Data table with all products and their stock levels
 * - Alerts section for low/out of stock items
 * - PDF and Excel export functionality
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  IconPackage,
  IconAlertTriangle,
  IconAlertCircle,
  IconCurrencyDollar,
  IconChartBar,
  IconBoxOff,
} from '@tabler/icons-react';
import { subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ReportHeader } from '@/app/dashboard/reports/components/report-header';
import { ReportFilters } from '@/app/dashboard/reports/components/report-filters';
import { useStockStatusReport } from '@/hooks/useInventoryReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';
import type { DateRangeFilter } from '@/interfaces/reports';

/**
 * Stock Status Report Page Component
 */
export default function StockStatusReportPage(): React.ReactElement {
  // Get user from store
  const user = useStore((state) => state.user);

  // Date range state (not used for stock status but required for filters)
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  // Fetch stock status report data
  const { data: reportData, isLoading, error } = useStockStatusReport({
    organizationId: user?.organizationId || '',
    dateRange,
  });

  // Export hooks
  const { exportToPDF, exportToExcel, isExporting } = useExport<{
    producto: string;
    sku: string | null;
    stock_actual: number;
    stock_minimo: number;
    costo: string;
    valor_stock: string;
    estado: string;
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

  // Get stock status badge
  const getStatusBadge = (status: 'OK' | 'LOW' | 'OUT'): React.ReactElement => {
    if (status === 'OUT') {
      return <Badge variant="destructive">Agotado</Badge>;
    }
    if (status === 'LOW') {
      return <Badge variant="secondary">Bajo Stock</Badge>;
    }
    return <Badge variant="default">Normal</Badge>;
  };

  // Format chart data - aggregate by category
  const chartData = useMemo(() => {
    if (!reportData?.data) return [];

    const categoryMap = new Map<string, number>();

    for (const product of reportData.data) {
      const category = product.category || 'Sin Categoría';
      const currentValue = categoryMap.get(category) || 0;
      categoryMap.set(category, currentValue + product.stockValue);
    }

    return Array.from(categoryMap.entries())
      .map(([category, value]) => ({
        category,
        value: Number(value.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 categories
  }, [reportData]);

  // Prepare Excel data
  const excelData = useMemo(() => {
    if (!reportData?.data) return [];
    return reportData.data.map((item) => ({
      producto: item.productName,
      sku: item.sku,
      stock_actual: item.currentStock,
      stock_minimo: item.minStock,
      costo: formatCurrency(item.costPrice),
      valor_stock: formatCurrency(item.stockValue),
      estado: item.status === 'OUT' ? 'Agotado' : item.status === 'LOW' ? 'Bajo Stock' : 'Normal',
      categoria: item.category || 'Sin Categoría',
      marca: item.brand || 'Sin Marca',
    }));
  }, [reportData]);

  // Export handlers
  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'stock-status-report-content',
      filename: `estado-inventario-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Reporte de Estado de Inventario',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    exportToExcel(excelData, {
      filename: `estado-inventario-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Estado Inventario',
      includeHeaders: true,
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Report Header */}
      <ReportHeader
        title="Estado de Inventario"
        description="Análisis completo del estado actual del inventario con alertas y valoración"
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
      <div id="stock-status-report-content" className="space-y-6">
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
              title="Total Productos"
              value={reportData.summary.totalProducts}
              icon={<IconPackage className="size-5" />}
              suffix=" productos"
            />
            <KpiCard
              title="Productos con Bajo Stock"
              value={reportData.summary.lowStockCount}
              icon={<IconAlertTriangle className="size-5 text-yellow-500" />}
              suffix=" productos"
            />
            <KpiCard
              title="Productos Agotados"
              value={reportData.summary.outOfStockCount}
              icon={<IconAlertCircle className="size-5 text-destructive" />}
              suffix=" productos"
            />
            <KpiCard
              title="Valor Total de Inventario"
              value={formatCurrency(reportData.summary.totalStockValue)}
              icon={<IconCurrencyDollar className="size-5" />}
            />
          </div>
        ) : null}

        {/* Stock Value by Category Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconChartBar className="size-5 text-primary" />
              <CardTitle>Valor de Inventario por Categoría</CardTitle>
            </div>
            <CardDescription>
              Top 10 categorías con mayor valor en inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="category"
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
                              {payload[0].payload.category}
                            </p>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Valor Total:</span>
                                <span className="font-medium">
                                  {formatCurrency(Number(payload[0].value))}
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
                    dataKey="value"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-center">
                  <IconPackage className="mx-auto size-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No hay datos de inventario disponibles
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        {reportData?.alerts && reportData.alerts.length > 0 && (
          <Card className="border-yellow-500/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconAlertTriangle className="size-5 text-yellow-500" />
                <CardTitle>Alertas de Inventario</CardTitle>
              </div>
              <CardDescription>
                Productos que requieren atención inmediata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reportData.alerts.slice(0, 10).map((alert) => (
                  <div
                    key={alert.productId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      {alert.status === 'OUT' ? (
                        <IconBoxOff className="size-5 text-destructive" />
                      ) : (
                        <IconAlertTriangle className="size-5 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{alert.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {alert.sku} • Stock: {alert.currentStock} / Min: {alert.minStock}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(alert.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Statistics */}
        {reportData?.summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Stock Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {reportData.summary.averageStockLevel.toFixed(0)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Unidades por producto
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Productos en Buen Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {reportData.summary.totalProducts -
                    reportData.summary.lowStockCount -
                    reportData.summary.outOfStockCount}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Con stock adecuado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Atención Requerida</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {reportData.summary.lowStockCount + reportData.summary.outOfStockCount}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Bajo stock o agotado
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
