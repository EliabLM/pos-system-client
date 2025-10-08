'use client';

import { useState, useEffect } from 'react';
import {
  IconEdit,
  IconCircleCheckFilled,
  IconClock,
  IconAlertCircleFilled,
  IconX,
} from '@tabler/icons-react';
import { SaleStatus } from '@/generated/prisma';
import { NumericFormat } from 'react-number-format';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useCancelSale, useSaleById, useUpdateSale } from '@/hooks/useSales';

interface EditSaleStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  onSuccess?: () => void;
}

// Helper function to get status badge info
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PAID':
      return {
        icon: (
          <IconCircleCheckFilled className="size-4 fill-green-500 dark:fill-green-400" />
        ),
        label: 'Pagada',
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
        label: 'Vencida',
        className:
          'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      };
    case 'CANCELLED':
      return {
        icon: <IconX className="size-4 text-red-600 dark:text-red-500" />,
        label: 'Cancelada',
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

// Helper function to get detailed status info
const getStatusInfo = (status: SaleStatus) => {
  switch (status) {
    case 'PAID':
      return {
        icon: IconCircleCheckFilled,
        label: 'Pagada',
        description: 'La venta ha sido completamente pagada',
        borderColor: 'border-green-600',
        hoverBg: 'hover:bg-green-50',
        selectedBg: 'bg-green-50',
      };
    case 'PENDING':
      return {
        icon: IconClock,
        label: 'Pendiente',
        description: 'La venta está pendiente de pago',
        borderColor: 'border-yellow-600',
        hoverBg: 'hover:bg-yellow-50',
        selectedBg: 'bg-yellow-50',
      };
    case 'OVERDUE':
      return {
        icon: IconAlertCircleFilled,
        label: 'Vencida',
        description: 'La fecha de pago ha vencido',
        borderColor: 'border-orange-600',
        hoverBg: 'hover:bg-orange-50',
        selectedBg: 'bg-orange-50',
      };
    case 'CANCELLED':
      return {
        icon: IconX,
        label: 'Cancelada',
        description: 'La venta ha sido cancelada',
        borderColor: 'border-red-600',
        hoverBg: 'hover:bg-red-50',
        selectedBg: 'bg-red-50',
      };
  }
};

export function EditSaleStatusDialog({
  open,
  onOpenChange,
  saleId,
  onSuccess,
}: EditSaleStatusDialogProps) {
  const { data: sale, isLoading, error } = useSaleById(open ? saleId : null);
  const updateSaleMutation = useUpdateSale();
  const cancelSaleMutation = useCancelSale();

  const [selectedStatus, setSelectedStatus] = useState<SaleStatus | null>(null);

  // Reset selected status when dialog opens
  useEffect(() => {
    if (open && sale) {
      setSelectedStatus(sale.status);
    }
  }, [open, sale]);

  // Loading state
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconEdit className="size-5" />
              Editar Estado de Venta
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconEdit className="size-5" />
              Editar Estado de Venta
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <IconAlertCircleFilled className="size-12 text-destructive" />
            <p className="text-muted-foreground text-center">
              Error al cargar la venta: {error.message}
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconEdit className="size-5" />
              Editar Estado de Venta
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <p className="text-muted-foreground">No se encontró la venta</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const statusBadge = getStatusBadge(sale.status);
  const hasChanges = selectedStatus !== sale.status;

  const statusOptions: SaleStatus[] = ['PAID', 'PENDING', 'CANCELLED'];

  const handleSubmit = async () => {
    if (!selectedStatus || !hasChanges) return;

    try {
      if (selectedStatus === 'CANCELLED') {
        await cancelSaleMutation.mutateAsync({
          saleId: saleId,
          reason: `Venta cancelada ${saleId}`,
        });
      } else {
        await updateSaleMutation.mutateAsync({
          saleId: sale.id,
          updateData: {
            status: selectedStatus,
          },
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating sale status:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconEdit className="size-5" aria-hidden="true" />
            Editar Estado de Venta
          </DialogTitle>
          <DialogDescription>
            Venta: <span className="font-semibold">{sale.saleNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* Sale Info */}
        <div className="space-y-4">
          {/* Current Status */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Estado Actual</p>
              <Badge className={`${statusBadge.className} gap-1.5`}>
                {statusBadge.icon}
                <span className="font-medium">{statusBadge.label}</span>
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="text-sm font-medium">
                {new Date(sale.saleDate).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-sm font-semibold">
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

          {/* Status Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Nuevo Estado</Label>
            <div
              className="space-y-2"
              role="radiogroup"
              aria-label="Seleccionar estado de venta"
            >
              {statusOptions.map((status) => {
                const info = getStatusInfo(status);
                const StatusIcon = info.icon;
                const isSelected = selectedStatus === status;

                return (
                  <button
                    key={status}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedStatus(status)}
                    className={`
                      w-full p-4 rounded-lg border-2 transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                      ${
                        isSelected
                          ? `${info.borderColor} ${info.selectedBg}`
                          : `border-gray-200 ${info.hoverBg}`
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`
                        flex items-center justify-center size-10 rounded-full
                        ${isSelected ? 'bg-white shadow-sm' : 'bg-muted'}
                      `}
                      >
                        <StatusIcon
                          className={`size-5 ${
                            status === 'PAID'
                              ? 'text-green-600'
                              : status === 'PENDING'
                              ? 'text-yellow-600'
                              : status === 'OVERDUE'
                              ? 'text-orange-600'
                              : 'text-red-600'
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm">{info.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {info.description}
                        </p>
                      </div>
                      {isSelected && (
                        <IconCircleCheckFilled
                          className="size-5 text-primary"
                          aria-label="Seleccionado"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <Separator />
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={
              updateSaleMutation.isPending || cancelSaleMutation.isPending
            }
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !hasChanges ||
              updateSaleMutation.isPending ||
              cancelSaleMutation.isPending
            }
          >
            {updateSaleMutation.isPending || cancelSaleMutation.isPending
              ? 'Guardando...'
              : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
