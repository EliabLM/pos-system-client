'use client';

import {
  IconTruck,
  IconUser,
  IconMail,
  IconPhone,
  IconMapPin,
  IconFileText,
  IconCalendar,
  IconCircleCheckFilled,
  IconAlertCircleFilled,
  IconShoppingBag,
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
import { Supplier } from '@/generated/prisma';
import {
  useSupplierStatistics,
  useSupplierPurchaseHistory,
} from '@/hooks/useSuppliers';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Type for Supplier with includes from API
type SupplierWithIncludes = Supplier & {
  purchases?: unknown[];
  _count?: {
    purchases: number;
  };
};

interface SupplierDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierWithIncludes | null;
}

export default function SupplierDetailSheet({
  open,
  onOpenChange,
  supplier,
}: SupplierDetailSheetProps) {
  // Fetch supplier statistics and purchase history
  const {
    data: statistics,
    isLoading: statsLoading,
    error: statsError,
  } = useSupplierStatistics(supplier?.id ?? '');

  const {
    data: purchaseHistoryResponse,
    isLoading: historyLoading,
  } = useSupplierPurchaseHistory(supplier?.id ?? '', { page: 1, limit: 5 });

  // Extract purchases array from response
  const purchaseHistory = purchaseHistoryResponse?.purchases ?? [];

  // Loading state
  if (!supplier && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconTruck className="size-5" />
              Detalle del Proveedor
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

  // No supplier found
  if (!supplier) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconTruck className="size-5" />
              Detalle del Proveedor
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 gap-4 px-4">
            <p className="text-muted-foreground text-center">
              No se encontró el proveedor
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
                <IconTruck
                  className="size-5 sm:size-6 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">{supplier.name}</span>
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base flex items-center gap-2">
                <span className="truncate">
                  {supplier.contactName || 'Sin contacto registrado'}
                </span>
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={`gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 shrink-0 text-xs sm:text-sm ${
                supplier.isActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
              }`}
            >
              {supplier.isActive ? (
                <IconCircleCheckFilled className="size-3 sm:size-4 fill-green-500 dark:fill-green-400" />
              ) : (
                <IconAlertCircleFilled className="size-3 sm:size-4 fill-red-500 dark:fill-red-400" />
              )}
              <span className="font-medium">
                {supplier.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </Badge>
          </div>
        </DialogHeader>

        <Separator className="shrink-0" />

        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            {/* Supplier Information */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconTruck
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Información del Proveedor
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconTruck className="size-4" aria-hidden="true" />
                    <span>Nombre</span>
                  </div>
                  <p className="font-medium">{supplier.name}</p>
                </div>
                {supplier.contactName && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconUser className="size-4" aria-hidden="true" />
                      <span>Contacto</span>
                    </div>
                    <p className="font-medium">{supplier.contactName}</p>
                  </div>
                )}
                {supplier.email && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconMail className="size-4" aria-hidden="true" />
                      <span>Email</span>
                    </div>
                    <p className="font-medium break-all">{supplier.email}</p>
                  </div>
                )}
                {supplier.phone && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconPhone className="size-4" aria-hidden="true" />
                      <span>Teléfono</span>
                    </div>
                    <p className="font-medium">{supplier.phone}</p>
                  </div>
                )}
                {supplier.taxId && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconFileText className="size-4" aria-hidden="true" />
                      <span>NIT / Tax ID</span>
                    </div>
                    <p className="font-medium">{supplier.taxId}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Location Information */}
            {(supplier.address || supplier.city || supplier.department) && (
              <section className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <IconMapPin
                    className="size-4 sm:size-5 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                  Ubicación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                  {supplier.address && (
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <IconMapPin className="size-4" aria-hidden="true" />
                        <span>Dirección</span>
                      </div>
                      <p className="font-medium">{supplier.address}</p>
                    </div>
                  )}
                  {supplier.city && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Ciudad</p>
                      <p className="font-medium">{supplier.city}</p>
                    </div>
                  )}
                  {supplier.department && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Departamento
                      </p>
                      <p className="font-medium">{supplier.department}</p>
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
                        <IconShoppingBag className="size-5 text-primary" />
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
                <IconShoppingBag
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
                  {(purchaseHistory as Record<string, unknown>[]).slice(0, 5).map((purchase) => (
                    <div
                      key={purchase.id as string}
                      className="p-3 sm:p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">
                            Compra #{String(purchase.purchaseNumber ?? '')}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(purchase.purchaseDate as string), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm sm:text-base">
                            ${Number(purchase.total ?? 0).toLocaleString()}
                          </p>
                          <Badge
                            variant={
                              purchase.status === 'RECEIVED' ? 'default' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {purchase.status === 'RECEIVED'
                              ? 'Recibido'
                              : purchase.status === 'PENDING'
                                ? 'Pendiente'
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
                    {new Date(supplier.createdAt).toLocaleDateString('es-ES', {
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
                    {formatDistanceToNow(new Date(supplier.updatedAt), {
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
