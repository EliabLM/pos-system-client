"use client"

import { useState } from "react"
import { toast } from "sonner"
import Swal from "sweetalert2"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconDots, IconEye, IconCheck, IconX } from "@tabler/icons-react"
import { Purchase } from "@/generated/prisma"
import { useCancelPurchase } from "@/hooks/usePurchases"
import PurchaseDetailDialog from "./purchase-detail-dialog"
import ReceivePurchaseDialog from "./receive-purchase-dialog"

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

interface PurchaseActionsProps {
  purchase: PurchaseWithRelations
}

export default function PurchaseActions({ purchase }: PurchaseActionsProps) {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)
  const cancelMutation = useCancelPurchase()

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: "¿Cancelar compra?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "No, mantener",
    })

    if (result.isConfirmed) {
      cancelMutation.mutate(
        { purchaseId: purchase.id, reason: "Cancelada por el usuario" },
        {
          onSuccess: () => {
            toast.success("Compra cancelada correctamente")
          },
          onError: () => {
            toast.error("Error al cancelar la compra")
          },
        }
      )
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <IconDots className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setDetailDialogOpen(true)}>
            <IconEye className="mr-2 h-4 w-4" />
            Ver Detalle
          </DropdownMenuItem>
          {purchase.status === "PENDING" && (
            <>
              <DropdownMenuItem onClick={() => setReceiveDialogOpen(true)}>
                <IconCheck className="mr-2 h-4 w-4" />
                Recibir Compra
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleCancel}
                className="text-red-600"
              >
                <IconX className="mr-2 h-4 w-4" />
                Cancelar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <PurchaseDetailDialog
        purchaseId={purchase.id}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />

      {purchase.status === "PENDING" && (
        <ReceivePurchaseDialog
          purchaseId={purchase.id}
          open={receiveDialogOpen}
          onOpenChange={setReceiveDialogOpen}
        />
      )}
    </>
  )
}
