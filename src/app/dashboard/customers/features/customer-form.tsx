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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import { Customer } from '@/generated/prisma';

const schema = yup.object().shape({
  firstName: yup.string().required('Nombre es requerido'),
  lastName: yup.string().required('Apellido es requerido'),
  email: yup.string().email('Email inválido').optional().nullable(),
  phone: yup.string().optional().nullable(),
  documentType: yup.string().optional().nullable(),
  document: yup.string().optional().nullable(),
  address: yup.string().optional().nullable(),
  city: yup.string().optional().nullable(),
  department: yup.string().optional().nullable(),
  isActive: yup.bool().required().default(true),
});

type CustomerFormData = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  documentType?: string | null;
  document?: string | null;
  address?: string | null;
  city?: string | null;
  department?: string | null;
  isActive: boolean;
};

const documentTypes = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'NIT', label: 'NIT' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'Passport', label: 'Pasaporte' },
];

const CustomerForm = ({
  setSheetOpen,
  itemSelected,
  setItemSelected,
}: {
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<React.SetStateAction<Customer | null>>;
  itemSelected: Customer | null;
}) => {
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CustomerFormData>({
    criteriaMode: 'firstError',
    defaultValues: {
      firstName: itemSelected?.firstName ?? '',
      lastName: itemSelected?.lastName ?? '',
      email: itemSelected?.email ?? null,
      phone: itemSelected?.phone ?? null,
      documentType: itemSelected?.documentType ?? null,
      document: itemSelected?.document ?? null,
      address: itemSelected?.address ?? null,
      city: itemSelected?.city ?? null,
      department: itemSelected?.department ?? null,
      isActive: itemSelected?.isActive ?? true,
    },
    mode: 'all',
    reValidateMode: 'onChange',
    resolver: yupResolver(schema) as unknown as Resolver<CustomerFormData>,
  });

  const onSubmit = async (data: CustomerFormData) => {
    try {
      setIsLoading(true);

      if (itemSelected) {
        await updateMutation.mutateAsync({
          customerId: itemSelected.id,
          updateData: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            documentType: data.documentType,
            document: data.document,
            address: data.address,
            city: data.city,
            department: data.department,
            isActive: data.isActive,
          },
        });

        toast.success('Cliente actualizado exitosamente');
      } else {
        await createMutation.mutateAsync({
          customerData: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email || null,
            phone: data.phone || null,
            documentType: data.documentType || null,
            document: data.document || null,
            address: data.address || null,
            city: data.city || null,
            department: data.department || null,
            isActive: data.isActive,
          },
        });

        toast.success('Cliente creado exitosamente');
      }

      form.reset();
      setSheetOpen(false);
      setItemSelected(null);
    } catch (error) {
      console.error('Error al guardar el cliente:', error);
      toast.error(
        itemSelected
          ? 'Ha ocurrido un error actualizando el cliente'
          : 'Ha ocurrido un error creando el cliente'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!itemSelected) {
      form.reset({
        firstName: '',
        lastName: '',
        email: null,
        phone: null,
        documentType: null,
        document: null,
        address: null,
        city: null,
        department: null,
        isActive: true,
      });
      return;
    }

    form.reset({
      firstName: itemSelected.firstName,
      lastName: itemSelected.lastName,
      email: itemSelected.email,
      phone: itemSelected.phone,
      documentType: itemSelected.documentType,
      document: itemSelected.document,
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
              {itemSelected ? 'Actualizar cliente' : 'Nuevo cliente'}
            </SheetTitle>
            <SheetDescription>
              Ingresa la información del cliente y presiona guardar para aplicar
              los cambios.
            </SheetDescription>
          </SheetHeader>

          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            {/* First Name */}
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="Juan"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Last Name */}
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido *</FormLabel>
                    <FormControl>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Pérez"
                        {...field}
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
                        placeholder="juan.perez@example.com"
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

            {/* Document Type */}
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Documento</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Document */}
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Documento</FormLabel>
                    <FormControl>
                      <Input
                        id="document"
                        type="text"
                        placeholder="123456789"
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

export default CustomerForm;
