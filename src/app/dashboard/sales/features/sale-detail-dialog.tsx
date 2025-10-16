'use client';

import { NumericFormat } from 'react-number-format';
import {
  IconReceipt,
  IconShoppingCart,
  IconCreditCard,
  IconUser,
  IconCircleCheckFilled,
  IconClock,
  IconAlertCircleFilled,
  IconX,
  IconBuildingStore,
  IconUserCircle,
  IconCalendar,
  IconFileText,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useSaleById } from '@/hooks/useSales';

interface SaleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PAID':
      return {
        icon: (
          <IconCircleCheckFilled className="size-4 fill-green-500 dark:fill-green-400" />
        ),
        label: 'Pagado',
        className:
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      };
    case 'PENDING':
      return {
        icon: (
          <IconClock className="size-4 text-yellow-600 dark:text-yellow-500" />
        ),
        label: 'Pendiente',
        className:
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      };
    case 'OVERDUE':
      return {
        icon: (
          <IconAlertCircleFilled className="size-4 text-orange-600 dark:text-orange-500" />
        ),
        label: 'Vencido',
        className:
          'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      };
    case 'CANCELLED':
      return {
        icon: <IconX className="size-4 text-red-600 dark:text-red-500" />,
        label: 'Cancelado',
        className:
          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      };
    default:
      return {
        icon: null,
        label: status,
        className:
          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      };
  }
};

export function SaleDetailDialog({
  open,
  onOpenChange,
  saleId,
}: SaleDetailDialogProps) {
  // Usar el hook real para traer los datos
  const { data: sale, isLoading, error } = useSaleById(open ? saleId : null);

  // Loading state
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconReceipt className="size-5" />
              Detalle de Venta
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
        <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconReceipt className="size-5" />
              Detalle de Venta
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 gap-4 px-4">
            <IconAlertCircleFilled className="size-12 text-destructive" />
            <p className="text-muted-foreground text-center text-sm sm:text-base break-words">
              Error al cargar la venta: {error.message}
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

  // No sale found
  if (!sale) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconReceipt className="size-5" />
              Detalle de Venta
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 gap-4 px-4">
            <p className="text-muted-foreground text-center">
              No se encontró la venta
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

  const statusBadge = getStatusBadge(sale.status);
  const totalItems = sale.saleItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const totalPayments = sale.salePayments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-3 sm:p-6 pb-3 sm:pb-4 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-2xl">
                <IconReceipt
                  className="size-5 sm:size-6 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">{sale.saleNumber}</span>
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base line-clamp-2">
                Detalles completos de la transacción de venta
              </DialogDescription>
            </div>
            <Badge
              className={`${statusBadge.className} gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 shrink-0 text-xs sm:text-sm`}
            >
              {statusBadge.icon}
              <span className="font-medium">{statusBadge.label}</span>
            </Badge>
          </div>
        </DialogHeader>

        <Separator className="shrink-0" />

        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            {/* Información General */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconFileText
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Información General
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconBuildingStore className="size-4" aria-hidden="true" />
                    <span>Tienda</span>
                  </div>
                  <p className="font-medium">
                    {sale.store?.name || 'Sin tienda'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconUserCircle className="size-4" aria-hidden="true" />
                    <span>Vendedor</span>
                  </div>
                  <p className="font-medium">
                    {sale.user
                      ? `${sale.user.firstName} ${sale.user.lastName}`
                      : 'Sin vendedor'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconCalendar className="size-4" aria-hidden="true" />
                    <span>Fecha de Venta</span>
                  </div>
                  <p className="font-medium">
                    {new Date(sale.saleDate).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {sale.dueDate && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconClock className="size-4" aria-hidden="true" />
                      <span>Fecha de Vencimiento</span>
                    </div>
                    <p className="font-medium">
                      {new Date(sale.dueDate).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Cliente */}
            {sale.customer && (
              <section className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <IconUser
                    className="size-4 sm:size-5 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                  Información del Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Nombre Completo
                    </p>
                    <p className="font-medium">
                      {sale.customer.firstName} {sale.customer.lastName}
                    </p>
                  </div>
                  {sale.customer.email && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{sale.customer.email}</p>
                    </div>
                  )}
                  {sale.customer.phone && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Teléfono</p>
                      <p className="font-medium">{sale.customer.phone}</p>
                    </div>
                  )}
                  {sale.customer.document && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {sale.customer.documentType || 'Documento'}
                      </p>
                      <p className="font-medium">{sale.customer.document}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Productos Vendidos */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconShoppingCart
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Productos Vendidos
              </h3>

              {/* Mobile: Card Layout */}
              <div className="flex flex-col gap-3 sm:hidden">
                {sale.saleItems.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-3 space-y-3 bg-card"
                  >
                    <div className="flex items-start gap-3">
                      {item.product.image && (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="size-12 rounded-md object-cover shrink-0"
                        />
                      )}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium text-sm">
                          {item.product.name}
                        </span>
                        {item.product.description && (
                          <span className="text-xs text-muted-foreground line-clamp-2">
                            {item.product.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">
                          Cantidad
                        </p>
                        <p className="font-medium">{item.quantity}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">
                          P. Unit.
                        </p>
                        <p className="font-medium">
                          <NumericFormat
                            value={item.unitPrice}
                            prefix="$"
                            thousandSeparator="."
                            decimalSeparator=","
                            displayType="text"
                          />
                        </p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p className="text-xs text-muted-foreground">
                          Subtotal
                        </p>
                        <p className="font-semibold">
                          <NumericFormat
                            value={item.subtotal}
                            prefix="$"
                            thousandSeparator="."
                            decimalSeparator=","
                            displayType="text"
                          />
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table Layout */}
              <div className="hidden sm:block border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="min-w-[200px]">Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.saleItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.product.image && (
                              <img
                                src={item.product.image}
                                alt={item.product.name}
                                className="size-10 rounded-md object-cover"
                              />
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium">
                                {item.product.name}
                              </span>
                              {item.product.description && (
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                  {item.product.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <NumericFormat
                            value={item.unitPrice}
                            prefix="$"
                            thousandSeparator="."
                            decimalSeparator=","
                            displayType="text"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <NumericFormat
                            value={item.subtotal}
                            prefix="$"
                            thousandSeparator="."
                            decimalSeparator=","
                            displayType="text"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center px-3 sm:px-4 py-2 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm sm:text-base">
                  Total de Items:
                </p>
                <p className="font-semibold text-base sm:text-lg">
                  {totalItems}
                </p>
              </div>
            </section>

            {/* Métodos de Pago */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconCreditCard
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Métodos de Pago
              </h3>

              {/* Mobile: Card Layout */}
              <div className="flex flex-col gap-3 sm:hidden">
                {sale.salePayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="border rounded-lg p-3 bg-card space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Método</p>
                        <p className="font-medium text-sm">
                          {payment.paymentMethod.name}
                        </p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p className="text-xs text-muted-foreground">Monto</p>
                        <p className="font-semibold text-sm">
                          <NumericFormat
                            value={payment.amount}
                            prefix="$"
                            thousandSeparator="."
                            decimalSeparator=","
                            displayType="text"
                          />
                        </p>
                      </div>
                    </div>
                    {payment.reference && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">
                          Referencia
                        </p>
                        <p className="text-sm">{payment.reference}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop: Table Layout */}
              <div className="hidden sm:block border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Método de Pago</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.salePayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.paymentMethod.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.reference || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <NumericFormat
                            value={payment.amount}
                            prefix="$"
                            thousandSeparator="."
                            decimalSeparator=","
                            displayType="text"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center px-3 sm:px-4 py-2 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm sm:text-base">
                  Total Pagado:
                </p>
                <p className="font-semibold text-base sm:text-lg">
                  <NumericFormat
                    value={totalPayments}
                    prefix="$"
                    thousandSeparator="."
                    decimalSeparator=","
                    displayType="text"
                  />
                </p>
              </div>
            </section>

            {/* Totales Finales */}
            <section className="space-y-2 sm:space-y-3">
              <Separator />
              <div className="flex flex-col gap-2 p-3 sm:p-4 bg-primary/5 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Subtotal:
                  </p>
                  <p className="font-medium text-sm sm:text-base">
                    <NumericFormat
                      value={sale.subtotal}
                      prefix="$"
                      thousandSeparator="."
                      decimalSeparator=","
                      displayType="text"
                    />
                  </p>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <p className="text-base sm:text-lg font-semibold">
                    Total de la Venta:
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-primary">
                    <NumericFormat
                      value={sale.total}
                      prefix="$"
                      thousandSeparator="."
                      decimalSeparator=","
                      displayType="text"
                    />
                  </p>
                </div>
              </div>
            </section>

            {/* Notas */}
            {sale.notes && (
              <section className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <IconFileText
                    className="size-4 sm:size-5 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                  Notas
                </h3>
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">
                    {sale.notes}
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
