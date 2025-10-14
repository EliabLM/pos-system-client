'use client';

import { useState } from 'react';
import {
  IconCash,
  IconCreditCard,
  IconDeviceMobile,
  IconWallet,
  IconLock,
  IconPrinter,
  IconCalendar,
  IconTrendingUp,
  IconUsers,
  IconReceipt,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useStore } from '@/store';
import { useCashStatus } from '@/hooks/useDashboard';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { CashStatus } from '@/interfaces';

/**
 * Get payment method icon based on payment type
 */
const getPaymentIcon = (paymentType: CashStatus['paymentType']) => {
  switch (paymentType) {
    case 'CASH':
      return IconCash;
    case 'CARD':
      return IconCreditCard;
    case 'TRANSFER':
      return IconDeviceMobile;
    default:
      return IconWallet;
  }
};

/**
 * Get payment method color classes based on payment type
 */
const getPaymentColor = (paymentType: CashStatus['paymentType']) => {
  switch (paymentType) {
    case 'CASH':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        progress: 'bg-green-500',
        border: 'border-green-200 dark:border-green-800',
      };
    case 'CARD':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        progress: 'bg-blue-500',
        border: 'border-blue-200 dark:border-blue-800',
      };
    case 'TRANSFER':
      return {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-700 dark:text-purple-400',
        progress: 'bg-purple-500',
        border: 'border-purple-200 dark:border-purple-800',
      };
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800/30',
        text: 'text-gray-700 dark:text-gray-400',
        progress: 'bg-gray-500',
        border: 'border-gray-200 dark:border-gray-700',
      };
  }
};

/**
 * Format currency value (Colombian Pesos)
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
 * Format date to YYYY-MM-DD for input type="date"
 */
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date to display format (e.g., "15 de enero de 2025")
 */
const formatDateDisplay = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

/**
 * Check if selected date is today
 */
const isToday = (dateString: string): boolean => {
  const today = formatDateForInput(new Date());
  return dateString === today;
};

/**
 * Loading skeleton for payment method rows
 */
const PaymentMethodSkeleton = () => (
  <div className="flex items-center gap-4 p-4 border rounded-lg">
    <Skeleton className="h-10 w-10 rounded-lg" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-2 w-full" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  </div>
);

/**
 * Empty state component
 */
const EmptyState = ({ date }: { date: string }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="rounded-full bg-muted p-4 mb-4">
      <IconReceipt
        className="h-8 w-8 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
    <h3 className="text-lg font-semibold mb-1">No hay transacciones</h3>
    <p className="text-sm text-muted-foreground max-w-sm">
      No se registraron transacciones para {formatDateDisplay(date)}. Selecciona
      otra fecha o realiza ventas.
    </p>
  </div>
);

/**
 * Dashboard Cash Status Component
 *
 * Displays cash register breakdown by payment method for a selected date.
 * Features date selection, payment method statistics, and action buttons.
 */
interface DashboardCashStatusProps {
  selectedStoreId?: string;
}

export function DashboardCashStatus({ selectedStoreId }: DashboardCashStatusProps) {
  // Initialize with today's date
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateForInput(new Date())
  );

  // Get user from Zustand store
  const user = useStore((state) => state.user);
  const organizationId = user?.organizationId;

  // RBAC: SELLER users must use their assigned storeId (ignoring selectedStoreId prop)
  // ADMIN users use selectedStoreId from selector (can be undefined = toda la org)
  const storeId = user?.role === 'SELLER' ? user?.storeId : selectedStoreId;

  // Fetch cash status data
  const {
    data: cashStatusData,
    isLoading,
    error,
  } = useCashStatus(organizationId, storeId, selectedDate);

  // Calculate total amount from all payment methods
  const totalAmount =
    cashStatusData?.reduce((sum, method) => sum + method.totalAmount, 0) || 0;

  // Calculate total transactions
  const totalTransactions =
    cashStatusData?.reduce((sum, method) => sum + method.transactionCount, 0) ||
    0;

  // Find most used payment method
  const mostUsedMethod = cashStatusData?.reduce(
    (prev, current) =>
      current.transactionCount > prev.transactionCount ? current : prev,
    cashStatusData[0]
  );

  // Calculate average transaction
  const averageTransaction =
    totalTransactions > 0 ? totalAmount / totalTransactions : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconCash className="h-5 w-5" />
              Estado de Caja
            </CardTitle>
            <CardDescription className="mt-1.5">
              {isToday(selectedDate)
                ? 'Ingresos de hoy por método de pago'
                : `Ingresos del ${formatDateDisplay(selectedDate)}`}
            </CardDescription>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <IconCalendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={formatDateForInput(new Date())}
              className="px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors cursor-pointer"
              aria-label="Seleccionar fecha"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <IconAlertTriangle className="h-4 w-4" />
            <AlertTitle>Error al cargar datos</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : 'Ocurrió un error al cargar el estado de caja. Por favor, intenta de nuevo.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            {/* Total Amount Skeleton */}
            <div className="p-6 bg-primary/5 dark:bg-primary/10 rounded-lg border-2 border-primary/20">
              <Skeleton className="h-4 w-24 mb-2 mx-auto" />
              <Skeleton className="h-10 w-48 mx-auto" />
            </div>

            {/* Payment Methods Skeleton */}
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <PaymentMethodSkeleton key={index} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading &&
          !error &&
          (!cashStatusData || cashStatusData.length === 0) && (
            <EmptyState date={selectedDate} />
          )}

        {/* Data Display */}
        {!isLoading &&
          !error &&
          cashStatusData &&
          cashStatusData.length > 0 && (
            <>
              {/* Total Amount Header */}
              <div className="p-6 bg-primary/5 dark:bg-primary/10 rounded-lg border-2 border-primary/20">
                <p className="text-sm font-medium text-muted-foreground text-center mb-2">
                  Total del Día
                </p>
                <p className="text-4xl font-bold text-center text-primary tabular-nums">
                  {formatCurrency(totalAmount)}
                </p>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Desglose por Método de Pago
                </h3>

                {cashStatusData.map((method) => {
                  const Icon = getPaymentIcon(method.paymentType);
                  const colors = getPaymentColor(method.paymentType);

                  return (
                    <div
                      key={method.paymentMethodId}
                      className={cn(
                        'flex items-start gap-4 p-4 rounded-lg border transition-all hover:shadow-md',
                        colors.border
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'flex-shrink-0 p-2.5 rounded-lg',
                          colors.bg
                        )}
                      >
                        <Icon
                          className={cn('h-5 w-5', colors.text)}
                          aria-hidden="true"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Name and Amount */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-semibold truncate">
                            {method.paymentMethodName}
                          </span>
                          <span className="font-bold tabular-nums text-nowrap">
                            {formatCurrency(method.totalAmount)}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-2">
                          <Progress
                            value={method.percentageOfTotal}
                            className="h-2"
                            aria-label={`${method.percentageOfTotal.toFixed(
                              1
                            )}% del total`}
                          />
                        </div>

                        {/* Transaction Count and Percentage */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {formatNumber(method.transactionCount)}{' '}
                            transacciones
                          </span>
                          <span className="font-medium">
                            {method.percentageOfTotal.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Additional Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
                {/* Most Used Method */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <IconTrendingUp
                      className="h-4 w-4 text-blue-700 dark:text-blue-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">
                      Método más usado
                    </p>
                    <p className="text-sm font-semibold truncate">
                      {mostUsedMethod?.paymentMethodName || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Total Transactions */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <IconUsers
                      className="h-4 w-4 text-purple-700 dark:text-purple-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">
                      Total de transacciones
                    </p>
                    <p className="text-sm font-semibold">
                      {formatNumber(totalTransactions)}
                    </p>
                  </div>
                </div>

                {/* Average Transaction */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <IconReceipt
                      className="h-4 w-4 text-green-700 dark:text-green-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">
                      Promedio por transacción
                    </p>
                    <p className="text-sm font-semibold">
                      {formatCurrency(averageTransaction)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
      </CardContent>

      {/* Action Buttons */}
      {!isLoading && !error && cashStatusData && cashStatusData.length > 0 && (
        <CardFooter className="flex flex-col sm:flex-row gap-3 border-t pt-6">
          <Button
            variant="default"
            className="w-full sm:w-auto gap-2"
            disabled={true}
            title="Próximamente"
            aria-label="Cerrar caja"
          >
            <IconLock className="h-4 w-4" aria-hidden="true" />
            Cerrar Caja
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto gap-2"
            disabled={true}
            title="Próximamente"
            aria-label="Imprimir reporte"
          >
            <IconPrinter className="h-4 w-4" aria-hidden="true" />
            Imprimir Reporte
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
