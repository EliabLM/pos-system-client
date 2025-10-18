'use client';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

import {
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconEye,
  IconToggleLeft,
  IconToggleRight,
} from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

import { useStore } from '@/store';
import {
  useSoftDeleteSupplier,
  useToggleSupplierActiveStatus,
} from '@/hooks/useSuppliers';
import { Supplier } from '@/generated/prisma';

// Type for Supplier with includes from API
type SupplierWithIncludes = Supplier & {
  purchases?: unknown[];
  _count?: {
    purchases: number;
  };
};

export const SupplierActions = ({
  item,
  setItemSelected,
  setSheetOpen,
  setDetailSheetOpen,
  setDetailSupplier,
}: {
  item: SupplierWithIncludes;
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDetailSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<React.SetStateAction<SupplierWithIncludes | null>>;
  setDetailSupplier: React.Dispatch<React.SetStateAction<SupplierWithIncludes | null>>;
}) => {
  const softDeleteMutation = useSoftDeleteSupplier();
  const toggleActiveStatusMutation = useToggleSupplierActiveStatus();
  const user = useStore((state) => state.user);

  const handleViewDetails = () => {
    setDetailSupplier(item);
    setDetailSheetOpen(true);
  };

  const handleEdit = () => {
    setItemSelected(item);
    setSheetOpen(true);
  };

  const handleToggleActiveStatus = async () => {
    try {
      if (!user) {
        toast.error('Ha ocurrido un error al cambiar el estado del proveedor');
        return;
      }

      const action = item.isActive ? 'desactivar' : 'activar';

      Swal.fire({
        icon: 'question',
        text: `¿Estás seguro de ${action} este proveedor?`,
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        showConfirmButton: true,
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          await toggleActiveStatusMutation.mutateAsync({
            supplierId: item.id,
          });
        },
        allowOutsideClick: () => !Swal.isLoading(),
      }).then((result) => {
        if (result.isConfirmed) {
          toast.success(
            `Proveedor ${item.isActive ? 'desactivado' : 'activado'} exitosamente`
          );
        }
      });
    } catch (error) {
      console.error('Error al cambiar estado del proveedor:', error);
      toast.error('Ha ocurrido un error al cambiar el estado del proveedor');
    }
  };

  const handleSoftDelete = async () => {
    try {
      if (!user) {
        toast.error('Ha ocurrido un error eliminando el proveedor');
        return;
      }

      Swal.fire({
        icon: 'warning',
        title: '¿Eliminar proveedor?',
        text: '¿Estás seguro de eliminar este proveedor? Esta acción no se puede deshacer.',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        showConfirmButton: true,
        showLoaderOnConfirm: true,
        confirmButtonColor: '#dc2626',
        preConfirm: async () => {
          await softDeleteMutation.mutateAsync({
            supplierId: item.id,
          });
        },
        allowOutsideClick: () => !Swal.isLoading(),
      }).then((result) => {
        if (result.isConfirmed) {
          toast.success('Proveedor eliminado exitosamente');
        }
      });
    } catch (error) {
      console.error('Error al eliminar el proveedor:', error);
      toast.error('Ha ocurrido un error eliminando el proveedor');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
          size="icon"
        >
          <IconDotsVertical className="size-4" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleViewDetails}>
          <IconEye className="size-4" />
          Ver detalles
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEdit}>
          <IconEdit className="size-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleToggleActiveStatus}>
          {item.isActive ? (
            <IconToggleLeft className="size-4" />
          ) : (
            <IconToggleRight className="size-4" />
          )}
          {item.isActive ? 'Desactivar' : 'Activar'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSoftDelete}>
          <IconTrash className="size-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
