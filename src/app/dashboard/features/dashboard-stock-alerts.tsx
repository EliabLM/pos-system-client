'use client';

import { useState } from 'react';
import {
  IconAlertTriangle,
  IconAlertCircle,
  IconCircleCheck,
  IconPackage,
  IconChevronDown,
  IconChevronUp,
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
    <CardContent className="pt-4 sm:pt-6">
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Skeleton className="h-5 w-5 rounded-full shrink-0" />
            <Skeleton className="h-5 w-full max-w-[8rem]" />
          </div>
          <Skeleton className="h-5 w-16 sm:w-20 shrink-0" />
        </div>
        <Skeleton className="h-4 w-full max-w-[7rem]" />
        <Skeleton className="h-4 w-full max-w-[6rem]" />
        <Skeleton className="h-8 sm:h-9 w-full" />
      </div>
    </CardContent>
  </Card>
);

/**
 * Empty state component
 */
const EmptyState = () => (
  <Alert className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
    <IconCircleCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
    <AlertTitle className="text-green-700 dark:text-green-300 text-sm sm:text-base">
      Todos los productos tienen stock suficiente
    </AlertTitle>
    <AlertDescription className="text-green-600 dark:text-green-400 text-xs sm:text-sm">
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
      <CardContent className="pt-4 sm:pt-6">
        <div className="space-y-2 sm:space-y-3">
          {/* Header: Icon, Product Name, and Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <AlertIcon
                className={cn(
                  'h-4 w-4 sm:h-5 sm:w-5 shrink-0',
                  iconConfig.className
                )}
                aria-label={iconConfig.ariaLabel}
              />
              <h3
                className="font-semibold text-sm sm:text-base leading-tight truncate"
                title={alert.productName}
              >
                {alert.productName}
              </h3>
            </div>
            <Badge
              variant={badgeConfig.variant}
              className={cn(
                'shrink-0 text-xs whitespace-nowrap',
                badgeConfig.className
              )}
            >
              {alertLevel}
            </Badge>
          </div>

          {/* Stock Info */}
          <div className="text-xs sm:text-sm text-muted-foreground">
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
            className="w-full text-xs sm:text-sm"
            disabled={true}
            title="Próximamente"
            aria-label={`Generar orden de compra para ${alert.productName}`}
          >
            <IconPackage className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
interface DashboardStockAlertsProps {
  selectedStoreId?: string;
}

export function DashboardStockAlerts({
  selectedStoreId,
}: DashboardStockAlertsProps) {
  // State to track if alerts are expanded
  const [isExpanded, setIsExpanded] = useState(false);

  // Get user from Zustand store
  const user = useStore((state) => state.user);
  const organizationId = user?.organizationId;

  // RBAC: SELLER users must use their assigned storeId (ignoring selectedStoreId prop)
  // ADMIN users use selectedStoreId from selector (can be undefined = toda la org)
  const storeId = user?.role === 'SELLER' ? user?.storeId : selectedStoreId;

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

  // Show 2 alerts by default, all when expanded
  const INITIAL_ALERTS_COUNT = 2;
  const displayedAlerts = isExpanded
    ? sortedAlerts
    : sortedAlerts.slice(0, INITIAL_ALERTS_COUNT);
  const hasMoreAlerts = sortedAlerts.length > INITIAL_ALERTS_COUNT;
  const hiddenAlertsCount = sortedAlerts.length - INITIAL_ALERTS_COUNT;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <IconAlertTriangle
            className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500"
            aria-hidden="true"
          />
          Alertas de Stock
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Productos que requieren reabastecimiento
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <IconAlertTriangle className="h-4 w-4" />
            <AlertTitle>Error al cargar alertas</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">
              {error instanceof Error
                ? error.message
                : 'Ocurrió un error al cargar las alertas de stock. Por favor, intenta de nuevo.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
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
          <div className="space-y-3 sm:space-y-4">
            {/*
              Responsive Grid Strategy:
              - Mobile (default): 1 column for readability on small screens
              - Small screens (sm:): Still 1 column to maintain card readability
              - When this component is in the sidebar (lg:col-span-1 from parent):
                The container is narrow, so we keep 1 column for optimal UX
              - On ultra-wide screens (2xl:): 1 column is still best in sidebar
            */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {displayedAlerts.map((alert) => (
                <AlertCard key={alert.productId} alert={alert} />
              ))}
            </div>

            {/* Expand/Collapse button if there are more alerts */}
            {hasMoreAlerts && (
              <div className="flex justify-center pt-1 sm:pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm gap-1.5"
                  onClick={() => setIsExpanded(!isExpanded)}
                  aria-expanded={isExpanded}
                  aria-label={
                    isExpanded
                      ? 'Mostrar menos alertas'
                      : `Ver ${hiddenAlertsCount} alertas más`
                  }
                >
                  {isExpanded ? (
                    <>
                      <IconChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Ver menos
                    </>
                  ) : (
                    <>
                      <IconChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Ver {hiddenAlertsCount}{' '}
                      {hiddenAlertsCount === 1 ? 'alerta más' : 'alertas más'}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Alert count summary - only show when not expandable or when expanded */}
            {!hasMoreAlerts && (
              <div className="text-xs sm:text-sm text-muted-foreground text-center pt-1 sm:pt-2">
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
