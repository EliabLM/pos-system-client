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
import { useCreateUnitMeasure, useUpdateUnitMeasure } from '@/hooks/useUnitMeasures';
import { UnitMeasure } from '@/generated/prisma';

const schema = yup.object().shape({
  name: yup
    .string()
    .min(2, 'Debe ingresar mínimo 2 caracteres')
    .required('El nombre es requerido'),
  abbreviation: yup
    .string()
    .min(1, 'Debe ingresar mínimo 1 caracter')
    .max(10, 'Máximo 10 caracteres')
    .required('La abreviación es requerida'),
  active: yup.bool().default(true),
});

type UnitMeasureFormData = yup.InferType<typeof schema>;

const NewUnitMeasure = ({
  setSheetOpen,
  itemSelected,
  setItemSelected,
}: {
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<React.SetStateAction<UnitMeasure | null>>;
  itemSelected: UnitMeasure | null;
}) => {
  const createMutation = useCreateUnitMeasure();
  const updateMutation = useUpdateUnitMeasure();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UnitMeasureFormData>({
    criteriaMode: 'firstError',
    defaultValues: {
      name: itemSelected?.name ?? '',
      abbreviation: itemSelected?.abbreviation ?? '',
      active: itemSelected?.isActive ?? true,
    },
    mode: 'all',
    reValidateMode: 'onChange',
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: UnitMeasureFormData) => {
    try {
      setIsLoading(true);

      if (itemSelected) {
        await updateMutation.mutateAsync({
          unitMeasureId: itemSelected.id,
          unitMeasureData: {
            name: data.name,
            abbreviation: data.abbreviation,
            isActive: data.active,
          },
        });

        toast.success('Unidad de medida actualizada exitosamente');
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          abbreviation: data.abbreviation,
          isActive: data.active,
        });

        toast.success('Unidad de medida creada exitosamente');
      }

      form.reset();
      setSheetOpen(false);
      setItemSelected(null);
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);
      toast.error('Ha ocurrido un error creando la unidad de medida');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!itemSelected) {
      form.setValue('name', '');
      form.setValue('abbreviation', '');
      form.setValue('active', true);
      return;
    }

    form.setValue('name', itemSelected.name);
    form.setValue('abbreviation', itemSelected.abbreviation);
    form.setValue('active', itemSelected.isActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemSelected]);

  return (
    <SheetContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <SheetHeader>
            <SheetTitle>
              {itemSelected ? 'Actualizar unidad de medida' : 'Nueva unidad de medida'}
            </SheetTitle>
            <SheetDescription>
              Ingresa la información de la unidad de medida y presiona guardar para
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
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input
                        id='name'
                        type='text'
                        placeholder='Ej: Botella, Litro, Unidad'
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
                name='abbreviation'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Abreviación</FormLabel>
                    <FormControl>
                      <Input
                        id='abbreviation'
                        type='text'
                        placeholder='Ej: bot, L, un'
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

export default NewUnitMeasure;
