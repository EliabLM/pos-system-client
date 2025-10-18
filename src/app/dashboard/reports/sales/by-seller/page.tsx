/**
 * Sales by Seller Report Page
 *
 * Report showing:
 * - Seller performance KPI cards
 * - Horizontal bar chart showing seller rankings
 * - Performance comparison cards
 * - Data table with seller metrics
 * - Export functionality
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  IconUsers,
  IconCash,
  IconShoppingCart,
  IconPackage,
  IconChartBar,
  IconTrophy,
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
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ReportHeader } from '@/app/dashboard/reports/components/report-header';
import { ReportFilters } from '@/app/dashboard/reports/components/report-filters';
import { useSalesBySeller } from '@/hooks/useSalesReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';
import type { DateRangeFilter } from '@/interfaces/reports';

export default function SalesBySellerReportPage(): React.ReactElement {
  const user = useStore((state) => state.user);

  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const [storeId, setStoreId] = useState<string | undefined>(undefined);

  const { data: sellers, isLoading, error } = useSalesBySeller({
    organizationId: user?.organizationId || '',
    storeId,
    dateRange,
  });

  const { exportToPDF, exportToExcel, isExporting } = useExport<{
    vendedor: string;
    email: string;
    ventas: number;
    ingresos: string;
    ticketPromedio: string;
    items: number;
  }>();

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Chart data - all sellers
  const chartData = useMemo(() => {
    if (!sellers) return [];
    return sellers.map((seller) => ({
      name: seller.sellerName.length > 20
        ? `${seller.sellerName.substring(0, 20)}...`
        : seller.sellerName,
      revenue: seller.totalRevenue,
      sales: seller.salesCount,
    }));
  }, [sellers]);

  // Top 3 sellers
  const topSellers = useMemo(() => {
    if (!sellers || sellers.length === 0) return [];
    return sellers.slice(0, 3);
  }, [sellers]);

  // Summary metrics
  const summary = useMemo(() => {
    if (!sellers) return { totalSellers: 0, totalRevenue: 0, totalSales: 0, totalItems: 0 };
    return {
      totalSellers: sellers.length,
      totalRevenue: sellers.reduce((sum, s) => sum + s.totalRevenue, 0),
      totalSales: sellers.reduce((sum, s) => sum + s.salesCount, 0),
      totalItems: sellers.reduce((sum, s) => sum + s.totalItems, 0),
    };
  }, [sellers]);

  // Excel data
  const excelData = useMemo(() => {
    if (!sellers) return [];
    return sellers.map((seller) => ({
      vendedor: seller.sellerName,
      email: seller.sellerEmail,
      ventas: seller.salesCount,
      ingresos: formatCurrency(seller.totalRevenue),
      ticketPromedio: formatCurrency(seller.averageTicket),
      items: seller.totalItems,
    }));
  }, [sellers]);

  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'seller-sales-report',
      filename: `ventas-por-vendedor-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Reporte de Ventas por Vendedor',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    exportToExcel(excelData, {
      filename: `ventas-por-vendedor-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Ventas por Vendedor',
    });
  };

  return (
    <div className="space-y-6 p-6">
      <ReportHeader
        title="Ventas por Vendedor"
        description="Performance de ventas y ranking de cada vendedor del equipo"
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

      <div id="seller-sales-report" className="space-y-6">
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
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard
              title="Vendedores"
              value={summary.totalSellers}
              icon={<IconUsers className="size-5" />}
              suffix=" vendedores"
            />
            <KpiCard
              title="Ingresos Totales"
              value={formatCurrency(summary.totalRevenue)}
              icon={<IconCash className="size-5" />}
            />
            <KpiCard
              title="Total Ventas"
              value={summary.totalSales}
              icon={<IconShoppingCart className="size-5" />}
              suffix=" ventas"
            />
            <KpiCard
              title="Items Vendidos"
              value={summary.totalItems}
              icon={<IconPackage className="size-5" />}
              suffix=" items"
            />
          </div>
        )}

        {/* Top 3 Sellers Cards */}
        {topSellers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <IconTrophy className="size-6 text-yellow-500" />
              <h3 className="text-lg font-semibold">Top 3 Vendedores</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {topSellers.map((seller, index) => {
                const medalColor =
                  index === 0 ? 'text-yellow-500' :
                  index === 1 ? 'text-gray-400' :
                  'text-orange-600';

                const borderColor =
                  index === 0 ? 'border-yellow-500/30' :
                  index === 1 ? 'border-gray-400/30' :
                  'border-orange-600/30';

                return (
                  <Card key={seller.sellerId} className={`${borderColor} border-2`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <IconTrophy className={`size-6 ${medalColor}`} />
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Puesto #{index + 1}
                          </CardTitle>
                        </div>
                        <div className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                          {seller.salesCount} ventas
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="font-semibold text-lg mb-0.5">{seller.sellerName}</p>
                      <p className="text-xs text-muted-foreground mb-3">{seller.sellerEmail}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ingresos:</span>
                          <span className="font-medium">
                            {formatCurrency(seller.totalRevenue)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ticket Promedio:</span>
                          <span className="font-medium">
                            {formatCurrency(seller.averageTicket)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Items Vendidos:</span>
                          <span className="font-medium">{seller.totalItems}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Ranking Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconChartBar className="size-5 text-primary" />
              <CardTitle>Ranking de Vendedores por Ingresos</CardTitle>
            </div>
            <CardDescription>Comparación de performance del equipo</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[500px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(chartData.length * 50, 400)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 150 }}>
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
                    width={150}
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
                                <span className="text-muted-foreground">Ventas:</span>
                                <span className="font-medium">
                                  {payload[0].payload.sales}
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
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-center">
                  <IconUsers className="mx-auto size-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No hay datos de vendedores para el período seleccionado
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sellers Table */}
        {sellers && sellers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Vendedores</CardTitle>
              <CardDescription>
                Métricas completas de performance por vendedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Ranking</th>
                      <th className="text-left p-2 font-medium">Vendedor</th>
                      <th className="text-left p-2 font-medium">Email</th>
                      <th className="text-right p-2 font-medium">Ventas</th>
                      <th className="text-right p-2 font-medium">Ingresos</th>
                      <th className="text-right p-2 font-medium">Ticket Promedio</th>
                      <th className="text-right p-2 font-medium">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellers.map((seller, index) => (
                      <tr key={seller.sellerId} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <IconTrophy className={`size-4 ${
                                index === 0 ? 'text-yellow-500' :
                                index === 1 ? 'text-gray-400' :
                                'text-orange-600'
                              }`} />
                            )}
                            <span className="font-medium">#{index + 1}</span>
                          </div>
                        </td>
                        <td className="p-2 font-medium">{seller.sellerName}</td>
                        <td className="p-2 text-muted-foreground text-xs">
                          {seller.sellerEmail}
                        </td>
                        <td className="p-2 text-right">{seller.salesCount}</td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(seller.totalRevenue)}
                        </td>
                        <td className="p-2 text-right">
                          {formatCurrency(seller.averageTicket)}
                        </td>
                        <td className="p-2 text-right">{seller.totalItems}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td colSpan={3} className="p-2">Total</td>
                      <td className="p-2 text-right">{summary.totalSales}</td>
                      <td className="p-2 text-right">{formatCurrency(summary.totalRevenue)}</td>
                      <td className="p-2 text-right">
                        {formatCurrency(summary.totalRevenue / summary.totalSales)}
                      </td>
                      <td className="p-2 text-right">{summary.totalItems}</td>
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
