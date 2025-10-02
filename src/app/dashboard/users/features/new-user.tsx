import React, { useEffect, useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useForm } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useCreateUser, useUpdateUser } from '@/hooks/useUsers';
import { useActiveStores } from '@/hooks/useStores';
import { User, UserRole } from '@/generated/prisma';
import { useStore } from '@/store';

const schema = yup.object().shape({
  firstName: yup
    .string()
    .min(2, 'Debe ingresar mínimo 2 caracteres')
    .required('El nombre es requerido'),
  lastName: yup
    .string()
    .min(2, 'Debe ingresar mínimo 2 caracteres')
    .required('El apellido es requerido'),
  email: yup
    .string()
    .email('Debe ingresar un email válido')
    .required('El email es requerido'),
  storeId: yup
    .string()
    .required('La tienda es requerida para vendedores'),
  active: yup.bool().default(true),
});

type UserFormData = yup.InferType<typeof schema>;

const NewUser = ({
  setSheetOpen,
  itemSelected,
  setItemSelected,
}: {
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<React.SetStateAction<User | null>>;
  itemSelected: User | null;
}) => {
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const { data: activeStores } = useActiveStores();
  const currentUser = useStore((state) => state.user);

  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UserFormData>({
    criteriaMode: 'firstError',
    defaultValues: {
      firstName: itemSelected?.firstName ?? '',
      lastName: itemSelected?.lastName ?? '',
      email: itemSelected?.email ?? '',
      storeId: itemSelected?.storeId ?? '',
      active: itemSelected?.isActive ?? true,
    },
    mode: 'all',
    reValidateMode: 'onChange',
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: UserFormData) => {
    try {
      setIsLoading(true);

      // Validar que la tienda no sea "none"
      if (data.storeId === 'none') {
        toast.error('Debe seleccionar una tienda para el vendedor');
        return;
      }

      if (itemSelected) {
        // Actualizar usuario existente
        await updateMutation.mutateAsync({
          userId: itemSelected.id,
          updateData: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            storeId: data.storeId,
            isActive: data.active,
          },
        });

        toast.success('Usuario actualizado exitosamente');
      } else {
        // Crear invitación en Clerk (sin contraseña)
        const clerkResponse = await fetch('/api/clerk/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName: data.firstName,
            lastName: data.lastName,
            emailAddress: data.email,
          }),
        });

        if (!clerkResponse.ok) {
          const errorData = await clerkResponse.json();
          throw new Error(errorData.error || 'Error al crear invitación en Clerk');
        }

        const clerkData = await clerkResponse.json();

        // Generar username a partir del email
        const username = data.email.split('@')[0];

        // Crear el usuario en la base de datos
        // El clerkId se obtendrá cuando el usuario acepte la invitación
        await createMutation.mutateAsync({
          clerkId: `pending_${clerkData.id}`, // Temporal hasta que acepte la invitación
          organizationId: currentUser?.organizationId || null,
          storeId: data.storeId,
          email: data.email,
          username: username,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'SELLER', // Siempre SELLER
          emailVerified: false,
          isActive: data.active,
        });

        toast.success('Invitación enviada exitosamente. El usuario recibirá un email para activar su cuenta.');
      }

      form.reset();
      setSheetOpen(false);
      setItemSelected(null);
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Ha ocurrido un error guardando el usuario');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (itemSelected) {
      form.setValue('firstName', itemSelected.firstName);
      form.setValue('lastName', itemSelected.lastName);
      form.setValue('email', itemSelected.email);
      form.setValue('storeId', itemSelected.storeId ?? '');
      form.setValue('active', itemSelected.isActive);
    }
  }, [itemSelected, form]);

  return (
    <SheetContent className="md:max-w-[570px] overflow-y-auto">
      <SheetHeader>
        <SheetTitle>
          {itemSelected ? 'Editar usuario' : 'Crear nuevo usuario'}
        </SheetTitle>
        <SheetDescription>
          {itemSelected
            ? 'Actualiza la información del usuario'
            : 'Completa el formulario para crear un nuevo usuario'}
        </SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido *</FormLabel>
                  <FormControl>
                    <Input placeholder="Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    {...field}
                    disabled={!!itemSelected}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <FormControl>
                <Input value="Vendedor" disabled />
              </FormControl>
            </FormItem>

            <FormField
              control={form.control}
              name="storeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tienda (opcional)</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value === 'none' ? null : value);
                    }}
                    defaultValue={field.value ?? 'none'}
                    value={field.value ?? 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tienda" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Ninguna</SelectItem>
                      {activeStores?.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Estado activo</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    {field.value ? 'Usuario activo' : 'Usuario inactivo'}
                  </div>
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

          <SheetFooter className="mt-6">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </SheetClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? 'Guardando...'
                : itemSelected
                  ? 'Actualizar'
                  : 'Crear usuario'}
            </Button>
          </SheetFooter>
        </form>
      </Form>
    </SheetContent>
  );
};

export default NewUser;
