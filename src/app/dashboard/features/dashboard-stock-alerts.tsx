'use client';

import {
  IconAlertTriangle,
  IconAlertCircle,
  IconCircleCheck,
  IconPackage,
} from '@tabler/icons-react';
import { useStore } from '@/store';
import { useStockAlerts } from '@/hooks/useDashboard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { StockAlert } from '@/interfaces';

/**
 * Map API severity levels to Spanish alert levels
 */
const mapSeverityToAlertLevel = (
  severity: 'critical' | 'warning' | 'info'
): 'CRÍTICO' | 'URGENTE' | 'ADVERTENCIA' => {
  const mapping = {
    critical: 'CRÍTICO' as const,
    warning: 'URGENTE' as const,
    info: 'ADVERTENCIA' as const,
  };
  return mapping[severity];
};

/**
 * Get severity order for sorting (CRÍTICO first)
 */
const getSeverityOrder = (
  severity: 'critical' | 'warning' | 'info'
): number => {
  const order = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return order[severity];
};

/**
 * Get alert icon configuration based on severity
 */
const getAlertIconConfig = (severity: 'critical' | 'warning' | 'info') => {
  if (severity === 'critical') {
    return {
      icon: IconAlertTriangle,
      className: 'text-red-600 dark:text-red-400',
      ariaLabel: 'Alerta crítica',
    };
  }

  if (severity === 'warning') {
    return {
      icon: IconAlertCircle,
      className: 'text-yellow-600 dark:text-yellow-400',
      ariaLabel: 'Alerta urgente',
    };
  }

  return {
    icon: IconAlertCircle,
    className: 'text-blue-600 dark:text-blue-400',
    ariaLabel: 'Alerta de advertencia',
  };
};

/**
 * Get badge variant and classes based on alert level
 */
const getBadgeConfig = (alertLevel: 'CRÍTICO' | 'URGENTE' | 'ADVERTENCIA') => {
  if (alertLevel === 'CRÍTICO') {
    return {
      variant: 'destructive' as const,
      className:
        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    };
  }

  if (alertLevel === 'URGENTE') {
    return {
      variant: 'default' as const,
      className:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    };
  }

  return {
    variant: 'secondary' as const,
    className:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  };
};

/**
 * Get border color classes based on severity
 */
const getBorderColor = (severity: 'critical' | 'warning' | 'info'): string => {
  if (severity === 'critical') return 'border-l-red-500 dark:border-l-red-400';
  if (severity === 'warning')
    return 'border-l-yellow-500 dark:border-l-yellow-400';
  return 'border-l-blue-500 dark:border-l-blue-400';
};

/**
 * Format stock info with unit measure
 */
const formatStockInfo = (
  currentStock: number,
  minStock: number,
  unitMeasure?: string
): string => {
  const unit = unitMeasure || 'unidades';
  return `${currentStock} / ${minStock} ${unit}`;
};

/**
 * Skeleton loader for alert cards
 */
const AlertCardSkeleton = () => (
  <Card className="border-l-4">
    <CardContent className="pt-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>
    </CardContent>
  </Card>
);

/**
 * Empty state component
 */
const EmptyState = () => (
  <Alert className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
    <IconCircleCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
    <AlertTitle className="text-green-700 dark:text-green-300">
      Todos los productos tienen stock suficiente
    </AlertTitle>
    <AlertDescription className="text-green-600 dark:text-green-400">
      No hay productos con stock bajo en este momento. El inventario se
      encuentra en niveles óptimos.
    </AlertDescription>
  </Alert>
);

/**
 * Individual alert card component
 */
interface AlertCardProps {
  alert: StockAlert;
}

const AlertCard = ({ alert }: AlertCardProps) => {
  const alertLevel = mapSeverityToAlertLevel(alert.severity);
  const iconConfig = getAlertIconConfig(alert.severity);
  const badgeConfig = getBadgeConfig(alertLevel);
  const borderColor = getBorderColor(alert.severity);
  const AlertIcon = iconConfig.icon;

  return (
    <Card
      className={cn(
        'border-l-4 hover:shadow-md transition-shadow',
        borderColor
      )}
    >
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Header: Icon, Product Name, and Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <AlertIcon
                className={cn('h-5 w-5 shrink-0', iconConfig.className)}
                aria-label={iconConfig.ariaLabel}
              />
              <h3
                className="font-semibold text-sm leading-tight truncate"
                title={alert.productName}
              >
                {alert.productName}
              </h3>
            </div>
            <Badge
              variant={badgeConfig.variant}
              className={cn('shrink-0 text-xs', badgeConfig.className)}
            >
              {alertLevel}
            </Badge>
          </div>

          {/* Stock Info */}
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Stock actual:</span>{' '}
            {formatStockInfo(
              alert.currentStock,
              alert.minStock,
              alert.sku || undefined
            )}
          </div>

          {/* Days Until Depletion (if available) */}
          {alert.daysUntilStockout !== undefined &&
            alert.daysUntilStockout !== null && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Estimado:</span> ~
                {alert.daysUntilStockout} días para agotarse
              </div>
            )}

          {/* Quick Action Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={true}
            title="Próximamente"
            aria-label={`Generar orden de compra para ${alert.productName}`}
          >
            <IconPackage className="h-4 w-4" />
            Generar orden
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Dashboard Stock Alerts Component
 *
 * Displays products with low stock organized by severity level.
 * Features loading states, error handling, empty states, and responsive grid layout.
 */
export function DashboardStockAlerts() {
  // Get organization and store from Zustand store
  const user = useStore((state) => state.user);
  const organizationId = user?.organizationId;
  const storeId = useStore((state) => state.storeId);

  // Fetch stock alerts data
  const {
    data: stockAlerts,
    isLoading,
    error,
  } = useStockAlerts(organizationId, storeId);

  // Sort alerts by severity (CRÍTICO → URGENTE → ADVERTENCIA)
  const sortedAlerts = stockAlerts
    ? [...stockAlerts].sort(
        (a, b) => getSeverityOrder(a.severity) - getSeverityOrder(b.severity)
      )
    : [];

  // Limit to 12 alerts maximum
  const displayedAlerts = sortedAlerts.slice(0, 12);
  const hasMoreAlerts = sortedAlerts.length > 12;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconAlertTriangle
            className="h-5 w-5 text-orange-500"
            aria-hidden="true"
          />
          Alertas de Stock
        </CardTitle>
        <CardDescription>
          Productos que requieren reabastecimiento
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <IconAlertTriangle className="h-4 w-4" />
            <AlertTitle>Error al cargar alertas</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : 'Ocurrió un error al cargar las alertas de stock. Por favor, intenta de nuevo.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <AlertCardSkeleton key={index} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!stockAlerts || stockAlerts.length === 0) && (
          <EmptyState />
        )}

        {/* Alerts Grid */}
        {!isLoading && !error && stockAlerts && stockAlerts.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedAlerts.map((alert) => (
                <AlertCard key={alert.productId} alert={alert} />
              ))}
            </div>

            {/* Show "Ver todas" button if there are more alerts */}
            {hasMoreAlerts && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" size="sm">
                  Ver todas las alertas ({sortedAlerts.length})
                </Button>
              </div>
            )}

            {/* Alert count summary */}
            {!hasMoreAlerts && (
              <div className="text-sm text-muted-foreground text-center pt-2">
                Mostrando {displayedAlerts.length}{' '}
                {displayedAlerts.length === 1 ? 'alerta' : 'alertas'}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
