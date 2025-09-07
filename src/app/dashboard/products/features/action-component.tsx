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
import { useSoftDeleteProduct } from '@/hooks/useProducts';
import { Product } from '@/generated/prisma';

export const ProductActionComponent = ({
  item,
  setItemSelected,
  setSheetOpen,
}: {
  item: Product;
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<React.SetStateAction<Product | null>>;
}) => {
  const softDeleteMutation = useSoftDeleteProduct();
  const user = useStore((state) => state.user);

  const handleEdit = () => {
    setItemSelected(item);
    setSheetOpen(true);
  };

  const handleSoftDelete = async () => {
    try {
      if (!user) {
        toast.error('Ha ocurrido un error eliminando el producto');
        return;
      }

      Swal.fire({
        icon: 'question',
        text: '¿Estas seguro de eliminar este producto?',
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        showConfirmButton: true,
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          await softDeleteMutation.mutateAsync({
            productId: item.id,
          });
        },
        allowOutsideClick: () => !Swal.isLoading(),
      }).then((result) => {
        if (result.isConfirmed) {
          toast.success('Producto eliminada exitosamente');
        }
      });
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);
      toast.error('Ha ocurrido un error eliminando el producto');
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
        {/* <DropdownMenuItem>Copiar ID</DropdownMenuItem> */}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSoftDelete}>
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
