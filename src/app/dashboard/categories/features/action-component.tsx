'use client';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

import { IconDotsVertical } from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

import { useStore } from '@/store';
import { useSoftDeleteCategory } from '@/hooks/useCategories';
import { Category } from '@/generated/prisma';

export const ActionComponent = ({
  item,
  setItemSelected,
  setSheetOpen,
}: {
  item: Category;
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<React.SetStateAction<Category | null>>;
}) => {
  const softDeleteMutation = useSoftDeleteCategory();
  const user = useStore((state) => state.user);

  const handleEdit = () => {
    setItemSelected(item);
    setSheetOpen(true);
  };

  const handleSoftDelete = async () => {
    try {
      if (!user) {
        toast.error('Ha ocurrido un error eliminando la categoría');
        return;
      }

      Swal.fire({
        icon: 'question',
        text: '¿Estas seguro de eliminar esta categoría?',
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        showConfirmButton: true,
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            const response = await softDeleteMutation.mutateAsync({
              categoryId: item.id,
            });

            if (response.status !== 200) {
              Swal.showValidationMessage(response.message);
              return false;
            }

            return response;
          } catch (error) {
            console.error('🚀 ~ handleSoftDelete ~ error:', error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Ha ocurrido un error eliminando la categoría';
            Swal.showValidationMessage(errorMessage);
            return false;
          }
        },
        allowOutsideClick: () => !Swal.isLoading(),
      }).then((result) => {
        if (result.isConfirmed) {
          toast.success('Categoría eliminada exitosamente');
        }
      });
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);
      toast.error('Ha ocurrido un error eliminando la categoría');
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
          <IconDotsVertical />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onClick={handleEdit}>Editar</DropdownMenuItem>
        <DropdownMenuItem>Copiar ID</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSoftDelete}>
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
