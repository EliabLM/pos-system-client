'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  useCreateStockAdjustment,
  useCreateStockIn,
  useCreateStockOut,
} from '@/hooks/useStockMovement';
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconPackage,
} from '@tabler/icons-react';

const schema = yup.object().shape({
  adjustmentType: yup
    .string()
    .oneOf(['increase', 'decrease', 'set'], 'Tipo de ajuste inválido')
    .required('El tipo de ajuste es requerido'),
  quantity: yup
    .number()
    .typeError('Debe ingresar un valor válido')
    .required('La cantidad es requerida')
    .positive('Solo se permite ingresar números positivos')
    .integer('Solo se permite ingresar números enteros'),
  reason: yup.string().required('La razón del ajuste es requerida'),
  reference: yup.string().nullable().notRequired().defined(),
});

type FormData = yup.InferType<typeof schema>;

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  currentStock: number;
  onSuccess?: () => void;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  productId,
  productName,
  currentStock,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const createAdjustment = useCreateStockAdjustment();
  const createStockIn = useCreateStockIn();
  const createStockOut = useCreateStockOut();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    criteriaMode: 'firstError',
    defaultValues: {
      adjustmentType: 'increase',
      quantity: 0,
      reason: '',
      reference: '',
    },
    mode: 'all',
    reValidateMode: 'onChange',
    resolver: yupResolver(schema),
  });

  const adjustmentType = form.watch('adjustmentType');
  const quantity = form.watch('quantity') || 0;

  // Calculate new stock based on adjustment type
  const calculateNewStock = () => {
    switch (adjustmentType) {
      case 'increase':
        return currentStock + quantity;
      case 'decrease':
        return currentStock - quantity;
      case 'set':
        return quantity;
      default:
        return currentStock;
    }
  };

  const newStock = calculateNewStock();
  const stockDifference = newStock - currentStock;
  const hasInvalidDecrease =
    adjustmentType === 'decrease' && quantity > currentStock;

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);

      let adjustmentQuantity: number = data.quantity;

      if (data.adjustmentType === 'increase') {
        await createStockIn.mutateAsync({
          productId,
          quantity: adjustmentQuantity,
          reason: data.reason,
          reference: data.reference || undefined,
        });
      }

      if (data.adjustmentType === 'decrease') {
        await createStockOut.mutateAsync({
          productId,
          quantity: adjustmentQuantity,
          reason: data.reason,
          reference: data.reference || undefined,
        });
      }

      if (data.adjustmentType === 'set') {
        await createAdjustment.mutateAsync({
          productId,
          quantity: adjustmentQuantity,
          reason: data.reason,
          reference: data.reference || undefined,
        });
      }

      toast.success('Ajuste de stock realizado exitosamente');
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error al realizar ajuste de stock:', error);
      toast.error('Ha ocurrido un error al realizar el ajuste de stock');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconPackage className="h-5 w-5" />
            Ajustar Inventario
          </DialogTitle>
          <DialogDescription>
            Realizar ajuste de inventario para: <strong>{productName}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Stock Info */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Stock actual</span>
              <Badge variant="secondary" className="text-base font-mono">
                {currentStock} unidades
              </Badge>
            </div>

            {/* Adjustment Type */}
            <FormField
              control={form.control}
              name="adjustmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de ajuste *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo de ajuste" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="increase">Aumentar stock</SelectItem>
                      <SelectItem value="decrease">Disminuir stock</SelectItem>
                      <SelectItem value="set">
                        Establecer stock exacto
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
                    {adjustmentType === 'set' ? 'Nuevo stock *' : 'Cantidad *'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={
                        adjustmentType === 'set'
                          ? 'Ingresa el stock final'
                          : 'Cantidad a ajustar'
                      }
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

            {/* Stock Preview */}
            {quantity > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      Stock después del ajuste
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={newStock < 0 ? 'destructive' : 'default'}
                        className="text-lg font-mono"
                      >
                        {newStock} unidades
                      </Badge>
                      {stockDifference !== 0 && (
                        <span
                          className={`text-sm font-medium ${
                            stockDifference > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {stockDifference > 0 ? '+' : ''}
                          {stockDifference}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {hasInvalidDecrease && (
                  <Alert variant="destructive">
                    <IconAlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No puedes disminuir más unidades de las disponibles en
                      stock
                    </AlertDescription>
                  </Alert>
                )}

                {newStock < 0 && (
                  <Alert variant="destructive">
                    <IconAlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      El stock final no puede ser negativo
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón del ajuste *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Corrección de inventario físico, producto dañado, etc."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
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
                      type="text"
                      placeholder="Ej: Ticket #12345, Inventario mensual"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert>
              <IconInfoCircle className="h-4 w-4" />
              <AlertDescription>
                Este ajuste quedará registrado en el historial de movimientos de
                stock
              </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || hasInvalidDecrease || newStock < 0}
              >
                {isLoading ? 'Guardando...' : 'Confirmar Ajuste'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
