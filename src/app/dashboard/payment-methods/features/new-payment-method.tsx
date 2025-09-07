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
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
} from '@/hooks/usePaymentMethods';
import { PaymentMethod, PaymentType } from '@/generated/prisma';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const OPTIONS = [
  {
    label: 'Tarjeta',
    value: PaymentType.CARD,
  },
  {
    label: 'Efectivo',
    value: PaymentType.CASH,
  },
  {
    label: 'Cheque',
    value: PaymentType.CHECK,
  },
  {
    label: 'Crédito',
    value: PaymentType.CREDIT,
  },
  {
    label: 'Transferencia',
    value: PaymentType.TRANSFER,
  },
  {
    label: 'Otro',
    value: PaymentType.OTHER,
  },
];

const schema = yup.object().shape({
  name: yup
    .string()
    .min(3, 'Debe ingresar mínimo 3 caracteres')
    .required('El nombre es requerido'),
  type: yup
    .string<PaymentType>()
    .nullable()
    .required('El tipo de método de pago es requerido'),
  active: yup.bool().default(true),
});

type PaymentMethodFormData = yup.InferType<typeof schema>;

const NewPaymentMethod = ({
  setSheetOpen,
  itemSelected,
  setItemSelected,
}: {
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<React.SetStateAction<PaymentMethod | null>>;
  itemSelected: PaymentMethod | null;
}) => {
  const createMutation = useCreatePaymentMethod();
  const updateMutation = useUpdatePaymentMethod();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PaymentMethodFormData>({
    criteriaMode: 'firstError',
    defaultValues: {
      name: itemSelected?.name ?? '',
      type: itemSelected?.type,
      active: itemSelected?.isActive ?? true,
    },
    mode: 'all',
    reValidateMode: 'onChange',
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: PaymentMethodFormData) => {
    try {
      setIsLoading(true);

      if (itemSelected) {
        await updateMutation.mutateAsync({
          paymentMethodId: itemSelected.id,
          updateData: {
            name: data.name,
            isActive: data.active,
            type: data.type,
          },
        });

        toast.success('Método de pago actualizado exitosamente');
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          type: data.type,
          isActive: data.active,
        });

        toast.success('Método de pago creado exitosamente');
      }

      form.reset();
      setSheetOpen(false);
      setItemSelected(null);
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);
      toast.error('Ha ocurrido un error creando el método de pago');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!itemSelected) {
      form.setValue('name', '');
      form.resetField('type');
      form.setValue('active', true);
      return;
    }

    form.setValue('name', itemSelected.name);
    form.setValue('type', itemSelected.type);
    form.setValue('active', itemSelected.isActive);
  }, [itemSelected]);

  return (
    <SheetContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <SheetHeader>
            <SheetTitle>
              {itemSelected
                ? 'Actualizar método de pago'
                : 'Nuevo método de pago'}
            </SheetTitle>
            <SheetDescription>
              Ingresa la información del método de pago y presiona guardar para
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de método de pago</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo de método de pago" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OPTIONS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

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

export default NewPaymentMethod;
