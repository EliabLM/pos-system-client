/**
 * Inventory Rotation Report Page
 *
 * Comprehensive inventory rotation report with:
 * - KPI summary cards (average rotation, fast/slow/no movement items)
 * - Bar chart showing top rotating products
 * - Pie chart showing ABC classification distribution
 * - Data table with all products and rotation metrics
 * - PDF and Excel export functionality
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  IconRefresh,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconChartBar,
  IconChartPie,
  IconPackage,
} from '@tabler/icons-react';
import { subDays, format } from 'date-fns';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ReportHeader } from '@/app/dashboard/reports/components/report-header';
import { ReportFilters } from '@/app/dashboard/reports/components/report-filters';
import { useInventoryRotationReport } from '@/hooks/useInventoryReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';
import type { DateRangeFilter } from '@/interfaces/reports';

/**
 * ABC classification colors
 */
const ABC_COLORS = {
  A: '#22c55e', // Green - Fast moving
  B: '#eab308', // Yellow - Medium moving
  C: '#ef4444', // Red - Slow moving
};

/**
 * Inventory Rotation Report Page Component
 */
export default function InventoryRotationReportPage(): React.ReactElement {
  // Get user from store
  const user = useStore((state) => state.user);

  // Date range state
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: subDays(new Date(), 90), // 90 days for rotation analysis
    endDate: new Date(),
  });

  // Fetch inventory rotation report data
  const { data: reportData, isLoading, error } = useInventoryRotationReport({
    organizationId: user?.organizationId || '',
    dateRange,
  });

  // Export hooks
  const { exportToPDF, exportToExcel, isExporting } = useExport<{
    producto: string;
    sku: string | null;
    stock_actual: number;
    total_vendido: number;
    tasa_rotacion: number;
    dias_inventario: number;
    clasificacion: string;
    categoria: string;
    marca: string;
  }>();

  // Get classification badge
  const getClassificationBadge = (classification: 'A' | 'B' | 'C'): React.ReactElement => {
    if (classification === 'A') {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
          <IconTrendingUp className="size-3 mr-1" />
          A - Rápida
        </Badge>
      );
    }
    if (classification === 'B') {
      return (
        <Badge variant="default" className="bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20">
          <IconMinus className="size-3 mr-1" />
          B - Media
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-red-500/10 text-red-700 hover:bg-red-500/20">
        <IconTrendingDown className="size-3 mr-1" />
        C - Lenta
      </Badge>
    );
  };

  // Format top rotating products chart data
  const topRotatingChartData = useMemo(() => {
    if (!reportData?.data) return [];
    return reportData.data
      .filter((item) => item.rotationRate > 0)
      .slice(0, 10)
      .map((item) => ({
        name: item.productName.length > 20
          ? item.productName.substring(0, 20) + '...'
          : item.productName,
        rotacion: item.rotationRate,
      }));
  }, [reportData]);

  // Format ABC classification pie chart data
  const abcChartData = useMemo(() => {
    if (!reportData?.data) return [];

    const counts = { A: 0, B: 0, C: 0 };
    for (const item of reportData.data) {
      counts[item.classification]++;
    }

    return [
      { name: 'A - Rápida', value: counts.A, color: ABC_COLORS.A },
      { name: 'B - Media', value: counts.B, color: ABC_COLORS.B },
      { name: 'C - Lenta', value: counts.C, color: ABC_COLORS.C },
    ].filter((item) => item.value > 0);
  }, [reportData]);

  // Prepare Excel data
  const excelData = useMemo(() => {
    if (!reportData?.data) return [];
    return reportData.data.map((item) => ({
      producto: item.productName,
      sku: item.sku,
      stock_actual: item.currentStock,
      total_vendido: item.totalSold,
      tasa_rotacion: item.rotationRate,
      dias_inventario: item.daysInInventory,
      clasificacion: `${item.classification} - ${
        item.classification === 'A' ? 'Rápida' : item.classification === 'B' ? 'Media' : 'Lenta'
      }`,
      categoria: item.category || 'Sin Categoría',
      marca: item.brand || 'Sin Marca',
    }));
  }, [reportData]);

  // Export handlers
  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'rotation-report-content',
      filename: `rotacion-inventario-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Reporte de Rotación de Inventario',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    exportToExcel(excelData, {
      filename: `rotacion-inventario-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Rotación',
      includeHeaders: true,
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Report Header */}
      <ReportHeader
        title="Rotación de Inventario"
        description="Análisis ABC de rotación de productos para optimizar tu inventario"
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
      <div id="rotation-report-content" className="space-y-6">
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
              title="Rotación Promedio"
              value={reportData.summary.averageRotationRate.toFixed(2)}
              icon={<IconRefresh className="size-5" />}
              suffix="x al año"
            />
            <KpiCard
              title="Productos Rápidos (A)"
              value={reportData.summary.fastMovingCount}
              icon={<IconTrendingUp className="size-5 text-green-500" />}
              suffix=" productos"
            />
            <KpiCard
              title="Productos Lentos (B/C)"
              value={reportData.summary.slowMovingCount}
              icon={<IconTrendingDown className="size-5 text-yellow-500" />}
              suffix=" productos"
            />
            <KpiCard
              title="Sin Movimiento"
              value={reportData.summary.noMovementCount}
              icon={<IconMinus className="size-5 text-red-500" />}
              suffix=" productos"
            />
          </div>
        ) : null}

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Rotating Products Bar Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconChartBar className="size-5 text-primary" />
                <CardTitle>Productos con Mayor Rotación</CardTitle>
              </div>
              <CardDescription>
                Top 10 productos con mayor tasa de rotación anual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : topRotatingChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(topRotatingChartData.length * 40, 350)}>
                  <BarChart
                    data={topRotatingChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      className="text-xs"
                      tick={{ fill: '#6b7280' }}
                      domain={[0, 'dataMax']}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      className="text-xs"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      width={100}
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
                                Rotación: {Number(payload[0].value).toFixed(2)}x al año
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="rotacion"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={30}
                      minPointSize={5}
                    >
                      {topRotatingChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`hsl(${160 + (index * 20)}, ${60 + (index * 2)}%, ${45 - (index * 2)}%)`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[350px] items-center justify-center">
                  <div className="text-center">
                    <IconPackage className="mx-auto size-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No hay datos de rotación disponibles
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ABC Classification Pie Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconChartPie className="size-5 text-primary" />
                <CardTitle>Clasificación ABC</CardTitle>
              </div>
              <CardDescription>
                Distribución de productos por velocidad de rotación
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : abcChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={abcChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                    >
                      {abcChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                                Productos: {payload[0].value}
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
        </div>

        {/* Products by Classification */}
        {reportData?.data && reportData.data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Productos por Clasificación</CardTitle>
              <CardDescription>
                Todos los productos ordenados por tasa de rotación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reportData.data.slice(0, 20).map((product) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{product.productName}</p>
                          {getClassificationBadge(product.classification)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          SKU: {product.sku} • Stock: {product.currentStock} • Vendidos: {product.totalSold}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.category} • {product.brand}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">
                        {product.rotationRate.toFixed(2)}x
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.daysInInventory} días
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ABC Analysis Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Análisis ABC - Interpretación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Badge variant="default" className="bg-green-500/10 text-green-700">A</Badge>
                <div>
                  <p className="font-medium">Productos de Alta Rotación (≥10x/año)</p>
                  <p className="text-muted-foreground">
                    Productos de alta demanda que rotan rápidamente. Mantén stock adecuado para evitar quiebres.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="default" className="bg-yellow-500/10 text-yellow-700">B</Badge>
                <div>
                  <p className="font-medium">Productos de Rotación Media (5-10x/año)</p>
                  <p className="text-muted-foreground">
                    Productos con demanda moderada. Monitorea niveles de stock regularmente.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="default" className="bg-red-500/10 text-red-700">C</Badge>
                <div>
                  <p className="font-medium">Productos de Baja Rotación (&lt;5x/año)</p>
                  <p className="text-muted-foreground">
                    Productos de baja demanda. Considera reducir stock o evaluar discontinuación.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        {reportData?.summary && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Productos Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {reportData.summary.fastMovingCount + reportData.summary.slowMovingCount}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Con ventas en el período
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tasa de Actividad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {((reportData.summary.fastMovingCount + reportData.summary.slowMovingCount) /
                    (reportData.summary.fastMovingCount +
                      reportData.summary.slowMovingCount +
                      reportData.summary.noMovementCount) *
                    100).toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Productos con movimiento
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Optimización</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {reportData.summary.slowMovingCount + reportData.summary.noMovementCount}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Productos a revisar
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
