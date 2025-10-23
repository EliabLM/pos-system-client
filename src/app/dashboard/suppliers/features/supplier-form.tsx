import React, { useEffect, useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useForm, Resolver } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Form,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCreateSupplier, useUpdateSupplier } from '@/hooks/useSuppliers';
import { Supplier } from '@/generated/prisma';

const schema = yup.object().shape({
  name: yup.string().required('Nombre es requerido'),
  contactName: yup.string().optional().nullable(),
  email: yup.string().email('Email inválido').optional().nullable(),
  phone: yup.string().optional().nullable(),
  taxId: yup.string().optional().nullable(),
  address: yup.string().optional().nullable(),
  city: yup.string().optional().nullable(),
  department: yup.string().optional().nullable(),
  isActive: yup.bool().required().default(true),
});

type SupplierFormData = {
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  address?: string | null;
  city?: string | null;
  department?: string | null;
  isActive: boolean;
};

const SupplierForm = ({
  setSheetOpen,
  itemSelected,
  setItemSelected,
}: {
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<React.SetStateAction<Supplier | null>>;
  itemSelected: Supplier | null;
}) => {
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SupplierFormData>({
    criteriaMode: 'firstError',
    defaultValues: {
      name: itemSelected?.name ?? '',
      contactName: itemSelected?.contactName ?? null,
      email: itemSelected?.email ?? null,
      phone: itemSelected?.phone ?? null,
      taxId: itemSelected?.taxId ?? null,
      address: itemSelected?.address ?? null,
      city: itemSelected?.city ?? null,
      department: itemSelected?.department ?? null,
      isActive: itemSelected?.isActive ?? true,
    },
    mode: 'all',
    reValidateMode: 'onChange',
    resolver: yupResolver(schema) as unknown as Resolver<SupplierFormData>,
  });

  const onSubmit = async (data: SupplierFormData) => {
    try {
      setIsLoading(true);

      if (itemSelected) {
        await updateMutation.mutateAsync({
          supplierId: itemSelected.id,
          updateData: {
            name: data.name,
            contactName: data.contactName,
            email: data.email,
            phone: data.phone,
            taxId: data.taxId,
            address: data.address,
            city: data.city,
            department: data.department,
            isActive: data.isActive,
          },
        });

        toast.success('Proveedor actualizado exitosamente');
      } else {
        await createMutation.mutateAsync({
          supplierData: {
            name: data.name,
            contactName: data.contactName || null,
            email: data.email || null,
            phone: data.phone || null,
            taxId: data.taxId || null,
            address: data.address || null,
            city: data.city || null,
            department: data.department || null,
            isActive: data.isActive,
          },
        });

        toast.success('Proveedor creado exitosamente');
      }

      form.reset();
      setSheetOpen(false);
      setItemSelected(null);
    } catch (error) {
      console.error('Error al guardar el proveedor:', error);
      toast.error(
        itemSelected
          ? 'Ha ocurrido un error actualizando el proveedor'
          : 'Ha ocurrido un error creando el proveedor'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!itemSelected) {
      form.reset({
        name: '',
        contactName: null,
        email: null,
        phone: null,
        taxId: null,
        address: null,
        city: null,
        department: null,
        isActive: true,
      });
      return;
    }

    form.reset({
      name: itemSelected.name,
      contactName: itemSelected.contactName,
      email: itemSelected.email,
      phone: itemSelected.phone,
      taxId: itemSelected.taxId,
      address: itemSelected.address,
      city: itemSelected.city,
      department: itemSelected.department,
      isActive: itemSelected.isActive,
    });
  }, [itemSelected, form]);

  return (
    <SheetContent className="overflow-y-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <SheetHeader>
            <SheetTitle>
              {itemSelected ? 'Actualizar proveedor' : 'Nuevo proveedor'}
            </SheetTitle>
            <SheetDescription>
              Ingresa la información del proveedor y presiona guardar para aplicar
              los cambios.
            </SheetDescription>
          </SheetHeader>

          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            {/* Name */}
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Distribuidora ABC S.A.S."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Name */}
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Contacto</FormLabel>
                    <FormControl>
                      <Input
                        id="contactName"
                        type="text"
                        placeholder="Juan Pérez"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email */}
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contacto@distribuidora.com"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Phone */}
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+57 300 123 4567"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tax ID / NIT */}
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIT / Tax ID</FormLabel>
                    <FormControl>
                      <Input
                        id="taxId"
                        type="text"
                        placeholder="900123456-7"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address */}
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Textarea
                        id="address"
                        placeholder="Calle 123 #45-67"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* City */}
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input
                        id="city"
                        type="text"
                        placeholder="Bogotá"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Department */}
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <FormControl>
                      <Input
                        id="department"
                        type="text"
                        placeholder="Cundinamarca"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Active Status */}
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Activo</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <SheetFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => setItemSelected(null)}
              >
                Cerrar
              </Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </Form>
    </SheetContent>
  );
};

export default SupplierForm;
