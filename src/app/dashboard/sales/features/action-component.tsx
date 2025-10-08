'use client';

import { useState } from 'react';
import {
  IconDotsVertical,
  IconEye,
  IconEdit,
  IconBan,
} from '@tabler/icons-react';
import { Sale } from '@/generated/prisma';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { useCancelSale } from '@/hooks/useSales';
import { useStore } from '@/store';
import { canEditSaleStatus, canCancelSale } from '@/lib/rbac';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SaleDetailDialog } from './sale-detail-dialog';
import { EditSaleStatusDialog } from './edit-sale-status-dialog';

// Tipo extendido para la venta con relaciones (debe coincidir con el tipo de la tabla)
type SaleWithRelations = Sale & {
  user?: {
    id: string;
    username?: string | null;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  store?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  saleItems?: unknown[];
  salePayments?: unknown[];
  _count?: {
    saleItems: number;
    salePayments: number;
  };
};

interface SaleActionComponentProps {
  item: SaleWithRelations;
}

export const SaleActionComponent = ({ item }: SaleActionComponentProps) => {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const cancelSaleMutation = useCancelSale();

  // Get user role from store
  const user = useStore((state) => state.user);
  const userRole = user?.role || '';

  // Check permissions based on role
  const hasEditPermission = canEditSaleStatus(userRole);
  const hasCancelPermission = canCancelSale(userRole);

  const handleViewDetail = () => {
    setDetailDialogOpen(true);
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleCancelSale = async () => {
    try {
      const result = await Swal.fire({
        icon: 'warning',
        title: '¿Cancelar venta?',
        text: '¿Estás seguro de que deseas cancelar esta venta?',
        input: 'textarea',
        inputLabel: 'Razón de cancelación (opcional)',
        inputPlaceholder: 'Ingresa la razón de la cancelación...',
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'No, mantener',
        showCancelButton: true,
        showConfirmButton: true,
        showLoaderOnConfirm: true,
        confirmButtonColor: '#dc2626',
        preConfirm: async (reason: string) => {
          await cancelSaleMutation.mutateAsync({
            saleId: item.id,
            reason: reason || undefined,
          });
        },
        allowOutsideClick: () => !Swal.isLoading(),
      });

      if (result.isConfirmed) {
        toast.success('Venta cancelada exitosamente');
      }
    } catch (error) {
      console.error('Error cancelando la venta:', error);
      toast.error('Ha ocurrido un error al cancelar la venta');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
            aria-label="Abrir menú de acciones"
          >
            <IconDotsVertical className="size-4" aria-hidden="true" />
            <span className="sr-only">Abrir menú de acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {/* View Detail - Always visible for all roles */}
          <DropdownMenuItem onClick={handleViewDetail} className="gap-2">
            <IconEye className="size-4" aria-hidden="true" />
            <span>Ver Detalle</span>
          </DropdownMenuItem>

          {/* Edit - Only for ADMIN role */}
          {hasEditPermission && (
            <DropdownMenuItem
              onClick={handleEdit}
              className="gap-2"
              disabled={item.status === 'CANCELLED'}
            >
              <IconEdit className="size-4" aria-hidden="true" />
              <span>Editar</span>
            </DropdownMenuItem>
          )}

          {/* Separator - Only show if there are mutation actions */}
          {(hasEditPermission || hasCancelPermission) && <DropdownMenuSeparator />}

          {/* Cancel Sale - Only for ADMIN role */}
          {hasCancelPermission && (
            <DropdownMenuItem
              variant="destructive"
              onClick={handleCancelSale}
              className="gap-2"
              disabled={item.status === 'CANCELLED'}
            >
              <IconBan className="size-4" aria-hidden="true" />
              <span>Cancelar Venta</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de detalle de venta - ahora usa el hook real */}
      <SaleDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        saleId={item.id}
      />

      {/* Dialog de edición de estado de venta - Only render for ADMIN */}
      {hasEditPermission && (
        <EditSaleStatusDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          saleId={item.id}
        />
      )}
    </>
  );
};
