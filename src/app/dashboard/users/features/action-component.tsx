'use client';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { IconDotsVertical, IconEye } from '@tabler/icons-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useStore } from '@/store';
import { useSoftDeleteUser } from '@/hooks/useUsers';
import { User } from '@/generated/prisma';
import { useState } from 'react';

export const UserActionComponent = ({
  item,
  setItemSelected,
  setSheetOpen,
}: {
  item: User;
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<React.SetStateAction<User | null>>;
}) => {
  const softDeleteMutation = useSoftDeleteUser();
  const user = useStore((state) => state.user);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEdit = () => {
    setItemSelected(item);
    setSheetOpen(true);
  };

  const handleView = () => {
    setDialogOpen(true);
  };

  const handleSoftDelete = async () => {
    try {
      if (!user) {
        toast.error('Ha ocurrido un error eliminando el usuario');
        return;
      }

      Swal.fire({
        icon: 'question',
        text: '¿Estas seguro de eliminar este usuario?',
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        showConfirmButton: true,
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          await softDeleteMutation.mutateAsync({
            userId: item.id,
          });
        },
        allowOutsideClick: () => !Swal.isLoading(),
      }).then((result) => {
        if (result.isConfirmed) {
          toast.success('Usuario eliminado exitosamente');
        }
      });
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);
      toast.error('Ha ocurrido un error eliminando el usuario');
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
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem onClick={handleView}>
            <IconEye className="mr-2" />
            Ver detalle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEdit}>Editar</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleSoftDelete}>
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del Usuario</DialogTitle>
            <DialogDescription>
              Información completa del usuario seleccionado
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-semibold">Nombre:</span>
              <span className="col-span-3">
                {item.firstName} {item.lastName}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-semibold">Usuario:</span>
              <span className="col-span-3">{item.username}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-semibold">Email:</span>
              <span className="col-span-3">{item.email}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-semibold">Rol:</span>
              <span className="col-span-3">
                {item.role === 'ADMIN' ? 'Administrador' : 'Vendedor'}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-semibold">Creado:</span>
              <span className="col-span-3">
                {item.createdAt.toLocaleDateString()} {item.createdAt.toLocaleTimeString()}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-semibold">Estado:</span>
              <span className="col-span-3">
                {item.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="font-semibold">Email verificado:</span>
              <span className="col-span-3">
                {item.emailVerified ? 'Sí' : 'No'}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
