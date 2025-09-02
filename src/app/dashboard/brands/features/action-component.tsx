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
import { useSoftDeleteBrand } from '@/hooks/useBrands';
import { Brand } from '@/generated/prisma';

export const BrandActionComponent = ({
  item,
  setItemSelected,
  setSheetOpen,
}: {
  item: Brand;
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<React.SetStateAction<Brand | null>>;
}) => {
  const softDeleteMutation = useSoftDeleteBrand();
  const user = useStore((state) => state.user);

  const handleEdit = () => {
    setItemSelected(item);
    setSheetOpen(true);
  };

  const handleSoftDelete = async () => {
    try {
      if (!user) {
        toast.error('Ha ocurrido un error eliminando la marca');
        return;
      }

      Swal.fire({
        icon: 'question',
        text: '¿Estas seguro de eliminar esta marca?',
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        showConfirmButton: true,
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          await softDeleteMutation.mutateAsync({
            brandId: item.id,
          });
        },
        allowOutsideClick: () => !Swal.isLoading(),
      }).then((result) => {
        if (result.isConfirmed) {
          toast.success('Marca eliminada exitosamente');
        }
      });
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);
      toast.error('Ha ocurrido un error eliminando la marca');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='data-[state=open]:bg-muted text-muted-foreground flex size-8'
          size='icon'
        >
          <IconDotsVertical />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-32'>
        <DropdownMenuItem onClick={handleEdit}>Editar</DropdownMenuItem>
        {/* <DropdownMenuItem>Copiar ID</DropdownMenuItem> */}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant='destructive' onClick={handleSoftDelete}>
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
