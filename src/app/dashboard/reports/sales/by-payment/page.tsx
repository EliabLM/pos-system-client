/**
 * Sales by Payment Method Report Page
 *
 * Report showing:
 * - KPI cards for each payment method
 * - Pie chart showing payment method distribution
 * - Data table with payment method details
 * - Export functionality
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  IconCreditCard,
  IconCash,
  IconReceipt,
  IconChartPie,
} from '@tabler/icons-react';
import { subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ReportHeader } from '@/app/dashboard/reports/components/report-header';
import { ReportFilters } from '@/app/dashboard/reports/components/report-filters';
import { useSalesByPayment } from '@/hooks/useSalesReports';
import { useExport } from '@/hooks/useExport';
import { useStore } from '@/store';
import type { DateRangeFilter } from '@/interfaces/reports';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142 76% 36%)',
  'hsl(221 83% 53%)',
  'hsl(262 83% 58%)',
  'hsl(24 95% 53%)',
  'hsl(346 87% 43%)',
];

export default function SalesByPaymentReportPage(): React.ReactElement {
  const user = useStore((state) => state.user);

  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const [storeId, setStoreId] = useState<string | undefined>(undefined);

  const { data: paymentMethods, isLoading, error } = useSalesByPayment({
    organizationId: user?.organizationId || '',
    storeId,
    dateRange,
  });

  const { exportToPDF, exportToExcel, isExporting } = useExport<{
    metodo: string;
    tipo: string;
    transacciones: number;
    monto: string;
    ticketPromedio: string;
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
    if (!paymentMethods) return [];
    return paymentMethods.map((pm) => ({
      name: pm.paymentMethodName,
      value: pm.totalAmount,
      percentage: pm.percentage,
    }));
  }, [paymentMethods]);

  // Top 3 payment methods
  const topPaymentMethods = useMemo(() => {
    if (!paymentMethods || paymentMethods.length === 0) return [];
    return paymentMethods.slice(0, 3);
  }, [paymentMethods]);

  // Summary metrics
  const summary = useMemo(() => {
    if (!paymentMethods) {
      return { totalMethods: 0, totalAmount: 0, totalTransactions: 0 };
    }
    return {
      totalMethods: paymentMethods.length,
      totalAmount: paymentMethods.reduce((sum, pm) => sum + pm.totalAmount, 0),
      totalTransactions: paymentMethods.reduce((sum, pm) => sum + pm.transactionCount, 0),
    };
  }, [paymentMethods]);

  // Excel data
  const excelData = useMemo(() => {
    if (!paymentMethods) return [];
    return paymentMethods.map((pm) => ({
      metodo: pm.paymentMethodName,
      tipo: pm.paymentType,
      transacciones: pm.transactionCount,
      monto: formatCurrency(pm.totalAmount),
      ticketPromedio: formatCurrency(pm.averageTicket),
      porcentaje: `${pm.percentage.toFixed(2)}%`,
    }));
  }, [paymentMethods]);

  const handleExportPDF = (): void => {
    exportToPDF({
      elementId: 'payment-sales-report',
      filename: `ventas-por-pago-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Reporte de Ventas por Método de Pago',
      orientation: 'landscape',
    });
  };

  const handleExportExcel = (): void => {
    exportToExcel(excelData, {
      filename: `ventas-por-pago-${format(new Date(), 'yyyy-MM-dd')}`,
      sheetName: 'Ventas por Método de Pago',
    });
  };

  return (
    <div className="space-y-6 p-6">
      <ReportHeader
        title="Ventas por Método de Pago"
        description="Análisis de ventas según método de pago utilizado por los clientes"
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

      <div id="payment-sales-report" className="space-y-6">
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
              title="Métodos de Pago"
              value={summary.totalMethods}
              icon={<IconCreditCard className="size-5" />}
              suffix=" métodos"
            />
            <KpiCard
              title="Monto Total"
              value={formatCurrency(summary.totalAmount)}
              icon={<IconCash className="size-5" />}
            />
            <KpiCard
              title="Transacciones"
              value={summary.totalTransactions}
              icon={<IconReceipt className="size-5" />}
              suffix=" pagos"
            />
          </div>
        )}

        {/* Top 3 Payment Methods Cards */}
        {topPaymentMethods.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Top 3 Métodos de Pago</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {topPaymentMethods.map((method, index) => (
                <Card key={method.paymentMethodId} className="border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        #{index + 1} {method.paymentType}
                      </CardTitle>
                      <div className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                        {method.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold text-lg mb-1">{method.paymentMethodName}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monto:</span>
                        <span className="font-medium">
                          {formatCurrency(method.totalAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Transacciones:</span>
                        <span className="font-medium">{method.transactionCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ticket Promedio:</span>
                        <span className="font-medium">
                          {formatCurrency(method.averageTicket)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Pie Chart - Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <IconChartPie className="size-5 text-primary" />
              <CardTitle>Distribución por Método de Pago</CardTitle>
            </div>
            <CardDescription>Porcentaje de ventas por método de pago</CardDescription>
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
                    labelLine={true}
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
                                <span className="text-muted-foreground">Monto:</span>
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
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-center">
                  <IconCreditCard className="mx-auto size-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No hay datos de métodos de pago para el período seleccionado
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Table */}
        {paymentMethods && paymentMethods.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Métodos de Pago</CardTitle>
              <CardDescription>
                Lista completa de métodos de pago con métricas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Método</th>
                      <th className="text-left p-2 font-medium">Tipo</th>
                      <th className="text-right p-2 font-medium">Transacciones</th>
                      <th className="text-right p-2 font-medium">Monto Total</th>
                      <th className="text-right p-2 font-medium">Ticket Promedio</th>
                      <th className="text-right p-2 font-medium">% Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentMethods.map((method, index) => (
                      <tr key={method.paymentMethodId} className="border-b hover:bg-muted/50">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2 font-medium">{method.paymentMethodName}</td>
                        <td className="p-2">
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                            {method.paymentType}
                          </span>
                        </td>
                        <td className="p-2 text-right">{method.transactionCount}</td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(method.totalAmount)}
                        </td>
                        <td className="p-2 text-right">
                          {formatCurrency(method.averageTicket)}
                        </td>
                        <td className="p-2 text-right font-medium">
                          {method.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td colSpan={3} className="p-2">Total</td>
                      <td className="p-2 text-right">{summary.totalTransactions}</td>
                      <td className="p-2 text-right">{formatCurrency(summary.totalAmount)}</td>
                      <td className="p-2 text-right">
                        {formatCurrency(summary.totalAmount / summary.totalTransactions)}
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
