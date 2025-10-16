'use client';

import { ColumnDef } from '@tanstack/react-table';
import { User } from '@/generated/prisma';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  IconCircleCheckFilled,
  IconAlertCircleFilled,
  IconMailCheck,
  IconMailX,
  IconBuildingStore,
  IconCalendar,
} from '@tabler/icons-react';
import { RoleBadge } from './role-badge';
import { UserActionComponent } from './action-component';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GetColumnsProps {
  setItemSelected: React.Dispatch<React.SetStateAction<User | null>>;
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedUserId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const getColumns = ({
  setItemSelected,
  setSheetOpen,
  setDialogOpen,
  setSelectedUserId,
}: GetColumnsProps): ColumnDef<User>[] => {
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
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
      accessorKey: 'fullName',
      header: 'Nombre Completo',
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm sm:text-base truncate">
              {user.firstName} {user.lastName}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              @{user.username}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      enableHiding: true,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-muted-foreground truncate">
              {user.email}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: 'Rol',
      enableHiding: true,
      cell: ({ row }) => {
        const user = row.original;
        return <RoleBadge role={user.role} />;
      },
    },
    {
      accessorKey: 'store',
      header: 'Tienda',
      enableHiding: true,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <IconBuildingStore
              className="size-4 text-muted-foreground shrink-0"
              aria-hidden="true"
            />
            <span className="text-sm truncate">
              {user.storeId ? 'Asignada' : 'Sin tienda'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'emailVerified',
      header: 'Email Verificado',
      enableHiding: true,
      cell: ({ row }) => {
        const verified = row.original.emailVerified;
        return (
          <Badge
            variant="outline"
            className="gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 text-xs"
          >
            {verified ? (
              <>
                <IconMailCheck
                  className="size-3 sm:size-3.5 fill-green-500 dark:fill-green-400"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Verificado</span>
                <span className="sm:hidden">✓</span>
              </>
            ) : (
              <>
                <IconMailX
                  className="size-3 sm:size-3.5 fill-orange-500 dark:fill-orange-400"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Pendiente</span>
                <span className="sm:hidden">⊗</span>
              </>
            )}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      enableHiding: true,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Badge
            variant="outline"
            className={`gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 text-xs ${
              user.isActive
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
            }`}
          >
            {user.isActive ? (
              <IconCircleCheckFilled
                className="size-3 sm:size-3.5 fill-green-500 dark:fill-green-400"
                aria-hidden="true"
              />
            ) : (
              <IconAlertCircleFilled
                className="size-3 sm:size-3.5 fill-red-500 dark:fill-red-400"
                aria-hidden="true"
              />
            )}
            <span className="hidden sm:inline">
              {user.isActive ? 'Activo' : 'Inactivo'}
            </span>
            <span className="sm:hidden">{user.isActive ? '✓' : '✕'}</span>
          </Badge>
        );
      },
    },
    {
      accessorKey: 'lastLoginAt',
      header: 'Último Acceso',
      enableHiding: true,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <IconCalendar
              className="size-4 text-muted-foreground shrink-0"
              aria-hidden="true"
            />
            <span className="text-xs sm:text-sm text-muted-foreground truncate">
              {user.lastLoginAt
                ? formatDistanceToNow(new Date(user.lastLoginAt), {
                    addSuffix: true,
                    locale: es,
                  })
                : 'Nunca'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => (
        <UserActionComponent
          item={row.original}
          setItemSelected={setItemSelected}
          setSheetOpen={setSheetOpen}
          setDialogOpen={setDialogOpen}
          setSelectedUserId={setSelectedUserId}
        />
      ),
    },
  ];
};
