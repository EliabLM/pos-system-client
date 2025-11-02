"use client"

import { useState } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { IconChevronDown } from "@tabler/icons-react"
import { Purchase, PurchaseStatus } from "@/generated/prisma"
import PurchaseActions from "./purchase-actions"

type PurchaseWithRelations = Purchase & {
  supplier?: {
    id: string
    name: string
  }
  createdBy?: {
    id: string
    name: string
  }
  _count?: {
    purchaseItems: number
  }
}

interface DataTableProps {
  data: PurchaseWithRelations[]
  isLoading: boolean
}

const getStatusBadge = (status: PurchaseStatus) => {
  switch (status) {
    case "PENDING":
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pendiente</Badge>
    case "RECEIVED":
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Recibida</Badge>
    case "CANCELLED":
      return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Cancelada</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function DataTable({ data, isLoading }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  const columns: ColumnDef<PurchaseWithRelations>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todos"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "purchaseNumber",
      header: "N° Compra",
      enableHiding: false,
    },
    {
      accessorKey: "supplier.name",
      header: "Proveedor",
      enableHiding: false,
      cell: ({ row }) => row.original.supplier?.name || "N/A",
    },
    {
      accessorKey: "purchaseDate",
      header: "Fecha de Compra",
      cell: ({ row }) => {
        const date = row.getValue("purchaseDate") as Date
        return format(new Date(date), "dd/MM/yyyy", { locale: es })
      },
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => {
        const total = row.getValue("total") as number
        return formatCurrency(total)
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.getValue("status") as PurchaseStatus
        return getStatusBadge(status)
      },
    },
    {
      accessorKey: "receivedDate",
      header: "Fecha de Recepción",
      cell: ({ row }) => {
        const date = row.getValue("receivedDate") as Date | null
        if (!date) return "-"
        return format(new Date(date), "dd/MM/yyyy", { locale: es })
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <PurchaseActions purchase={row.original} />,
      enableHiding: false,
    },
  ]

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  if (isLoading) {
    return <div className="text-center py-8">Cargando compras...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Filtrar por número de compra..."
          value={(table.getColumn("purchaseNumber")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("purchaseNumber")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Columnas <IconChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
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
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No se encontraron compras.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} de{" "}
          {table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
