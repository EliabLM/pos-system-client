"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PurchaseStatus } from "@/generated/prisma"
import { usePurchaseById } from "@/hooks/usePurchases"

interface PurchaseDetailDialogProps {
  purchaseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
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

export default function PurchaseDetailDialog({
  purchaseId,
  open,
  onOpenChange,
}: PurchaseDetailDialogProps) {
  const { data: purchase, isLoading } = usePurchaseById(open ? purchaseId : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLoading ? (
              <Skeleton className="h-6 w-32" />
            ) : (
              <>
                Compra {purchase?.purchaseNumber}
                {purchase?.status && getStatusBadge(purchase.status)}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Detalles de la orden de compra
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : purchase ? (
          <div className="space-y-6">
            {/* Supplier Information */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Información del Proveedor</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Nombre</p>
                  <p className="font-medium">{purchase.supplier.name}</p>
                </div>
                {purchase.supplier.contactName && (
                  <div>
                    <p className="text-muted-foreground">Contacto</p>
                    <p className="font-medium">{purchase.supplier.contactName}</p>
                  </div>
                )}
                {purchase.supplier.taxId && (
                  <div>
                    <p className="text-muted-foreground">NIT/ID Fiscal</p>
                    <p className="font-medium">{purchase.supplier.taxId}</p>
                  </div>
                )}
                {purchase.supplier.email && (
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{purchase.supplier.email}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Purchase Information */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Información de la Compra</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fecha de Compra</p>
                  <p className="font-medium">
                    {format(new Date(purchase.purchaseDate), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
                {purchase.receivedDate && (
                  <div>
                    <p className="text-muted-foreground">Fecha de Recepción</p>
                    <p className="font-medium">
                      {format(new Date(purchase.receivedDate), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Purchase Items */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Productos</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unitario</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchase.purchaseItems?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.quantity * Number(item.unitPrice))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(Number(purchase.total))}</span>
              </div>
            </div>

            {/* Notes */}
            {purchase.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Notas</h3>
                  <p className="text-sm text-muted-foreground">{purchase.notes}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Metadata */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Información Adicional</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fecha de Creación</p>
                  <p className="font-medium">
                    {format(new Date(purchase.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última Actualización</p>
                  <p className="font-medium">
                    {format(new Date(purchase.updatedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No se encontró la compra
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
