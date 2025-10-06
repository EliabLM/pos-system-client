'use client';

import { useState } from 'react';
import { IconDotsVertical, IconEye, IconEdit, IconTrash } from '@tabler/icons-react';
import { Sale } from '@/generated/prisma';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SaleDetailDialog } from './sale-detail-dialog';

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

  const handleViewDetail = () => {
    setDetailDialogOpen(true);
  };

  const handleEdit = () => {
    // TODO: Implementar lógica de edición
    console.log('Editar venta:', item.id);
  };

  const handleDelete = () => {
    // TODO: Implementar lógica de eliminación con confirmación
    console.log('Eliminar venta:', item.id);
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
          <DropdownMenuItem onClick={handleViewDetail} className="gap-2">
            <IconEye className="size-4" aria-hidden="true" />
            <span>Ver Detalle</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEdit} className="gap-2" disabled>
            <IconEdit className="size-4" aria-hidden="true" />
            <span>Editar</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={handleDelete}
            className="gap-2"
            disabled
          >
            <IconTrash className="size-4" aria-hidden="true" />
            <span>Eliminar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de detalle de venta - ahora usa el hook real */}
      <SaleDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        saleId={item.id}
      />
    </>
  );
};
