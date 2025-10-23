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
import { useCreateCategory, useUpdateCategory } from '@/hooks/useCategories';
import { Category } from '@/generated/prisma';

const schema = yup.object().shape({
  name: yup
    .string()
    .min(3, 'Debe ingresar mínimo 3 caracteres')
    .required('El nombre es requerido'),
  description: yup.string().nullable().notRequired().defined(),
  active: yup.bool().default(true),
});

type CategoryFormData = yup.InferType<typeof schema>;

const NewCategory = ({
  setSheetOpen,
  itemSelected,
  setItemSelected,
}: {
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<React.SetStateAction<Category | null>>;
  itemSelected: Category | null;
}) => {
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CategoryFormData>({
    criteriaMode: 'firstError',
    defaultValues: {
      name: itemSelected?.name ?? '',
      description: itemSelected?.description ?? '',
      active: itemSelected?.isActive ?? true,
    },
    mode: 'all',
    reValidateMode: 'onChange',
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: CategoryFormData) => {
    try {
      setIsLoading(true);

      if (itemSelected) {
        await updateMutation.mutateAsync({
          categoryId: itemSelected.id,
          categoryData: {
            name: data.name,
            description: data.description,
            isActive: data.active,
          },
        });

        toast.success('Categoría actualizada exitosamente');
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          description: data.description,
          isActive: data.active,
        });

        toast.success('Categoría creada exitosamente');
      }

      form.reset();
      setSheetOpen(false);
      setItemSelected(null);
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);
      toast.error('Ha ocurrido un error creando la categoría');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!itemSelected) {
      form.setValue('name', '');
      form.setValue('description', '');
      form.setValue('active', true);
      return;
    }

    form.setValue('name', itemSelected.name);
    form.setValue('description', itemSelected.description);
    form.setValue('active', itemSelected.isActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemSelected]);

  return (
    <SheetContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <SheetHeader>
            <SheetTitle>
              {itemSelected ? 'Actualizar categoría' : 'Nueva categoría'}
            </SheetTitle>
            <SheetDescription>
              Ingresa la información de la categoría y presiona guardar para
              aplicar los cambios.
            </SheetDescription>
          </SheetHeader>
          <div className='grid flex-1 auto-rows-min gap-6 px-4'>
            <div className='grid gap-3'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombres</FormLabel>
                    <FormControl>
                      <Input
                        id='name'
                        type='text'
                        placeholder='Categoría'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='grid gap-3'>
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        id='description'
                        placeholder='Descripción'
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='grid gap-3'>
              <FormField
                control={form.control}
                name='active'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                    <div className='space-y-0.5'>
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
            <Button type='submit' disabled={isLoading}>
              {isLoading ? 'Cargando...' : 'Guardar cambios'}
            </Button>
            <SheetClose asChild>
              <Button
                type='button'
                variant='outline'
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

export default NewCategory;
