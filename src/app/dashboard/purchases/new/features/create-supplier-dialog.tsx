"use client"

import { useForm, Resolver } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateSupplier } from "@/hooks/useSuppliers"

interface CreateSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSupplierCreated: (supplierId: string) => void
}

interface SupplierFormData {
  name: string
  contactName: string
  email: string
  phone: string
  taxId: string
  address: string
  city: string
  department: string
}

const schema = yup.object({
  name: yup
    .string()
    .required("El nombre es requerido")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre debe tener máximo 100 caracteres"),
  contactName: yup
    .string()
    .max(100, "El nombre de contacto debe tener máximo 100 caracteres")
    .optional(),
  email: yup
    .string()
    .email("Email inválido")
    .max(100, "El email debe tener máximo 100 caracteres")
    .optional(),
  phone: yup
    .string()
    .min(7, "El teléfono debe tener al menos 7 caracteres")
    .max(20, "El teléfono debe tener máximo 20 caracteres")
    .optional(),
  taxId: yup
    .string()
    .min(5, "El NIT/ID Fiscal debe tener al menos 5 caracteres")
    .max(20, "El NIT/ID Fiscal debe tener máximo 20 caracteres")
    .optional(),
  address: yup
    .string()
    .max(200, "La dirección debe tener máximo 200 caracteres")
    .optional(),
  city: yup
    .string()
    .max(50, "La ciudad debe tener máximo 50 caracteres")
    .optional(),
  department: yup
    .string()
    .max(50, "El departamento debe tener máximo 50 caracteres")
    .optional(),
})

export default function CreateSupplierDialog({
  open,
  onOpenChange,
  onSupplierCreated,
}: CreateSupplierDialogProps) {
  const createMutation = useCreateSupplier()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: yupResolver(schema) as unknown as Resolver<SupplierFormData>,
    defaultValues: {
      name: "",
      contactName: "",
      email: "",
      phone: "",
      taxId: "",
      address: "",
      city: "",
      department: "",
    },
  })

  const onSubmit = async (data: SupplierFormData) => {
    const supplierData = {
      name: data.name,
      contactName: data.contactName || null,
      email: data.email || null,
      phone: data.phone || null,
      taxId: data.taxId || null,
      address: data.address || null,
      city: data.city || null,
      department: data.department || null,
      isActive: true,
    }

    createMutation.mutate(
      { supplierData },
      {
        onSuccess: (data) => {
          if (data) {
            toast.success("Proveedor creado correctamente")
            onSupplierCreated(data.id)
            reset()
            onOpenChange(false)
          }
        },
        onError: () => {
          toast.error("Error al crear el proveedor")
        },
      }
    )
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Proveedor</DialogTitle>
          <DialogDescription>
            Agrega un nuevo proveedor a tu organización
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Nombre de Contacto</Label>
              <Input id="contactName" {...register("contactName")} />
              {errors.contactName && (
                <p className="text-sm text-red-500">{errors.contactName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">NIT/ID Fiscal</Label>
              <Input id="taxId" {...register("taxId")} />
              {errors.taxId && (
                <p className="text-sm text-red-500">{errors.taxId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" {...register("address")} />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" {...register("city")} />
              {errors.city && (
                <p className="text-sm text-red-500">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Input id="department" {...register("department")} />
              {errors.department && (
                <p className="text-sm text-red-500">{errors.department.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creando..." : "Crear Proveedor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
