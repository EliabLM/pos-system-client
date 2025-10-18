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
  useSoftDeleteCustomer,
  useToggleCustomerActiveStatus,
} from '@/hooks/useCustomers';
import { Customer } from '@/generated/prisma';

// Type for Customer with includes from API
type CustomerWithIncludes = Customer & {
  sales?: unknown[];
  _count?: {
    sales: number;
  };
};

export const CustomerActions = ({
  item,
  setItemSelected,
  setSheetOpen,
  setDetailSheetOpen,
  setDetailCustomer,
}: {
  item: CustomerWithIncludes;
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDetailSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<React.SetStateAction<CustomerWithIncludes | null>>;
  setDetailCustomer: React.Dispatch<React.SetStateAction<CustomerWithIncludes | null>>;
}) => {
  const softDeleteMutation = useSoftDeleteCustomer();
  const toggleActiveStatusMutation = useToggleCustomerActiveStatus();
  const user = useStore((state) => state.user);

  const handleViewDetails = () => {
    setDetailCustomer(item);
    setDetailSheetOpen(true);
  };

  const handleEdit = () => {
    setItemSelected(item);
    setSheetOpen(true);
  };

  const handleToggleActiveStatus = async () => {
    try {
      if (!user) {
        toast.error('Ha ocurrido un error al cambiar el estado del cliente');
        return;
      }

      const action = item.isActive ? 'desactivar' : 'activar';

      Swal.fire({
        icon: 'question',
        text: `¿Estás seguro de ${action} este cliente?`,
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        showConfirmButton: true,
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          await toggleActiveStatusMutation.mutateAsync({
            customerId: item.id,
          });
        },
        allowOutsideClick: () => !Swal.isLoading(),
      }).then((result) => {
        if (result.isConfirmed) {
          toast.success(
            `Cliente ${item.isActive ? 'desactivado' : 'activado'} exitosamente`
          );
        }
      });
    } catch (error) {
      console.error('Error al cambiar estado del cliente:', error);
      toast.error('Ha ocurrido un error al cambiar el estado del cliente');
    }
  };

  const handleSoftDelete = async () => {
    try {
      if (!user) {
        toast.error('Ha ocurrido un error eliminando el cliente');
        return;
      }

      Swal.fire({
        icon: 'warning',
        title: '¿Eliminar cliente?',
        text: '¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        showConfirmButton: true,
        showLoaderOnConfirm: true,
        confirmButtonColor: '#dc2626',
        preConfirm: async () => {
          await softDeleteMutation.mutateAsync({
            customerId: item.id,
          });
        },
        allowOutsideClick: () => !Swal.isLoading(),
      }).then((result) => {
        if (result.isConfirmed) {
          toast.success('Cliente eliminado exitosamente');
        }
      });
    } catch (error) {
      console.error('Error al eliminar el cliente:', error);
      toast.error('Ha ocurrido un error eliminando el cliente');
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
