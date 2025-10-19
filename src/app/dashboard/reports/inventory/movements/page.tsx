/**
 * Stock Movements Report Page
 *
 * Comprehensive stock movements report with:
 * - KPI summary cards (total movements, entries, exits, adjustments)
 * - Stacked bar chart showing movements by type over time
 * - Data table with all stock movements
 * - PDF and Excel export functionality
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  IconTransfer,
  IconArrowDown,
  IconArrowUp,
  IconAdjustments,
  IconChartBar,
  IconPackage,
} from '@tabler/icons-react';
import { subDays, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Bar,
  BarChart,
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
import { useStockMovementsReport } from '@/hooks/useInventoryReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';
import type { DateRangeFilter } from '@/interfaces/reports';

/**
 * Stock Movements Report Page Component
 */
export default function StockMovementsReportPage(): React.ReactElement {
  // Get user from store
  const user = useStore((state) => state.user);

  // Date range state
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  // Fetch stock movements report data
  const { data: reportData, isLoading, error } = useStockMovementsReport({
    organizationId: user?.organizationId || '',
    dateRange,
  });

  // Export hooks
  const { exportToPDF, exportToExcel, isExporting } = useExport<{
    fecha: string;
    producto: string;
    tipo: string;
    cantidad: number;
    stock_anterior: number;
    stock_nuevo: number;
    razon: string;
    usuario: string;
  }>();

  // Get movement type badge
  const getTypeBadge = (type: 'IN' | 'OUT' | 'ADJUSTMENT'): React.ReactElement => {
    if (type === 'IN') {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
          <IconArrowDown className="size-3 mr-1" />
          Entrada
        </Badge>
      );
    }
    if (type === 'OUT') {
      return (
        <Badge variant="default" className="bg-red-500/10 text-red-700 hover:bg-red-500/20">
          <IconArrowUp className="size-3 mr-1" />
          Salida
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20">
        <IconAdjustments className="size-3 mr-1" />
        Ajuste
      </Badge>
    );
  };

  // Format chart data - aggregate by date and type
  const chartData = useMemo(() => {
    if (!reportData?.data) return [];

    const dateMap = new Map<string, { in: number; out: number; adjustment: number }>();

    for (const movement of reportData.data) {
      const dateKey = format(startOfDay(new Date(movement.date)), 'dd MMM', { locale: es });
      const existing = dateMap.get(dateKey) || { in: 0, out: 0, adjustment: 0 };

      if (movement.type === 'IN') {
        existing.in += movement.quantity;
      } else if (movement.type === 'OUT') {
        existing.out += movement.quantity;
      } else {
        existing.adjustment += Math.abs(movement.quantity);
      }

      dateMap.set(dateKey, existing);
    }

    return Array.from(dateMap.entries())
      .map(([date, values]) => ({
        date,
        entradas: values.in,
        salidas: values.out,
        ajustes: values.adjustment,
      }))
      .slice(0, 30); // Last 30 days
  }, [reportData]);

  // Prepare Excel data
  const excelData = useMemo(() => {
    if (!reportData?.data) return [];
    return reportData.data.map((item) => ({
      fecha: format(new Date(item.date), 'dd/MM/yyyy HH:mm', { locale: es }),
      producto: item.productName,
      tipo: item.type === 'IN' ? 'Entrada' : item.type === 'OUT' ? 'Salida' : 'Ajuste',
      cantidad: item.quantity,
      stock_anterior: item.previousStock,
      stock_nuevo: item.newStock,
      razon: item.reason,
      usuario: item.userName,
    }));
  }, [reportData]);

  // Export handlers
  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'movements-report-content',
      filename: `movimientos-inventario-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Reporte de Movimientos de Inventario',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    exportToExcel(excelData, {
      filename: `movimientos-inventario-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Movimientos',
      includeHeaders: true,
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Report Header */}
      <ReportHeader
        title="Movimientos de Inventario"
        description="Historial completo de entradas, salidas y ajustes de inventario"
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
      <div id="movements-report-content" className="space-y-6">
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
              title="Total Movimientos"
              value={reportData.summary.totalMovements}
              icon={<IconTransfer className="size-5" />}
              suffix=" movimientos"
            />
            <KpiCard
              title="Entradas (IN)"
              value={reportData.summary.totalIn}
              icon={<IconArrowDown className="size-5 text-green-500" />}
              suffix=" unidades"
            />
            <KpiCard
              title="Salidas (OUT)"
              value={reportData.summary.totalOut}
              icon={<IconArrowUp className="size-5 text-red-500" />}
              suffix=" unidades"
            />
            <KpiCard
              title="Ajustes"
              value={reportData.summary.totalAdjustments}
              icon={<IconAdjustments className="size-5 text-blue-500" />}
              suffix=" unidades"
            />
          </div>
        ) : null}

        {/* Movements Trend Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconChartBar className="size-5 text-primary" />
              <CardTitle>Tendencia de Movimientos</CardTitle>
            </div>
            <CardDescription>
              Distribución de movimientos por tipo en el período seleccionado
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
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-lg">
                            <p className="font-semibold text-sm mb-2">
                              {payload[0].payload.date}
                            </p>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-green-600">Entradas:</span>
                                <span className="font-medium">
                                  {payload[0].value} unidades
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-red-600">Salidas:</span>
                                <span className="font-medium">
                                  {payload[1].value} unidades
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-blue-600">Ajustes:</span>
                                <span className="font-medium">
                                  {payload[2].value} unidades
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
                  <Bar
                    dataKey="entradas"
                    fill="hsl(142 76% 36%)"
                    radius={[4, 4, 0, 0]}
                    name="Entradas"
                  />
                  <Bar
                    dataKey="salidas"
                    fill="hsl(0 84% 60%)"
                    radius={[4, 4, 0, 0]}
                    name="Salidas"
                  />
                  <Bar
                    dataKey="ajustes"
                    fill="hsl(221 83% 53%)"
                    radius={[4, 4, 0, 0]}
                    name="Ajustes"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-center">
                  <IconPackage className="mx-auto size-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No hay movimientos de inventario en el período seleccionado
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Movements Table */}
        {reportData?.data && reportData.data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Movimientos Recientes</CardTitle>
              <CardDescription>
                Últimos movimientos de inventario registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reportData.data.slice(0, 15).map((movement) => (
                  <div
                    key={movement.movementId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{movement.productName}</p>
                        {getTypeBadge(movement.type)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(movement.date), "dd MMM yyyy 'a las' HH:mm", { locale: es })} •
                        Por: {movement.userName}
                      </p>
                      {movement.reason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Razón: {movement.reason}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {movement.type === 'IN' ? '+' : movement.type === 'OUT' ? '-' : ''}
                        {movement.quantity} unidades
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {movement.previousStock} → {movement.newStock}
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
                <CardTitle className="text-base">Balance Neto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {reportData.summary.totalIn - reportData.summary.totalOut}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Entradas - Salidas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Promedio Diario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Math.round(reportData.summary.totalMovements / 30)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Movimientos por día
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Rotación</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {reportData.summary.totalOut > 0
                    ? ((reportData.summary.totalOut / reportData.summary.totalIn) * 100).toFixed(1)
                    : 0}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Salidas vs Entradas
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
