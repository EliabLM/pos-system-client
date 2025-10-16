'use client';

import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  IconDotsVertical,
  IconEye,
  IconEdit,
  IconTrash,
  IconLock,
  IconLockOpen,
} from '@tabler/icons-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

import { useStore } from '@/store';
import { useSoftDeleteUser, useToggleUserStatus } from '@/hooks/useUsers';
import { User } from '@/generated/prisma';

interface UserActionComponentProps {
  item: User;
  setItemSelected: React.Dispatch<React.SetStateAction<User | null>>;
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedUserId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const UserActionComponent = ({
  item,
  setItemSelected,
  setSheetOpen,
  setDialogOpen,
  setSelectedUserId,
}: UserActionComponentProps) => {
  const softDeleteMutation = useSoftDeleteUser();
  const toggleStatusMutation = useToggleUserStatus();
  const currentUser = useStore((state) => state.user);

  const isCurrentUser = currentUser?.id === item.id;
  const canManage = currentUser?.role === 'ADMIN';

  const handleView = () => {
    setSelectedUserId(item.id);
    setDialogOpen(true);
  };

  const handleEdit = () => {
    setItemSelected(item);
    setSheetOpen(true);
  };

  const handleToggleStatus = async () => {
    try {
      if (!currentUser) {
        toast.error('Ha ocurrido un error cambiando el estado del usuario');
        return;
      }

      const action = item.isActive ? 'desactivar' : 'activar';
      const newStatus = !item.isActive;

      const result = await Swal.fire({
        icon: 'question',
        title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} usuario?`,
        text: `¿Estás seguro de ${action} este usuario?`,
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        showConfirmButton: true,
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          await toggleStatusMutation.mutateAsync({
            userId: item.id,
            isActive: newStatus,
          });
        },
        allowOutsideClick: () => !Swal.isLoading(),
      });

      if (result.isConfirmed) {
        toast.success(
          `Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`
        );
      }
    } catch (error) {
      console.error('🚀 ~ handleToggleStatus ~ error:', error);
      toast.error('Ha ocurrido un error cambiando el estado del usuario');
    }
  };

  const handleSoftDelete = async () => {
    try {
      if (!currentUser) {
        toast.error('Ha ocurrido un error eliminando el usuario');
        return;
      }

      if (isCurrentUser) {
        toast.error('No puedes eliminar tu propia cuenta');
        return;
      }

      const result = await Swal.fire({
        icon: 'warning',
        title: 'Eliminar usuario',
        text: '¿Estás seguro de eliminar este usuario? Esta acción se puede revertir.',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        showConfirmButton: true,
        showLoaderOnConfirm: true,
        confirmButtonColor: '#dc2626',
        preConfirm: async () => {
          await softDeleteMutation.mutateAsync({
            userId: item.id,
          });
        },
        allowOutsideClick: () => !Swal.isLoading(),
      });

      if (result.isConfirmed) {
        toast.success('Usuario eliminado exitosamente');
      }
    } catch (error) {
      console.error('🚀 ~ handleSoftDelete ~ error:', error);
      toast.error('Ha ocurrido un error eliminando el usuario');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
          size="icon"
          aria-label="Abrir menú de acciones"
        >
          <IconDotsVertical className="size-4" />
          <span className="sr-only">Abrir menú de acciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Acciones
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleView} className="gap-2">
          <IconEye className="size-4" />
          Ver detalle
        </DropdownMenuItem>

        {canManage && (
          <>
            <DropdownMenuItem onClick={handleEdit} className="gap-2">
              <IconEdit className="size-4" />
              Editar
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleToggleStatus}
              disabled={isCurrentUser}
              className="gap-2"
            >
              {item.isActive ? (
                <>
                  <IconLock className="size-4" />
                  Desactivar
                </>
              ) : (
                <>
                  <IconLockOpen className="size-4" />
                  Activar
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem
              variant="destructive"
              onClick={handleSoftDelete}
              disabled={isCurrentUser}
              className="gap-2"
            >
              <IconTrash className="size-4" />
              Eliminar
            </DropdownMenuItem>
          </>
        )}

        {!canManage && (
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            Acciones limitadas
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
