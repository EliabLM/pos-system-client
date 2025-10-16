'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { StockMovement } from '@/generated/prisma';
import { Checkbox } from '@/components/ui/checkbox';
import { MovementTypeBadge } from './movement-type-badge';
import { StockChangeIndicator } from './stock-change-indicator';
import { MovementActions } from './movement-actions';

export type StockMovementWithRelations = StockMovement & {
  product?: {
    id: string;
    name: string;
    image?: string | null;
    sku?: string | null;
  };
  user?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  store?: {
    id: string;
    name: string;
  };
  sale?: {
    id: string;
    saleNumber: string;
  };
};

export const getColumns = (): ColumnDef<StockMovementWithRelations>[] => {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Seleccionar todos"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'createdAt',
      header: 'Fecha',
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        const relativeTime = formatDistanceToNow(date, {
          addSuffix: true,
          locale: es,
        });
        const absoluteTime = format(date, "d 'de' MMM, yyyy HH:mm", {
          locale: es,
        });

        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{relativeTime}</span>
            <span className="text-xs text-muted-foreground">
              {absoluteTime}
            </span>
          </div>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: 'type',
      header: 'Tipo',
      cell: ({ row }) => (
        <MovementTypeBadge type={row.original.type} showIcon={true} />
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'product.name',
      header: 'Producto',
      cell: ({ row }) => {
        const product = row.original.product;
        if (!product) {
          return <span className="text-sm text-muted-foreground">N/A</span>;
        }

        return (
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {product.image && (
              <img
                src={product.image}
                alt={product.name}
                className="size-8 sm:size-10 rounded-md object-cover shrink-0"
              />
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-sm truncate">
                {product.name}
              </span>
              {product.sku && (
                <span className="text-xs text-muted-foreground truncate">
                  SKU: {product.sku}
                </span>
              )}
            </div>
          </div>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: 'quantity',
      header: 'Cantidad',
      cell: ({ row }) => {
        const type = row.original.type;
        const quantity = row.original.quantity;
        const isIn = type === 'IN';
        const isOut = type === 'OUT';

        return (
          <div
            className={`font-mono font-semibold text-sm ${
              isIn
                ? 'text-green-600 dark:text-green-400'
                : isOut
                ? 'text-red-600 dark:text-red-400'
                : 'text-orange-600 dark:text-orange-400'
            }`}
            aria-label={`Cantidad: ${quantity} unidades`}
          >
            {isIn && '+'}
            {isOut && '-'}
            {quantity}
          </div>
        );
      },
    },
    {
      id: 'stockChange',
      header: 'Cambio de Stock',
      cell: ({ row }) => (
        <StockChangeIndicator
          previousStock={row.original.previousStock}
          newStock={row.original.newStock}
        />
      ),
    },
    {
      accessorKey: 'user',
      header: 'Usuario',
      cell: ({ row }) => {
        const user = row.original.user;
        if (!user) {
          return (
            <span className="text-sm text-muted-foreground">Sistema</span>
          );
        }

        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {user.firstName} {user.lastName}
            </span>
            <span className="text-xs text-muted-foreground">
              @{user.username}
            </span>
          </div>
        );
      },
      enableHiding: true,
    },
    {
      accessorKey: 'reason',
      header: 'Razón',
      cell: ({ row }) => {
        const reason = row.original.reason;
        return (
          <div className="max-w-xs">
            <p className="text-sm line-clamp-2" title={reason || undefined}>
              {reason || '-'}
            </p>
          </div>
        );
      },
      enableHiding: true,
    },
    {
      accessorKey: 'reference',
      header: 'Referencia',
      cell: ({ row }) => {
        const reference = row.original.reference;
        const sale = row.original.sale;

        if (sale) {
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{sale.saleNumber}</span>
              <span className="text-xs text-muted-foreground">Venta</span>
            </div>
          );
        }

        return (
          <span className="text-sm text-muted-foreground">
            {reference || '-'}
          </span>
        );
      },
      enableHiding: true,
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => <MovementActions movement={row.original} />,
      enableHiding: false,
    },
  ];
};
