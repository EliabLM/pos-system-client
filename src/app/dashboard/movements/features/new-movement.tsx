import React, { useState, useMemo } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  IconArrowUp,
  IconArrowDown,
  IconAdjustments,
  IconAlertCircle,
  IconInfoCircle,
} from '@tabler/icons-react';

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
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreateStockMovement } from '@/hooks/useStockMovement';
import { useActiveProducts } from '@/hooks/useProducts';
import { StockMovementType } from '@/generated/prisma';

const schema = yup.object().shape({
  productId: yup.string().required('El producto es requerido'),
  type: yup
    .string()
    .oneOf(['IN', 'OUT', 'ADJUSTMENT'], 'Tipo de movimiento inválido')
    .required('El tipo de movimiento es requerido'),
  quantity: yup
    .number()
    .min(1, 'La cantidad debe ser mayor a 0')
    .required('La cantidad es requerida'),
  reason: yup.string().nullable().notRequired().defined(),
  reference: yup.string().nullable().notRequired().defined(),
});

type MovementFormData = yup.InferType<typeof schema>;

const NewMovement = ({
  setSheetOpen,
}: {
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const createMutation = useCreateStockMovement();
  const products = useActiveProducts();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<MovementFormData>({
    criteriaMode: 'firstError',
    defaultValues: {
      productId: '',
      type: 'IN',
      quantity: 1,
      reason: '',
      reference: '',
    },
    mode: 'all',
    reValidateMode: 'onChange',
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: MovementFormData) => {
    try {
      setIsLoading(true);

      await createMutation.mutateAsync({
        productId: data.productId,
        type: data.type as StockMovementType,
        quantity: data.quantity,
        reason: data.reason || undefined,
        reference: data.reference || undefined,
      });

      toast.success('Movimiento de stock creado exitosamente');

      form.reset();
      setSheetOpen(false);
    } catch (error) {
      console.error('Error creating stock movement:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Ha ocurrido un error creando el movimiento de stock'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const movementTypes = [
    {
      value: 'IN',
      label: 'Entrada',
      icon: <IconArrowUp className="size-4" />,
      color: 'text-green-600',
    },
    {
      value: 'OUT',
      label: 'Salida',
      icon: <IconArrowDown className="size-4" />,
      color: 'text-red-600',
    },
    {
      value: 'ADJUSTMENT',
      label: 'Ajuste',
      icon: <IconAdjustments className="size-4" />,
      color: 'text-blue-600',
    },
  ];

  // Calculate projected stock
  const selectedProduct = useMemo(() => {
    const productId = form.watch('productId');
    return products.data?.find((p) => p.id === productId);
  }, [form.watch('productId'), products.data]);

  const projectedStock = useMemo(() => {
    const type = form.watch('type');
    const quantity = form.watch('quantity') || 0;

    if (!selectedProduct) return null;

    const currentStock = selectedProduct.currentStock;

    switch (type) {
      case 'IN':
        return currentStock + quantity;
      case 'OUT':
        return currentStock - quantity;
      case 'ADJUSTMENT':
        return quantity;
      default:
        return currentStock;
    }
  }, [form.watch('type'), form.watch('quantity'), selectedProduct]);

  const showLowStockWarning = useMemo(() => {
    const type = form.watch('type');
    return (
      type === 'OUT' &&
      selectedProduct &&
      projectedStock !== null &&
      projectedStock < 0
    );
  }, [form.watch('type'), selectedProduct, projectedStock]);

  return (
    <SheetContent className="overflow-y-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <SheetHeader>
            <SheetTitle>Nuevo movimiento de inventario</SheetTitle>
            <SheetDescription>
              Registra un movimiento de inventario. Los movimientos son
              permanentes y no se pueden editar una vez creados.
            </SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 auto-rows-min gap-6 px-4 py-6">
            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Producto</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={products.isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un producto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.data?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} (Stock: {product.currentStock})
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de movimiento</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {movementTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <span className={type.color}>{type.icon}</span>
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === 'IN' && 'Aumenta el stock del producto'}
                      {field.value === 'OUT' && 'Reduce el stock del producto'}
                      {field.value === 'ADJUSTMENT' &&
                        'Establece el stock a un valor exacto'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad</FormLabel>
                    <FormControl>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        placeholder="0"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
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
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        id="reason"
                        placeholder="Describe el motivo del movimiento"
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
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referencia (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        id="reference"
                        type="text"
                        placeholder="Número de factura, orden, etc."
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Stock Preview */}
            {selectedProduct && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Stock actual:</span>
                    <Badge variant="outline" className="font-mono">
                      {selectedProduct.currentStock} unidades
                    </Badge>
                  </div>

                  {projectedStock !== null && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Stock proyectado:
                        </span>
                        <Badge
                          variant={
                            projectedStock < 0 ? 'destructive' : 'default'
                          }
                          className={`font-mono ${
                            projectedStock > selectedProduct.currentStock
                              ? 'bg-green-500 hover:bg-green-600 text-white'
                              : projectedStock < selectedProduct.currentStock &&
                                projectedStock >= 0
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : ''
                          }`}
                        >
                          {projectedStock} unidades
                        </Badge>
                      </div>

                      {form.watch('type') !== 'ADJUSTMENT' && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <IconInfoCircle className="size-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {form.watch('type') === 'IN'
                              ? `Se agregarán ${
                                  form.watch('quantity') || 0
                                } unidades`
                              : `Se restarán ${
                                  form.watch('quantity') || 0
                                } unidades`}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Low Stock Warning */}
            {showLowStockWarning && (
              <Alert variant="destructive">
                <IconAlertCircle className="size-4" />
                <AlertDescription>
                  <strong>Stock insuficiente:</strong> La salida resultaría en
                  un stock negativo ({projectedStock} unidades). Verifica la
                  cantidad antes de continuar.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <SheetFooter className="mt-6">
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancelar
              </Button>
            </SheetClose>
            <Button
              type="submit"
              disabled={isLoading || products.isLoading || showLowStockWarning}
            >
              {isLoading ? 'Registrando...' : 'Registrar movimiento'}
            </Button>
          </SheetFooter>
        </form>
      </Form>
    </SheetContent>
  );
};

export default NewMovement;
