'use client';

import {
  IconUser,
  IconMail,
  IconPhone,
  IconMapPin,
  IconFileText,
  IconCalendar,
  IconCircleCheckFilled,
  IconAlertCircleFilled,
  IconShoppingCart,
  IconCurrencyDollar,
  IconTrendingUp,
  IconChartBar,
} from '@tabler/icons-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Customer } from '@/generated/prisma';
import {
  useCustomerStatistics,
  useCustomerPurchaseHistory,
} from '@/hooks/useCustomers';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Type for Customer with includes from API
type CustomerWithIncludes = Customer & {
  sales?: any[];
  _count?: {
    sales: number;
  };
};

interface CustomerDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerWithIncludes | null;
}

export default function CustomerDetailSheet({
  open,
  onOpenChange,
  customer,
}: CustomerDetailSheetProps) {
  // Fetch customer statistics and purchase history
  const {
    data: statistics,
    isLoading: statsLoading,
    error: statsError,
  } = useCustomerStatistics(customer?.id ?? '');

  const {
    data: purchaseHistoryResponse,
    isLoading: historyLoading,
  } = useCustomerPurchaseHistory(customer?.id ?? '', { page: 1, limit: 5 });

  // Extract sales array from response
  const purchaseHistory = purchaseHistoryResponse?.sales ?? [];

  // Loading state
  if (!customer && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconUser className="size-5" />
              Detalle del Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Skeleton className="h-8 w-full max-w-64" />
            <Skeleton className="h-4 w-full max-w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // No customer found
  if (!customer) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconUser className="size-5" />
              Detalle del Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 gap-4 px-4">
            <p className="text-muted-foreground text-center">
              No se encontró el cliente
            </p>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-3 sm:p-6 pb-3 sm:pb-4 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-2xl">
                <IconUser
                  className="size-5 sm:size-6 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">
                  {customer.firstName} {customer.lastName}
                </span>
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base flex items-center gap-2">
                <span className="truncate">
                  {customer.email || 'Sin email registrado'}
                </span>
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={`gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 shrink-0 text-xs sm:text-sm ${
                customer.isActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
              }`}
            >
              {customer.isActive ? (
                <IconCircleCheckFilled className="size-3 sm:size-4 fill-green-500 dark:fill-green-400" />
              ) : (
                <IconAlertCircleFilled className="size-3 sm:size-4 fill-red-500 dark:fill-red-400" />
              )}
              <span className="font-medium">
                {customer.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </Badge>
          </div>
        </DialogHeader>

        <Separator className="shrink-0" />

        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            {/* Personal Information */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconUser
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Información Personal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconUser className="size-4" aria-hidden="true" />
                    <span>Nombre Completo</span>
                  </div>
                  <p className="font-medium">
                    {customer.firstName} {customer.lastName}
                  </p>
                </div>
                {customer.email && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconMail className="size-4" aria-hidden="true" />
                      <span>Email</span>
                    </div>
                    <p className="font-medium break-all">{customer.email}</p>
                  </div>
                )}
                {customer.phone && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconPhone className="size-4" aria-hidden="true" />
                      <span>Teléfono</span>
                    </div>
                    <p className="font-medium">{customer.phone}</p>
                  </div>
                )}
                {customer.document && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconFileText className="size-4" aria-hidden="true" />
                      <span>Documento</span>
                    </div>
                    <p className="font-medium">
                      {customer.documentType || 'N/A'}: {customer.document}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Location Information */}
            {(customer.address || customer.city || customer.department) && (
              <section className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <IconMapPin
                    className="size-4 sm:size-5 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                  Ubicación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                  {customer.address && (
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <IconMapPin className="size-4" aria-hidden="true" />
                        <span>Dirección</span>
                      </div>
                      <p className="font-medium">{customer.address}</p>
                    </div>
                  )}
                  {customer.city && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Ciudad</p>
                      <p className="font-medium">{customer.city}</p>
                    </div>
                  )}
                  {customer.department && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Departamento
                      </p>
                      <p className="font-medium">{customer.department}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Purchase Statistics */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconChartBar
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Estadísticas de Compras
              </h3>
              {statsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : statsError ? (
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    Error al cargar estadísticas
                  </p>
                </div>
              ) : statistics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {/* Total Purchases */}
                  <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <IconShoppingCart className="size-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Total Compras
                        </p>
                        <p className="text-xl sm:text-2xl font-bold">
                          {statistics.totalPurchases ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Total Spent */}
                  <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-green-500/10 p-2">
                        <IconCurrencyDollar className="size-5 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Total Gastado
                        </p>
                        <p className="text-xl sm:text-2xl font-bold">
                          ${(statistics.totalSpent ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Average Purchase */}
                  <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-500/10 p-2">
                        <IconTrendingUp className="size-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Compra Promedio
                        </p>
                        <p className="text-xl sm:text-2xl font-bold">
                          $
                          {(statistics.averagePurchase ?? 0).toLocaleString(
                            'es-CO',
                            {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Last Purchase Date */}
                  <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-purple-500/10 p-2">
                        <IconCalendar className="size-5 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Última Compra
                        </p>
                        <p className="text-base font-semibold">
                          {statistics.lastPurchaseDate
                            ? formatDistanceToNow(
                                new Date(statistics.lastPurchaseDate),
                                {
                                  addSuffix: true,
                                  locale: es,
                                }
                              )
                            : 'Sin compras'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay estadísticas disponibles
                  </p>
                </div>
              )}
            </section>

            {/* Recent Purchases */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconShoppingCart
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Compras Recientes
              </h3>
              {historyLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : purchaseHistory.length > 0 ? (
                <div className="space-y-2">
                  {purchaseHistory.slice(0, 5).map((sale: any) => (
                    <div
                      key={sale.id}
                      className="p-3 sm:p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">
                            Venta #{sale.saleNumber}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(sale.saleDate), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm sm:text-base">
                            ${(sale.total ?? 0).toLocaleString()}
                          </p>
                          <Badge
                            variant={
                              sale.status === 'PAID' ? 'default' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {sale.status === 'PAID'
                              ? 'Pagado'
                              : sale.status === 'PENDING'
                                ? 'Pendiente'
                                : sale.status === 'OVERDUE'
                                  ? 'Vencido'
                                  : 'Cancelado'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay compras registradas
                  </p>
                </div>
              )}
            </section>

            {/* Timestamps */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconCalendar
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Información del Registro
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconCalendar className="size-4" aria-hidden="true" />
                    <span>Creado</span>
                  </div>
                  <p className="font-medium text-sm">
                    {new Date(customer.createdAt).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconCalendar className="size-4" aria-hidden="true" />
                    <span>Última Actualización</span>
                  </div>
                  <p className="font-medium text-sm">
                    {formatDistanceToNow(new Date(customer.updatedAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* Footer */}
        <Separator className="shrink-0" />
        <div className="p-3 sm:p-6 pt-3 sm:pt-4 flex justify-end shrink-0">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              Cerrar
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
