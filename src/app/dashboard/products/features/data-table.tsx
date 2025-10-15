'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconLayoutColumns,
  IconAlertCircleFilled,
  IconPackage,
  IconPlus,
} from '@tabler/icons-react';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { NumericFormat } from 'react-number-format';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProductActionMenu } from './product-action-menu';
import { ProductWithIncludesNumberPrice } from '@/interfaces';

const getStockStatus = (stock: number, minStock: number) => {
  if (stock < minStock) return { color: 'bg-red-500', status: 'low' };
  if (stock < 2 * minStock) return { color: 'bg-yellow-500', status: 'medium' };
  if (stock < 4 * minStock) return { color: 'bg-orange-500', status: 'good' };
  return { color: 'bg-green-500', status: 'high' };
};

const getColumns = ({
  setItemSelected,
  setSheetOpen,
}: {
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<
    React.SetStateAction<ProductWithIncludesNumberPrice | null>
  >;
}): ColumnDef<ProductWithIncludesNumberPrice>[] => {
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
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: 'Producto',
      enableHiding: false,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <TooltipProvider>
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border">
                    <Image
                      className="object-cover"
                      src={product.image ?? '/placeholder-product.png'}
                      alt={product.name}
                      fill
                      sizes="64px"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="p-0">
                  <div className="relative h-64 w-64 overflow-hidden rounded-lg">
                    <Image
                      src={product.image ?? '/placeholder-product.png'}
                      alt={product.name}
                      fill
                      sizes="256px"
                      className="object-cover"
                    />
                  </div>
                </TooltipContent>
              </Tooltip>

              <div className="flex flex-col gap-1">
                <span className="font-semibold">{product.name}</span>
                {product.sku && (
                  <Badge
                    variant="outline"
                    className="w-fit font-mono text-xs"
                  >
                    {product.sku}
                  </Badge>
                )}
                <div className="flex flex-wrap gap-1">
                  {product.category && (
                    <Badge
                      className="rounded-sm px-1.5 text-xs"
                      variant="info"
                    >
                      {product.category.name.toLowerCase()}
                    </Badge>
                  )}
                  {product.brand && (
                    <Badge
                      className="rounded-sm px-1.5 text-xs"
                      variant="secondary"
                    >
                      {product.brand.name.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
      cell: ({ row }) => {
        const product = row.original;
        const stockStatus = getStockStatus(
          product.currentStock,
          product.minStock
        );

        const getStockLabel = () => {
          if (product.currentStock < product.minStock) return 'Bajo';
          if (product.currentStock < product.minStock * 1.5) return 'Medio';
          if (product.currentStock < product.minStock * 3) return 'Bueno';
          return 'Alto';
        };

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${stockStatus.color}`} />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {product.currentStock} / {product.minStock} mín
                    </span>
                    <Badge
                      variant={
                        stockStatus.status === 'low'
                          ? 'destructive'
                          : stockStatus.status === 'medium'
                            ? 'default'
                            : 'secondary'
                      }
                      className="w-fit text-xs"
                    >
                      {getStockLabel()}
                    </Badge>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-semibold">
                    Stock: {product.currentStock} unidades
                  </p>
                  <p className="text-xs">
                    Mínimo: {product.minStock} unidades
                  </p>
                  {product.currentStock < product.minStock && (
                    <p className="text-destructive text-xs font-semibold">
                      ¡Stock por debajo del mínimo!
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: 'salePrice',
      header: 'Precio',
      enableHiding: true,
      cell: ({ row }) => {
        const product = row.original;
        const margin = product.salePrice - product.costPrice;
        const marginPercent = (margin / product.costPrice) * 100;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <p className="text-lg font-semibold">
                    <NumericFormat
                      value={product.salePrice}
                      prefix="$"
                      thousandSeparator="."
                      decimalSeparator=","
                      displayType="text"
                    />
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Precio de Costo
                    </p>
                    <p className="font-medium">
                      <NumericFormat
                        value={product.costPrice}
                        prefix="$"
                        thousandSeparator="."
                        decimalSeparator=","
                        displayType="text"
                      />
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Precio de Venta
                    </p>
                    <p className="font-medium text-green-600">
                      <NumericFormat
                        value={product.salePrice}
                        prefix="$"
                        thousandSeparator="."
                        decimalSeparator=","
                        displayType="text"
                      />
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Margen</p>
                    <p
                      className={`font-semibold ${
                        margin >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      <NumericFormat
                        value={margin}
                        prefix="$"
                        thousandSeparator="."
                        decimalSeparator=","
                        displayType="text"
                      />{' '}
                      ({marginPercent.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: 'updatedAt',
      header: 'Última actualización',
      enableHiding: true,
      cell: ({ row }) => {
        return row.original.updatedAt?.toLocaleDateString();
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.isActive ? (
            <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
          ) : (
            <IconAlertCircleFilled />
          )}
          {row.original.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <ProductActionMenu
          product={row.original}
          onEdit={(product) => {
            setItemSelected(product);
            setSheetOpen(true);
          }}
        />
      ),
    },
  ];
};

function DraggableRow({ row }: { row: Row<ProductWithIncludesNumberPrice> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id ?? 0,
  });

  return (
    <TableRow
      data-state={row.getIsSelected() && 'selected'}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

export function DataTable({
  data,
  loading,
  setSheetOpen,
  setItemSelected,
}: {
  data: ProductWithIncludesNumberPrice[];
  loading: boolean;
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<
    React.SetStateAction<ProductWithIncludesNumberPrice | null>
  >;
}) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id ?? 0) || [],
    [data]
  );

  const table = useReactTable({
    data,
    columns: getColumns({ setItemSelected, setSheetOpen }),
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id?.toString() ?? '1',
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      //
    }
  }

  return (
    <div className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-end mb-4 ">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">Personalizar columnas</span>
                <span className="lg:hidden">Columnas</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== 'undefined' &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.columnDef.header?.toString()}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {loading ? (
                  <>
                    {Array.from({ length: 10 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="mx-auto h-4 w-4" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-16 w-16 rounded-lg" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-48" />
                              <Skeleton className="h-3 w-20" />
                              <div className="flex gap-1">
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-5 w-16" />
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-5 w-16" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="mx-auto h-8 w-8 rounded" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={
                        getColumns({ setItemSelected, setSheetOpen }).length
                      }
                      className="h-[400px]"
                    >
                      <Card className="border-dashed">
                        <div className="flex flex-col items-center justify-center py-12">
                          <IconPackage className="text-muted-foreground mb-4 size-16 stroke-1" />
                          <h3 className="mb-2 text-lg font-semibold">
                            No hay productos registrados
                          </h3>
                          <p className="text-muted-foreground mb-4 text-center text-sm">
                            Comienza agregando tu primer producto al inventario
                          </p>
                          <Button
                            onClick={() => {
                              setItemSelected(null);
                              setSheetOpen(true);
                            }}
                          >
                            <IconPlus className="size-4" />
                            Crear Primer Producto
                          </Button>
                        </div>
                      </Card>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} de{' '}
            {table.getFilteredRowModel().rows.length} filas(s) seleccionadas.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Filas por página
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Página {table.getState().pagination.pageIndex + 1} de{' '}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Ir a primera página</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Página anterior</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Siguiente página</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Ir a última página</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
