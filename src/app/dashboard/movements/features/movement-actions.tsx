'use client';

import { useState } from 'react';
import { IconDotsVertical, IconEye, IconReceipt } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { StockMovementWithRelations } from './columns';
import { MovementDetailDialog } from './movement-detail-dialog';

interface MovementActionsProps {
  movement: StockMovementWithRelations;
}

export function MovementActions({ movement }: MovementActionsProps) {
  const router = useRouter();
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const handleViewDetails = () => {
    setDetailDialogOpen(true);
  };

  const handleViewSale = () => {
    if (movement.sale?.id) {
      router.push(`/dashboard/sales?saleId=${movement.sale.id}`);
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
            aria-label="Abrir menú de acciones"
          >
            <IconDotsVertical className="size-4" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={handleViewDetails}>
            <IconEye className="size-4 mr-2" />
            Ver Detalles
          </DropdownMenuItem>
          {movement.sale && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleViewSale}>
                <IconReceipt className="size-4 mr-2" />
                Ver Venta
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Movement Detail Dialog */}
      <MovementDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        movementId={movement.id}
      />
    </>
  );
}
