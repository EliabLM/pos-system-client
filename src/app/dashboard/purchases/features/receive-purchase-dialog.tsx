"use client"

import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { IconAlertTriangle } from "@tabler/icons-react"
import { usePurchaseById, useReceivePurchase } from "@/hooks/usePurchases"

interface ReceivePurchaseDialogProps {
  purchaseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ReceivePurchaseDialog({
  purchaseId,
  open,
  onOpenChange,
}: ReceivePurchaseDialogProps) {
  const { data: purchase, isLoading } = usePurchaseById(open ? purchaseId : null)
  const receiveMutation = useReceivePurchase()

  const handleReceive = async () => {
    receiveMutation.mutate(
      { purchaseId },
      {
        onSuccess: () => {
          toast.success("Compra recibida correctamente. El inventario ha sido actualizado.")
          onOpenChange(false)
        },
        onError: () => {
          toast.error("Error al recibir la compra")
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recibir Compra</DialogTitle>
          <DialogDescription>
            Confirma la recepción de los productos. Esta acción actualizará el inventario.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : purchase ? (
          <div className="space-y-6">
            {/* Purchase Summary */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Resumen de la Compra</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Número de Compra</p>
                  <p className="font-medium">{purchase.purchaseNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Proveedor</p>
                  <p className="font-medium">{purchase.supplier.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCurrency(purchase.total)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cantidad de Productos</p>
                  <p className="font-medium">
                    {purchase.purchaseItems?.length || 0} producto(s)
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Products to Receive */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Productos a Recibir</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Alert>
              <IconAlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta acción actualizará el inventario de todos los productos incluidos en esta compra.
                El stock de cada producto se incrementará según la cantidad recibida.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No se encontró la compra
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={receiveMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleReceive}
            disabled={receiveMutation.isPending || !purchase}
          >
            {receiveMutation.isPending ? "Procesando..." : "Confirmar Recepción"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
