"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/store"
import { toast } from "sonner"
import PurchasesList from "./features/purchases-list"
import { IconLoader2 } from "@tabler/icons-react"

export default function PurchasesPage() {
  const router = useRouter()
  const user = useStore((state) => state.user)
  const [isCheckingPermission, setIsCheckingPermission] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsCheckingPermission(false)
      return
    }

    if (user.role !== "ADMIN") {
      toast.error("No tienes permisos para acceder a esta página")
      router.push("/dashboard")
      return
    }

    setIsCheckingPermission(false)
  }, [user, router])

  if (isCheckingPermission) {
    return (
      <div className="flex h-screen items-center justify-center">
        <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || user.role !== "ADMIN") {
    return null
  }

  return <PurchasesList />
}
