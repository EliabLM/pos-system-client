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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

import {
  useCreateStore,
  useStoreById,
  useUpdateStore,
} from '@/hooks/useStores';
import { Store } from '@/generated/prisma';
import { createSlug } from '@/utils/createSlug';

const schema = yup.object().shape({
  name: yup
    .string()
    .min(3, 'Debe ingresar mínimo 3 caracteres')
    .required('El nombre es requerido'),
  description: yup.string().nullable().notRequired().defined(),
  phone: yup.string().nullable().notRequired().defined(),
  address: yup.string().required('La dirección es requerida'),
  active: yup.bool().default(true),
});

type StoreFormData = yup.InferType<typeof schema>;

const NewStore = ({
  setSheetOpen,
  itemSelected,
  setItemSelected,
}: {
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<React.SetStateAction<Store | null>>;
  itemSelected: Store | null;
}) => {
  const createMutation = useCreateStore();
  const updateMutation = useUpdateStore();
  const selectedStore = useStoreById(itemSelected?.id ?? '');
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<StoreFormData>({
    criteriaMode: 'firstError',
    defaultValues: {
      name: itemSelected?.name ?? '',
      description: itemSelected?.description ?? '',
      address: itemSelected?.address ?? '',
      phone: selectedStore?.data?.phone ?? '',
      active: itemSelected?.isActive ?? true,
    },
    mode: 'all',
    reValidateMode: 'onChange',
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: StoreFormData) => {
    try {
      setIsLoading(true);

      if (itemSelected) {
        await updateMutation.mutateAsync({
          storeId: itemSelected.id,
          storeData: {
            name: data.name,
            description: data.description,
            address: data.address,
            phone: data.phone,
            isActive: data.active,
          },
        });

        toast.success('Tienda actualizada exitosamente');
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          description: data.description,
          address: data.address,
          saleNumberPrefix: createSlug(data.name),
          city: 'Cartagena',
          department: 'Bolívar',
          phone: data.phone,
          isActive: data.active,
        });

        toast.success('Tienda creada exitosamente');
      }

      form.reset();
      setSheetOpen(false);
      setItemSelected(null);
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);
      toast.error('Ha ocurrido un error creando la tienda');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!itemSelected || !selectedStore.data) {
      form.setValue('name', '');
      form.setValue('description', '');
      form.setValue('address', '');
      form.setValue('phone', '');
      form.setValue('active', true);
      return;
    }

    form.setValue('name', itemSelected.name);
    form.setValue('description', itemSelected.description);
    form.setValue('address', itemSelected.address);
    form.setValue('phone', selectedStore.data.phone);
    form.setValue('active', itemSelected.isActive);
  }, [itemSelected, selectedStore.data]);

  return (
    <SheetContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <SheetHeader>
            <SheetTitle>
              {itemSelected ? 'Actualizar tienda' : 'Nueva tienda'}
            </SheetTitle>
            <SheetDescription>
              Ingresa la información de la tienda y presiona guardar para
              aplicar los cambios.
            </SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Categoría"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        id="description"
                        placeholder="Descripción"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input
                        id="address"
                        type="text"
                        placeholder="Dirección"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input
                        id="address"
                        type="text"
                        placeholder="Teléfono"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="active"
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
              {isLoading ? 'Cargando...' : 'Guardar cambios'}
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

export default NewStore;
