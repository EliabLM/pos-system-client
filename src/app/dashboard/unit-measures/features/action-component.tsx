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
import { useSoftDeleteUnitMeasure } from '@/hooks/useUnitMeasures';
import { UnitMeasure } from '@/generated/prisma';

export const ActionComponent = ({
  item,
  setItemSelected,
  setSheetOpen,
}: {
  item: UnitMeasure;
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<React.SetStateAction<UnitMeasure | null>>;
}) => {
  const softDeleteMutation = useSoftDeleteUnitMeasure();
  const user = useStore((state) => state.user);

  const handleEdit = () => {
    setItemSelected(item);
    setSheetOpen(true);
  };

  const handleSoftDelete = async () => {
    try {
      if (!user) {
        toast.error('Ha ocurrido un error eliminando la unidad de medida');
        return;
      }

      Swal.fire({
        icon: 'question',
        text: '¿Estás seguro de eliminar esta unidad de medida?',
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar',
        showCancelButton: true,
        showConfirmButton: true,
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          await softDeleteMutation.mutateAsync({
            unitMeasureId: item.id,
          });
        },
        allowOutsideClick: () => !Swal.isLoading(),
      }).then((result) => {
        if (result.isConfirmed) {
          toast.success('Unidad de medida eliminada exitosamente');
        }
      });
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);
      toast.error('Ha ocurrido un error eliminando la unidad de medida');
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
        <DropdownMenuItem>Copiar ID</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant='destructive' onClick={handleSoftDelete}>
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
