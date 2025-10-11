'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodSelector, PeriodValue } from '@/components/dashboard';
import { useSalesByPeriod } from '@/hooks/useDashboard';
import { useStore } from '@/store';
import { SalesByPeriod } from '@/interfaces';
import { IconAlertCircle } from '@tabler/icons-react';

/**
 * Format currency values for display
 * @param value - Numeric value to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Custom tooltip component for the chart
 */
function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-medium text-sm mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          <span className="text-muted-foreground">
            {entry.name === 'sales' ? 'Periodo actual' : 'Periodo anterior'}:
          </span>
          <span className="font-semibold tabular-nums">
            {formatCurrency(entry.value as number)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Get description text based on selected period
 */
function getPeriodDescription(period: PeriodValue): string {
  const descriptions: Record<PeriodValue, string> = {
    day: 'Ventas de hoy por hora',
    week: 'Ventas de la semana por día',
    month: 'Ventas del mes por día',
    year: 'Ventas del año por mes',
  };
  return descriptions[period];
}

/**
 * Transform SalesByPeriod data to chart format
 */
interface ChartDataPoint {
  label: string;
  sales: number;
  previousSales?: number;
}

function transformData(
  data: SalesByPeriod[] | null | undefined
): ChartDataPoint[] {
  if (!data || data.length === 0) return [];

  return data.map((item) => ({
    label: item.date, // This will be formatted by the backend
    sales: item.sales,
    previousSales: undefined, // Can be extended later for previous period comparison
  }));
}

/**
 * Dashboard Sales Chart Component
 *
 * Displays sales data in an area chart with period selection.
 * Supports comparison with previous period and responsive design.
 */
export function DashboardSalesChart() {
  const [period, setPeriod] = useState<PeriodValue>('day');

  // Get user data from Zustand store
  const user = useStore((state) => state.user);
  const organizationId = user?.organizationId;
  const storeId = useStore((state) => state.storeId);

  // Fetch sales data using the hook
  const { data, isLoading, error } = useSalesByPeriod(
    organizationId,
    period,
    storeId
  );

  // Transform data for chart
  const chartData = transformData(data);

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle>Ventas</CardTitle>
            <CardDescription>{getPeriodDescription(period)}</CardDescription>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <IconAlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error al cargar los datos de ventas: {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render empty state
   */
  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle>Ventas</CardTitle>
            <CardDescription>{getPeriodDescription(period)}</CardDescription>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </CardHeader>
        <CardContent>
          <div className="flex h-[350px] items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground text-sm">
                No hay datos de ventas disponibles
              </p>
              <p className="text-muted-foreground text-xs">
                Intenta seleccionar un periodo diferente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render chart with data
   */
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle>Ventas</CardTitle>
          <CardDescription>{getPeriodDescription(period)}</CardDescription>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </CardHeader>
      <CardContent>
        <div
          className="w-full"
          role="img"
          aria-label="Gráfico de ventas por periodo"
        >
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              {/* Gradient definition for area fill */}
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
                {/* Gradient for previous period (if needed in future) */}
                <linearGradient
                  id="colorPreviousSales"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--muted-foreground))"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--muted-foreground))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              {/* Grid with subtle styling */}
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />

              {/* X Axis - Period labels */}
              <XAxis
                dataKey="label"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />

              {/* Y Axis - Currency values */}
              <YAxis
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                dx={-10}
                width={80}
              />

              {/* Custom tooltip */}
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ strokeDasharray: '3 3' }}
              />

              {/* Previous period area (if data available) */}
              {chartData.some((d) => d.previousSales !== undefined) && (
                <Area
                  type="monotone"
                  dataKey="previousSales"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  fillOpacity={1}
                  fill="url(#colorPreviousSales)"
                  name="Periodo anterior"
                  isAnimationActive={true}
                  animationDuration={800}
                />
              )}

              {/* Current period area */}
              <Area
                type="monotone"
                dataKey="sales"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSales)"
                name="Ventas"
                isAnimationActive={true}
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
