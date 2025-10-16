'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { NumberFormatValues, NumericFormat } from 'react-number-format';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  IconBolt,
  IconBuildingStore,
  IconCalendar,
  IconCash,
  IconCheck,
  IconPackage,
  IconMinus,
  IconPlus,
} from '@tabler/icons-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProductFilterCombobox } from '@/components/product-filter-combobox';

import { useStore } from '@/store';
import { useCreateSale } from '@/hooks/useSales';
import { useActiveProducts } from '@/hooks/useProducts';
import { useActiveStores } from '@/hooks/useStores';
import { useActivePaymentMethods } from '@/hooks/usePaymentMethods';

// Props interface
interface QuickSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Validation schema
const validationSchema = yup.object({
  storeId: yup.string().required('La tienda es requerida'),
  productId: yup.string().required('El producto es requerido'),
  quantity: yup
    .number()
    .required('La cantidad es requerida')
    .min(1, 'La cantidad mínima es 1')
    .integer('La cantidad debe ser un número entero'),
  unitPrice: yup
    .number()
    .required('El precio es requerido')
    .min(0.01, 'El precio debe ser mayor a 0')
    .test('max-decimals', 'Máximo 2 decimales', function (value) {
      if (!value) return true;
      return /^\d+(\.\d{1,2})?$/.test(value.toString());
    }),
});

type QuickSaleFormData = yup.InferType<typeof validationSchema>;

/**
 * QuickSaleDialog - Modal for rapid single-product cash sales
 *
 * This component provides a streamlined interface for registering quick sales with:
 * - Auto-selected store (for users with storeId) or store selector (for admins)
 * - Product search with stock validation
 * - Editable quantity and unit price
 * - Auto-calculated totals (subtotal, tax, total)
 * - Fixed payment method (CASH) and status (PAID)
 *
 * @param open - Controls dialog visibility
 * @param onOpenChange - Callback when dialog open state changes
 * @param onSuccess - Optional callback on successful sale creation
 */
export function QuickSaleDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickSaleDialogProps) {
  // Get user data from Zustand store
  const user = useStore((state) => state.user);

  // Fetch data with hooks
  const { data: products } = useActiveProducts();
  const { data: stores, isLoading: isLoadingStores } = useActiveStores();
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } =
    useActivePaymentMethods();
  const createSaleMutation = useCreateSale();

  // Local state for selected product details
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    price: number;
    stock: number;
    image: string | null;
    sku: string | null;
  } | null>(null);

  // Get store name for display
  const storeName = useMemo(() => {
    if (!user?.storeId || !stores) return 'Tienda Principal';
    const store = stores.find((s) => s.id === user.storeId);
    return store?.name || 'Tienda Principal';
  }, [user?.storeId, stores]);

  // Determine if user can select store (ADMIN without storeId)
  const showStoreSelector = useMemo(() => {
    return user?.role === 'ADMIN' && !user.storeId;
  }, [user]);

  // Initialize form with React Hook Form
  const form = useForm<QuickSaleFormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      storeId: user?.storeId || '',
      productId: '',
      quantity: 1,
      unitPrice: 0,
    },
    mode: 'onChange',
  });

  // Watch form values for calculations
  const quantity = form.watch('quantity');
  const unitPrice = form.watch('unitPrice');
  const productId = form.watch('productId');

  // Calculate totals (subtotal, tax, total)
  const totals = useMemo(() => {
    const subtotal = quantity * unitPrice;
    const tax = subtotal * 0; // 0% IVA as per spec
    const total = subtotal + tax;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  }, [quantity, unitPrice]);

  // Handle product selection
  const handleProductSelect = (productId: string | undefined) => {
    if (!productId) {
      setSelectedProduct(null);
      form.setValue('productId', '');
      form.setValue('unitPrice', 0);
      return;
    }

    // Find product from loaded products
    const product = products?.find((p) => p.id === productId);

    if (!product) {
      toast.error('Producto no encontrado');
      return;
    }

    // Check if product has stock
    if (product.currentStock <= 0) {
      toast.error('Producto sin stock disponible');
      return;
    }

    // Set product details
    setSelectedProduct({
      id: product.id,
      name: product.name,
      price: product.salePrice,
      stock: product.currentStock,
      image: product.image,
      sku: product.sku,
    });

    // Update form values
    form.setValue('productId', product.id, { shouldValidate: true });
    form.setValue('unitPrice', product.salePrice, { shouldValidate: true });

    // Show warning if stock is low
    if (product.currentStock <= 5) {
      toast.warning(`Stock bajo: Solo quedan ${product.currentStock} unidades`);
    }
  };

  // Handle quantity increment
  const handleIncrement = () => {
    const currentQuantity = form.getValues('quantity');
    const maxStock = selectedProduct?.stock || 999;
    const newQuantity = Math.min(currentQuantity + 1, maxStock);
    form.setValue('quantity', newQuantity);
  };

  // Handle quantity decrement
  const handleDecrement = () => {
    const currentQuantity = form.getValues('quantity');
    const newQuantity = Math.max(currentQuantity - 1, 1);
    form.setValue('quantity', newQuantity);
  };

  // Handle form submission
  const onSubmit = async (data: QuickSaleFormData) => {
    try {
      // 1. Get CASH payment method ID
      const cashPaymentMethod = paymentMethods?.find(
        (pm) => pm.type === 'CASH' && pm.isActive && !pm.isDeleted
      );

      if (!cashPaymentMethod) {
        toast.error(
          'No se encontró el método de pago en efectivo. Por favor, configúrelo primero.'
        );
        return;
      }

      // 2. Validate user data
      if (!user?.id) {
        toast.error('Usuario no identificado');
        return;
      }

      // 3. Validate stock one more time before submission
      if (selectedProduct && data.quantity > selectedProduct.stock) {
        toast.error(
          `Stock insuficiente. Disponible: ${selectedProduct.stock} unidades`
        );
        return;
      }

      // 4. Build the payload
      const payload = {
        saleData: {
          storeId: data.storeId,
          customerId: null,
          userId: user.id,
          saleDate: new Date(),
          status: 'PAID' as const,
          dueDate: null,
          paidDate: new Date(),
          subtotal: totals.total,
          total: totals.total,
          notes: 'Venta rápida',
        },
        saleItems: [
          {
            productId: data.productId,
            unitMeasureId: null,
            quantity: data.quantity,
            unitPrice: data.unitPrice,
            subtotal: totals.total,
          },
        ],
        salePayments: [
          {
            paymentMethodId: cashPaymentMethod.id,
            amount: totals.total,
            paymentDate: new Date(),
            reference: null,
            notes: null,
          },
        ],
      };

      // 5. Call createSale mutation
      await createSaleMutation.mutateAsync(payload);

      // 6. Show success toast
      toast.success('Venta registrada exitosamente');

      // 7. Close modal
      onOpenChange(false);

      // 8. Call onSuccess callback
      onSuccess?.();
    } catch (error) {
      // Handle errors
      console.error('Error creating quick sale:', error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al registrar la venta. Por favor, intente nuevamente.';

      toast.error(errorMessage);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      form.reset({
        storeId: user?.storeId || '',
        productId: '',
        quantity: 1,
        unitPrice: 0,
      });
      setSelectedProduct(null);
    }
  }, [open, form, user?.storeId]);

  // Current date/time formatted for display
  const currentDateTime = format(new Date(), 'dd/MM/yyyy HH:mm', {
    locale: es,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header Section */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconBolt className="h-5 w-5 text-primary" />
            Venta Rápida
          </DialogTitle>
          <DialogDescription>
            Registra una venta al contado de forma rápida
          </DialogDescription>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Read-Only Information Section */}
          <div className="space-y-3">
            {/* Store Field - Selector for ADMIN without storeId, Badge for others */}
            {showStoreSelector ? (
              <div className="space-y-2">
                <Label
                  htmlFor="store-select"
                  className="flex items-center gap-1"
                >
                  <IconBuildingStore className="h-4 w-4" />
                  Tienda
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.watch('storeId')}
                  onValueChange={(value) =>
                    form.setValue('storeId', value, { shouldValidate: true })
                  }
                  disabled={isLoadingStores}
                >
                  <SelectTrigger
                    id="store-select"
                    className="w-full"
                    aria-label="Seleccionar tienda"
                    aria-required="true"
                  >
                    <SelectValue
                      placeholder={
                        isLoadingStores
                          ? 'Cargando tiendas...'
                          : 'Selecciona una tienda'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {stores?.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.storeId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.storeId.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-muted-foreground">
                  <IconBuildingStore className="h-4 w-4" />
                  Tienda
                </Label>
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                  <IconBuildingStore className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{storeName}</span>
                </div>
              </div>
            )}

            {/* Date and Status Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Current Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-muted-foreground">
                  <IconCalendar className="h-4 w-4" />
                  Fecha
                </Label>
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                  <span className="text-sm">{currentDateTime}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Estado</Label>
                <div className="flex items-center">
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                  >
                    <IconCheck className="h-3 w-3 mr-1" />
                    Pagada
                  </Badge>
                </div>
              </div>
            </div>

            {/* Payment Method Badge */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Método de Pago</Label>
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                <IconCash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Efectivo</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Editable Fields Section */}
          <div className="space-y-4">
            {/* Product Search */}
            <div className="space-y-2">
              <ProductFilterCombobox
                selectedProductId={productId}
                onProductSelect={handleProductSelect}
                className="w-full"
              />
              {form.formState.errors.productId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.productId.message}
                </p>
              )}
              {selectedProduct && selectedProduct.stock <= 5 && (
                <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <IconPackage className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    Stock bajo. Solo quedan {selectedProduct.stock} unidades
                  </p>
                </div>
              )}
            </div>

            {/* Quantity and Unit Price Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Quantity Input with Spinners */}
              <div className="space-y-2">
                <Label htmlFor="quantity" className="flex items-center gap-1">
                  Cantidad
                  <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    className="h-9 w-9 shrink-0"
                    aria-label="Disminuir cantidad"
                  >
                    <IconMinus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={selectedProduct?.stock || 999}
                    {...form.register('quantity', { valueAsNumber: true })}
                    className="text-center"
                    aria-label="Cantidad de productos"
                    aria-required="true"
                    aria-describedby={
                      form.formState.errors.quantity
                        ? 'quantity-error'
                        : undefined
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleIncrement}
                    disabled={
                      selectedProduct
                        ? quantity >= selectedProduct.stock
                        : false
                    }
                    className="h-9 w-9 shrink-0"
                    aria-label="Aumentar cantidad"
                  >
                    <IconPlus className="h-4 w-4" />
                  </Button>
                </div>
                {form.formState.errors.quantity && (
                  <p id="quantity-error" className="text-sm text-destructive">
                    {form.formState.errors.quantity.message}
                  </p>
                )}
              </div>

              {/* Unit Price Input */}
              <div className="space-y-2">
                <Label htmlFor="unitPrice" className="flex items-center gap-1">
                  Precio Unitario
                  <span className="text-destructive">*</span>
                </Label>
                <NumericFormat
                  id="unitPrice"
                  value={unitPrice}
                  onValueChange={(values: NumberFormatValues) => {
                    form.setValue('unitPrice', values.floatValue ?? 0, {
                      shouldValidate: true,
                    });
                  }}
                  customInput={Input}
                  placeholder="$0.00"
                  prefix="$"
                  thousandSeparator=","
                  decimalSeparator="."
                  decimalScale={2}
                  fixedDecimalScale
                  allowNegative={false}
                  className="w-full"
                  aria-label="Precio unitario del producto"
                  aria-required="true"
                  aria-describedby={
                    form.formState.errors.unitPrice
                      ? 'unitPrice-error'
                      : undefined
                  }
                />
                {form.formState.errors.unitPrice && (
                  <p id="unitPrice-error" className="text-sm text-destructive">
                    {form.formState.errors.unitPrice.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Totals Section */}
          <div className="rounded-md border bg-muted/30 p-4 space-y-2">
            <h3 className="text-sm font-semibold mb-3">Resumen de Totales</h3>

            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">
                $
                {totals.subtotal.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* IVA */}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>IVA (0%):</span>
              <span>
                $
                {totals.tax.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <Separator />

            {/* Total */}
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">
                $
                {totals.total.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none"
              disabled={
                form.formState.isSubmitting || createSaleMutation.isPending
              }
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                !form.formState.isValid ||
                form.formState.isSubmitting ||
                createSaleMutation.isPending ||
                isLoadingPaymentMethods
              }
              className="flex-1 sm:flex-none"
            >
              {form.formState.isSubmitting || createSaleMutation.isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Registrando...
                </>
              ) : (
                <>
                  <IconCheck className="h-4 w-4 mr-2" />
                  Registrar Venta
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
