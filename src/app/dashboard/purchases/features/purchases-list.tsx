"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IconPlus } from "@tabler/icons-react"
import { usePurchases } from "@/hooks/usePurchases"
import DataTable from "./data-table"

export default function PurchasesList() {
  const router = useRouter()

  const { data: purchasesData, isLoading } = usePurchases()

  const purchases = purchasesData?.purchases || []

  return (
    <div className="space-y-4 p-8 pt-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Compras</CardTitle>
              <CardDescription>
                Gestiona las órdenes de compra de tu organización
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/dashboard/purchases/new")}>
              <IconPlus className="mr-2 h-4 w-4" />
              Crear nueva compra
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable data={purchases} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
