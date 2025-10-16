'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  IconPackage,
  IconAlertCircleFilled,
  IconFileText,
  IconCalendar,
  IconUserCircle,
  IconBuildingStore,
  IconReceipt,
  IconArrowsExchange,
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
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useStockMovementById } from '@/hooks/useStockMovement';
import { MovementTypeBadge } from './movement-type-badge';
import { StockChangeIndicator } from './stock-change-indicator';

interface MovementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movementId: string | null;
}

export function MovementDetailDialog({
  open,
  onOpenChange,
  movementId,
}: MovementDetailDialogProps) {
  const {
    data: movement,
    isLoading,
    error,
  } = useStockMovementById(movementId || '');

  // Loading state
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPackage className="size-5" />
              Detalle de Movimiento
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

  // Error state
  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPackage className="size-5" />
              Detalle de Movimiento
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 gap-4 px-4">
            <IconAlertCircleFilled className="size-12 text-destructive" />
            <p className="text-muted-foreground text-center text-sm sm:text-base">
              Error al cargar el movimiento: {error.message}
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

  // No movement found
  if (!movement) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPackage className="size-5" />
              Detalle de Movimiento
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 gap-4 px-4">
            <p className="text-muted-foreground text-center">
              No se encontró el movimiento
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

  const formattedDate = format(
    new Date(movement.createdAt),
    "d 'de' MMMM, yyyy 'a las' HH:mm",
    { locale: es }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-3 sm:p-6 pb-3 sm:pb-4 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-2xl">
                <IconPackage
                  className="size-5 sm:size-6 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">Movimiento de Inventario</span>
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Registro de auditoría del movimiento de stock
              </DialogDescription>
            </div>
            <MovementTypeBadge type={movement.type} showIcon={true} />
          </div>
        </DialogHeader>

        <Separator className="shrink-0" />

        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            {/* Información del Producto */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconPackage
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Producto
              </h3>
              <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-3 sm:gap-4">
                  {movement.product?.image && (
                    <img
                      src={movement.product.image}
                      alt={movement.product.name}
                      className="size-16 sm:size-20 rounded-md object-cover shrink-0"
                    />
                  )}
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <div>
                      <h4 className="font-semibold text-base sm:text-lg">
                        {movement.product?.name || 'Sin nombre'}
                      </h4>
                      {movement.product?.sku && (
                        <p className="text-sm text-muted-foreground">
                          SKU: {movement.product.sku}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Cambio de Stock */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconArrowsExchange
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Cambio de Stock
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Stock Anterior</p>
                  <p className="text-2xl font-bold font-mono">
                    {movement.previousStock}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Cantidad Movida</p>
                  <p
                    className={`text-2xl font-bold font-mono ${
                      movement.type === 'IN'
                        ? 'text-green-600 dark:text-green-400'
                        : movement.type === 'OUT'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-orange-600 dark:text-orange-400'
                    }`}
                  >
                    {movement.type === 'IN' && '+'}
                    {movement.type === 'OUT' && '-'}
                    {movement.quantity}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Stock Nuevo</p>
                  <p className="text-2xl font-bold font-mono">
                    {movement.newStock}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center p-2 bg-primary/5 rounded-lg">
                <StockChangeIndicator
                  previousStock={movement.previousStock}
                  newStock={movement.newStock}
                  showArrow={true}
                />
              </div>
            </section>

            {/* Detalles del Movimiento */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconFileText
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Detalles del Movimiento
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconCalendar className="size-4" aria-hidden="true" />
                    <span>Fecha y Hora</span>
                  </div>
                  <p className="font-medium">{formattedDate}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconUserCircle className="size-4" aria-hidden="true" />
                    <span>Realizado por</span>
                  </div>
                  <p className="font-medium">
                    {movement.user
                      ? `${movement.user.firstName} ${movement.user.lastName}`
                      : 'Sistema'}
                  </p>
                </div>
                {movement.store && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconBuildingStore className="size-4" aria-hidden="true" />
                      <span>Tienda</span>
                    </div>
                    <p className="font-medium">{movement.store.name}</p>
                  </div>
                )}
                {movement.reference && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconReceipt className="size-4" aria-hidden="true" />
                      <span>Referencia</span>
                    </div>
                    <p className="font-medium">{movement.reference}</p>
                  </div>
                )}
                {movement.sale && (
                  <div className="space-y-1 md:col-span-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconReceipt className="size-4" aria-hidden="true" />
                      <span>Venta Relacionada</span>
                    </div>
                    <p className="font-medium">{movement.sale.saleNumber}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Razón */}
            {movement.reason && (
              <section className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <IconFileText
                    className="size-4 sm:size-5 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                  Razón del Movimiento
                </h3>
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">
                    {movement.reason}
                  </p>
                </div>
              </section>
            )}
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
