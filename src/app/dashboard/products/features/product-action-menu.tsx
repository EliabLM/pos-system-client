'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import {
  IconDotsVertical,
  IconEye,
  IconEdit,
  IconTrash,
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
import { useSoftDeleteProduct } from '@/hooks/useProducts';
import { ProductWithIncludesNumberPrice } from '@/interfaces';
import { ProductDetailDialog } from './product-detail-dialog';

interface ProductActionMenuProps {
  product: ProductWithIncludesNumberPrice;
  onEdit?: (product: ProductWithIncludesNumberPrice) => void;
}

export const ProductActionMenu: React.FC<ProductActionMenuProps> = ({
  product,
  onEdit,
}) => {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const softDeleteMutation = useSoftDeleteProduct();
  const user = useStore((state) => state.user);

  const handleViewDetail = () => {
    setDetailDialogOpen(true);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(product);
    }
  };

  const handleEditFromDialog = () => {
    setDetailDialogOpen(false);
    if (onEdit) {
      onEdit(product);
    }
  };

  const handleSoftDelete = async () => {
    if (!user) {
      toast.error('Ha ocurrido un error eliminando el producto');
      return;
    }

    Swal.fire({
      icon: 'question',
      title: 'Eliminar Producto',
      text: `¿Estás seguro de eliminar "${product.name}"?`,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      showCancelButton: true,
      showConfirmButton: true,
      showLoaderOnConfirm: true,
      confirmButtonColor: '#dc2626',
      preConfirm: async () => {
        try {
          const response = await softDeleteMutation.mutateAsync({
            productId: product.id,
          });

          if (response.status !== 200) {
            Swal.showValidationMessage(response.message);
            return false;
          }

          return response;
        } catch (error) {
          console.error('Error eliminando el producto:', error);
          const errorMessage = error instanceof Error ? error.message : 'Ha ocurrido un error eliminando el producto';
          Swal.showValidationMessage(errorMessage);
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading(),
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        toast.success('Producto eliminado exitosamente');
      }
    });
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
            <IconDotsVertical className="size-4" />
            <span className="sr-only">Abrir menú de acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleViewDetail} className="gap-2">
            <IconEye className="size-4" />
            Ver detalle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEdit} className="gap-2">
            <IconEdit className="size-4" />
            Editar producto
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={handleSoftDelete}
            className="gap-2"
          >
            <IconTrash className="size-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        productId={product.id}
        onEdit={handleEditFromDialog}
      />
    </>
  );
};
