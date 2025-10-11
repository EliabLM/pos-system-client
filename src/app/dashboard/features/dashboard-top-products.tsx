'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconShoppingCartOff,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useStore } from '@/store';
import { useTopProducts } from '@/hooks/useDashboard';
import {
  PeriodSelector,
  type PeriodValue,
} from '@/components/dashboard/period-selector';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/**
 * Map period selector values to API period values
 */
const mapPeriodToApiPeriod = (
  period: PeriodValue
): 'today' | 'week' | 'month' | 'year' => {
  if (period === 'day') return 'today';
  return period;
};

/**
 * Get period description based on selected period
 */
const getPeriodDescription = (period: PeriodValue): string => {
  const descriptions: Record<PeriodValue, string> = {
    day: 'Los productos más vendidos de hoy',
    week: 'Los productos más vendidos esta semana',
    month: 'Los productos más vendidos este mes',
    year: 'Los productos más vendidos este año',
  };
  return descriptions[period];
};

/**
 * Get medal emoji for top 3 products
 */
const getMedalEmoji = (rank: number): string | null => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
};

/**
 * Get avatar background color based on product name
 */
const getAvatarColor = (name: string, index: number): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500',
  ];

  // Use a simple hash based on name + index for consistency
  const hash = name
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), index);
  return colors[hash % colors.length];
};

/**
 * Format currency value
 */
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format number with thousands separator
 */
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Get trend badge variant and icon based on trend direction
 */
const getTrendInfo = (trend?: 'up' | 'down' | 'neutral') => {
  if (trend === 'up') {
    return {
      variant: 'default' as const,
      icon: IconTrendingUp,
      className:
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
      ariaLabel: 'Tendencia al alza',
    };
  }

  if (trend === 'down') {
    return {
      variant: 'destructive' as const,
      icon: IconTrendingDown,
      className:
        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
      ariaLabel: 'Tendencia a la baja',
    };
  }

  return {
    variant: 'secondary' as const,
    icon: IconMinus,
    className:
      'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    ariaLabel: 'Tendencia neutral',
  };
};

/**
 * Skeleton loader for table rows
 */
const TableRowSkeleton = () => (
  <TableRow>
    <TableCell>
      <Skeleton className="h-6 w-8" />
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-32" />
      </div>
    </TableCell>
    <TableCell className="hidden md:table-cell">
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-12" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-20" />
    </TableCell>
    <TableCell className="hidden md:table-cell">
      <Skeleton className="h-6 w-16" />
    </TableCell>
  </TableRow>
);

/**
 * Empty state component
 */
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="rounded-full bg-muted p-4 mb-4">
      <IconShoppingCartOff
        className="h-8 w-8 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
    <h3 className="text-lg font-semibold mb-1">No hay datos disponibles</h3>
    <p className="text-sm text-muted-foreground max-w-sm">
      No se encontraron productos vendidos en el periodo seleccionado. Intenta
      seleccionar otro periodo o realiza algunas ventas.
    </p>
  </div>
);

/**
 * Dashboard Top Products Component
 *
 * Displays a table of top-selling products with ranking, images, sales data, and trends.
 * Features period selection, responsive design, and comprehensive loading/error/empty states.
 */
export function DashboardTopProducts() {
  const [period, setPeriod] = useState<PeriodValue>('day');

  // Get organization and store from Zustand store
  const user = useStore((state) => state.user);
  const organizationId = user?.organizationId;
  const storeId = useStore((state) => state.storeId);

  // Fetch top products data
  const apiPeriod = mapPeriodToApiPeriod(period);
  const {
    data: topProducts,
    isLoading,
    error,
  } = useTopProducts(
    organizationId,
    apiPeriod,
    storeId,
    10 // Limit to top 10 products
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Productos Más Vendidos</CardTitle>
            <CardDescription className="mt-1.5">
              {getPeriodDescription(period)}
            </CardDescription>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </CardHeader>

      <CardContent>
        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <IconAlertTriangle className="h-4 w-4" />
            <AlertTitle>Error al cargar datos</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : 'Ocurrió un error al cargar los productos más vendidos. Por favor, intenta de nuevo.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Categoría
                  </TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="hidden md:table-cell text-center">
                    Tendencia
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRowSkeleton key={index} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!topProducts || topProducts.length === 0) && (
          <EmptyState />
        )}

        {/* Data Table */}
        {!isLoading && !error && topProducts && topProducts.length > 0 && (
          <div className="rounded-md border overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Categoría
                    </TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="hidden md:table-cell text-center">
                      Tendencia
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product, index) => {
                    const rank = index + 1;
                    const medal = getMedalEmoji(rank);
                    const avatarColor = getAvatarColor(
                      product.productName,
                      index
                    );
                    const initial = product.productName.charAt(0).toUpperCase();

                    // Calculate trend based on percentageOfTotal (simplified logic)
                    // In a real scenario, this should come from the API
                    const trend =
                      product.percentageOfTotal > 15
                        ? 'up'
                        : product.percentageOfTotal < 5
                        ? 'down'
                        : 'neutral';
                    const trendInfo = getTrendInfo(trend);
                    const TrendIcon = trendInfo.icon;

                    return (
                      <TableRow
                        key={product.productId}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        {/* Rank */}
                        <TableCell className="font-medium">
                          <div className="flex items-center justify-center">
                            {medal ? (
                              <span
                                className="text-2xl"
                                role="img"
                                aria-label={`Posición ${rank}`}
                              >
                                {medal}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {rank}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Product Name with Image */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 rounded-lg">
                              {product.productImage ? (
                                <AvatarImage
                                  src={product.productImage}
                                  alt={product.productName}
                                  className="object-cover"
                                />
                              ) : null}
                              <AvatarFallback
                                className={cn(
                                  'rounded-lg text-white font-semibold',
                                  avatarColor
                                )}
                              >
                                {initial}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium line-clamp-1">
                              {product.productName}
                            </span>
                          </div>
                        </TableCell>

                        {/* Category (hidden on mobile) */}
                        <TableCell className="hidden md:table-cell">
                          <span className="text-muted-foreground">
                            {product.categoryName || 'Sin categoría'}
                          </span>
                        </TableCell>

                        {/* Units Sold */}
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatNumber(product.quantitySold)}
                        </TableCell>

                        {/* Revenue */}
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(product.totalRevenue)}
                        </TableCell>

                        {/* Trend (hidden on mobile) */}
                        <TableCell className="hidden md:table-cell">
                          <div className="flex justify-center">
                            <Badge
                              variant={trendInfo.variant}
                              className={cn('gap-1', trendInfo.className)}
                              aria-label={trendInfo.ariaLabel}
                            >
                              <TrendIcon
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              <span className="sr-only">
                                {trendInfo.ariaLabel}
                              </span>
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Optional: Show total products count */}
        {!isLoading && !error && topProducts && topProducts.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Mostrando los {topProducts.length} productos más vendidos
          </div>
        )}
      </CardContent>
    </Card>
  );
}
