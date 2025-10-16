'use client';

import React, { useState, useMemo } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  IconAlertCircle,
  IconInfoCircle,
  IconPackage,
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
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreateStockMovement } from '@/hooks/useStockMovement';
import { useProducts } from '@/hooks/useProducts';
import { StockMovementType } from '@/generated/prisma';
import { MovementTypeBadge } from './movement-type-badge';
import { ProductFilterCombobox } from '@/components/product-filter-combobox';

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
  reason: yup
    .string()
    .min(10, 'La razón debe tener al menos 10 caracteres')
    .required('La razón es requerida'),
  reference: yup.string().nullable().notRequired().defined(),
});

type MovementFormData = yup.InferType<typeof schema>;

interface MovementFormSheetProps {
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function MovementFormSheet({ setSheetOpen }: MovementFormSheetProps) {
  const createMutation = useCreateStockMovement();
  const { data: products } = useProducts({}, false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<MovementFormData>({
    criteriaMode: 'firstError',
    defaultValues: {
      productId: '',
      type: 'ADJUSTMENT',
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
        reason: data.reason,
        reference: data.reference || undefined,
      });

      toast.success('Ajuste de stock registrado exitosamente');

      form.reset();
      setSheetOpen(false);
    } catch (error) {
      console.error('Error creating stock movement:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Ha ocurrido un error registrando el ajuste de stock'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Get selected product
  const selectedProduct = useMemo(() => {
    const productId = form.watch('productId');
    return products?.find((p) => p.id === productId);
  }, [form.watch('productId'), products]);

  // Calculate projected stock
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

  // Warning for negative stock
  const showNegativeStockWarning = useMemo(() => {
    const type = form.watch('type');
    return (
      type === 'OUT' &&
      selectedProduct &&
      projectedStock !== null &&
      projectedStock < 0
    );
  }, [form.watch('type'), selectedProduct, projectedStock]);

  // Warning for zero stock
  const showZeroStockWarning = useMemo(() => {
    return (
      selectedProduct &&
      projectedStock !== null &&
      projectedStock === 0 &&
      form.watch('type') !== 'ADJUSTMENT'
    );
  }, [selectedProduct, projectedStock, form.watch('type')]);

  const selectedType = form.watch('type');

  return (
    <SheetContent className="flex flex-col p-0 gap-0 sm:max-w-xl overflow-hidden">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col h-full"
        >
          {/* Header */}
          <SheetHeader className="p-4 sm:p-6 pb-4 shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <IconPackage className="size-5" />
              Ajuste Manual de Stock
            </SheetTitle>
            <SheetDescription>
              Registra un ajuste manual de inventario. Este movimiento quedará
              registrado en el historial de auditoría.
            </SheetDescription>
          </SheetHeader>

          <Separator className="shrink-0" />

          {/* Content */}
          <ScrollArea className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6 space-y-6">
              {/* Product Selection */}
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ProductFilterCombobox
                        selectedProductId={field.value}
                        onProductSelect={(productId) => {
                          field.onChange(productId || '');
                        }}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Busca y selecciona el producto al que deseas ajustar el
                      stock
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Current Stock Display */}
              {selectedProduct && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <IconInfoCircle className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Stock Actual del Producto
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold font-mono">
                      {selectedProduct.currentStock}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      unidades
                    </span>
                  </div>
                  {selectedProduct.minStock && (
                    <div className="text-xs text-muted-foreground">
                      Stock mínimo: {selectedProduct.minStock} unidades
                    </div>
                  )}
                </div>
              )}

              {/* Adjustment Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Ajuste</FormLabel>
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
                        <SelectItem value="IN">
                          <div className="flex items-center gap-2">
                            <MovementTypeBadge type="IN" showIcon={true} />
                            <span className="text-xs text-muted-foreground">
                              - Aumenta el stock
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="OUT">
                          <div className="flex items-center gap-2">
                            <MovementTypeBadge type="OUT" showIcon={true} />
                            <span className="text-xs text-muted-foreground">
                              - Reduce el stock
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="ADJUSTMENT">
                          <div className="flex items-center gap-2">
                            <MovementTypeBadge
                              type="ADJUSTMENT"
                              showIcon={true}
                            />
                            <span className="text-xs text-muted-foreground">
                              - Establece valor exacto
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {selectedType === 'IN' &&
                        'Suma la cantidad al stock actual'}
                      {selectedType === 'OUT' &&
                        'Resta la cantidad del stock actual'}
                      {selectedType === 'ADJUSTMENT' &&
                        'Define el stock exacto (ignora el stock actual)'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedType === 'ADJUSTMENT'
                        ? 'Nuevo Stock'
                        : 'Cantidad'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="quantity"
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {selectedType === 'ADJUSTMENT'
                        ? 'El stock quedará en este valor exacto'
                        : `Unidades a ${
                            selectedType === 'IN' ? 'agregar' : 'restar'
                          }`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Stock Projection */}
              {selectedProduct && projectedStock !== null && (
                <div className="p-4 bg-primary/5 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Stock proyectado:
                    </span>
                    <Badge
                      variant={projectedStock < 0 ? 'destructive' : 'default'}
                      className={`font-mono text-base ${
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

                  {selectedType !== 'ADJUSTMENT' && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <IconInfoCircle className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        {selectedType === 'IN'
                          ? `${selectedProduct.currentStock} + ${
                              form.watch('quantity') || 0
                            } = ${projectedStock}`
                          : `${selectedProduct.currentStock} - ${
                              form.watch('quantity') || 0
                            } = ${projectedStock}`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Warnings */}
              {showNegativeStockWarning && (
                <Alert variant="destructive">
                  <IconAlertCircle className="size-4" />
                  <AlertDescription>
                    <strong>Stock negativo:</strong> Esta salida resultaría en
                    un stock negativo ({projectedStock} unidades). Por favor
                    verifica la cantidad antes de continuar.
                  </AlertDescription>
                </Alert>
              )}

              {showZeroStockWarning && (
                <Alert>
                  <IconAlertCircle className="size-4" />
                  <AlertDescription>
                    <strong>Advertencia:</strong> El stock quedará en cero
                    después de este movimiento.
                  </AlertDescription>
                </Alert>
              )}

              {/* Reason */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón del Ajuste</FormLabel>
                    <FormControl>
                      <Textarea
                        id="reason"
                        placeholder="Describe el motivo del ajuste de stock (mínimo 10 caracteres)"
                        rows={4}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Explica por qué se está realizando este ajuste manual.
                      Esta información quedará registrada en la auditoría.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reference */}
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
                    <FormDescription>
                      Documento o referencia externa relacionada con este
                      ajuste.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </ScrollArea>

          <Separator className="shrink-0" />

          {/* Footer */}
          <SheetFooter className="p-4 sm:p-6 pt-4 shrink-0">
            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full">
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
              </SheetClose>
              <Button
                type="submit"
                disabled={isLoading || showNegativeStockWarning}
                className="w-full sm:w-auto"
              >
                {isLoading ? 'Registrando...' : 'Registrar Ajuste'}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </Form>
    </SheetContent>
  );
}
