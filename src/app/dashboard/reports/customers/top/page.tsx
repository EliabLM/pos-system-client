/**
 * Top Customers Report Page
 *
 * Report showing:
 * - KPI cards for customer metrics
 * - Bar chart showing top customers by revenue
 * - Data table with customer details
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
  IconChartBar,
  IconMail,
  IconCalendar,
} from '@tabler/icons-react';
import { subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ReportHeader } from '@/app/dashboard/reports/components/report-header';
import { ReportFilters } from '@/app/dashboard/reports/components/report-filters';
import { useTopCustomers, useCustomerSummary } from '@/hooks/useCustomerReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';
import type { DateRangeFilter } from '@/interfaces/reports';

const CHART_COLOR = 'hsl(220, 90%, 56%)';

export default function TopCustomersReportPage(): React.ReactElement {
  const user = useStore((state) => state.user);

  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const [storeId, setStoreId] = useState<string | undefined>(undefined);

  const { data: customers, isLoading: isLoadingCustomers, error } = useTopCustomers({
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
    cliente: string;
    email: string;
    compras: number;
    total: string;
    ticket_promedio: string;
    frecuencia: string;
    ultima_compra: string;
  }>();

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Top 10 customers for chart
  const chartData = useMemo(() => {
    if (!customers) return [];
    return customers.slice(0, 10).map((customer) => ({
      name: customer.customerName.length > 20
        ? `${customer.customerName.substring(0, 20)}...`
        : customer.customerName,
      totalSpent: customer.totalSpent,
    }));
  }, [customers]);

  // Excel data
  const excelData = useMemo(() => {
    if (!customers) return [];
    return customers.map((customer) => ({
      cliente: customer.customerName,
      email: customer.email || 'N/A',
      compras: customer.totalPurchases,
      total: formatCurrency(customer.totalSpent),
      ticket_promedio: formatCurrency(customer.averageTicket),
      frecuencia: `${customer.frequency.toFixed(2)} compras/mes`,
      ultima_compra: format(new Date(customer.lastPurchaseDate), 'dd/MM/yyyy', { locale: es }),
    }));
  }, [customers]);

  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'top-customers-report',
      filename: `top-clientes-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Reporte de Top Clientes',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    exportToExcel(excelData, {
      filename: `top-clientes-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Top Clientes',
    });
  };

  const isLoading = isLoadingCustomers || isLoadingSummary;

  return (
    <div className="space-y-6 p-6">
      <ReportHeader
        title="Top Clientes"
        description="Análisis de los mejores clientes por volumen de compras"
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

      <div id="top-customers-report" className="space-y-6">
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
        ) : summary ? (
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard
              title="Total Clientes"
              value={summary.totalCustomers}
              icon={<IconUsers className="size-5" />}
              suffix=" clientes"
            />
            <KpiCard
              title="Clientes Activos"
              value={summary.activeCustomers}
              icon={<IconUsers className="size-5" />}
              suffix=" activos"
            />
            <KpiCard
              title="Valor Promedio"
              value={formatCurrency(summary.averagePurchaseValue)}
              icon={<IconCash className="size-5" />}
            />
            <KpiCard
              title="CLV"
              value={formatCurrency(summary.customerLifetimeValue)}
              icon={<IconShoppingCart className="size-5" />}
            />
          </div>
        ) : null}

        {/* Top Customers Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconChartBar className="size-5 text-primary" />
              <CardTitle>Top 10 Clientes por Ingresos</CardTitle>
            </div>
            <CardDescription>Clientes que generan mayores ingresos</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} layout="vertical">
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
                            <div className="text-xs">
                              <span className="text-muted-foreground">Total: </span>
                              <span className="font-medium">
                                {formatCurrency(Number(payload[0].value))}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="totalSpent" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLOR} />
                    ))}
                  </Bar>
                </BarChart>
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

        {/* Customers Table */}
        {customers && customers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Clientes</CardTitle>
              <CardDescription>
                Lista completa de clientes con métricas de compra
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Cliente</th>
                      <th className="text-left p-2 font-medium">Email</th>
                      <th className="text-right p-2 font-medium">Compras</th>
                      <th className="text-right p-2 font-medium">Total Gastado</th>
                      <th className="text-right p-2 font-medium">Ticket Promedio</th>
                      <th className="text-right p-2 font-medium">Frecuencia</th>
                      <th className="text-right p-2 font-medium">Última Compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer, index) => (
                      <tr key={customer.customerId} className="border-b hover:bg-muted/50">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2 font-medium">{customer.customerName}</td>
                        <td className="p-2">
                          {customer.email ? (
                            <div className="flex items-center gap-1">
                              <IconMail className="size-3 text-muted-foreground" />
                              <span className="text-xs">{customer.email}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </td>
                        <td className="p-2 text-right">{customer.totalPurchases}</td>
                        <td className="p-2 text-right font-medium text-green-600">
                          {formatCurrency(customer.totalSpent)}
                        </td>
                        <td className="p-2 text-right">
                          {formatCurrency(customer.averageTicket)}
                        </td>
                        <td className="p-2 text-right">
                          {customer.frequency.toFixed(2)} /mes
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <IconCalendar className="size-3 text-muted-foreground" />
                            <span className="text-xs">
                              {format(new Date(customer.lastPurchaseDate), 'dd/MM/yyyy', { locale: es })}
                            </span>
                          </div>
                        </td>
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
