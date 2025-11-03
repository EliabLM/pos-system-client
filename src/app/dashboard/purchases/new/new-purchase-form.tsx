'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm, Control } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  IconArrowLeft,
  IconTrash,
  IconPlus,
  IconSearch,
  IconShoppingCart,
  IconFileInvoice,
  IconCalendar,
  IconAlertCircle,
  IconCheck,
  IconTruck,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { NumberFormatValues, NumericFormat } from 'react-number-format';
import { parseLocalDateTime, formatDateTimeLocal } from '@/lib/date-utils';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useStore } from '@/store';
import { useActiveProducts } from '@/hooks/useProducts';
import { useCreatePurchase, useReceivePurchase } from '@/hooks/usePurchases';
import type { Product } from '@/generated/prisma';

import SupplierCombobox from './features/supplier-combobox';
import CreateSupplierDialog from './features/create-supplier-dialog';
import CreateProductDialog from './features/create-product-dialog';

// Tipo extendido de Product con relaciones
type ProductWithRelations = Product & {
  unitMeasure?: { id: string; name: string; abbreviation: string } | null;
  brand?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
};

// Esquema de validación con Yup
const schema = yup.object().shape({
  purchaseDate: yup
    .string()
    .required('La fecha de compra es requerida')
    .test('is-valid-date', 'Fecha inválida', (value) => {
      if (!value) return false;
      const date = new Date(value);
      return !isNaN(date.getTime());
    })
    .test('not-future', 'La fecha no puede ser futura', (value) => {
      if (!value) return false;
      const date = new Date(value);
      const now = new Date();
      return date <= now;
    }),
  notes: yup.string().nullable().notRequired().defined(),
});

type PurchaseFormData = yup.InferType<typeof schema>;

// Tipos locales para el formulario
interface SelectedProduct {
  productId: string;
  product: ProductWithRelations;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export default function NewPurchaseForm() {
  const router = useRouter();
  const user = useStore((state) => state.user);
  const organizationId = user?.organizationId || '';
  const createPurchaseMutation = useCreatePurchase();
  const receivePurchaseMutation = useReceivePurchase();

  // Estado para productos seleccionados
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Estado para proveedor
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null
  );
  const [createSupplierDialogOpen, setCreateSupplierDialogOpen] =
    useState(false);
  const [createProductDialogOpen, setCreateProductDialogOpen] = useState(false);

  const products = useActiveProducts({ search: debouncedSearchTerm });

  const form = useForm({
    resolver: yupResolver(schema),
    criteriaMode: 'firstError' as const,
    defaultValues: {
      purchaseDate: formatDateTimeLocal(new Date()),
      notes: null as string | null,
    },
    mode: 'all' as const,
    reValidateMode: 'onChange' as const,
  });

  // Cálculo de totales
  const totals = useMemo(() => {
    const subtotal = selectedProducts.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    return { subtotal, total: subtotal };
  }, [selectedProducts]);

  // Agregar producto seleccionado
  const handleAddProduct = (product: ProductWithRelations) => {
    const existing = selectedProducts.find((p) => p.productId === product.id);

    if (existing) {
      toast.info(
        `${product.name} ya está agregado. Modifica la cantidad si deseas.`
      );
      return;
    }

    const newProduct: SelectedProduct = {
      productId: product.id,
      product,
      quantity: 1,
      unitPrice: product.costPrice ?? 0,
      subtotal: product.costPrice ?? 0,
    };

    setSelectedProducts((prev) => [...prev, newProduct]);
    setSearchTerm('');
    toast.success(`${product.name} agregado a la compra`);
  };

  // Actualizar cantidad de producto
  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    setSelectedProducts((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const quantity = Math.max(1, newQuantity);
          return {
            ...item,
            quantity,
            subtotal: quantity * item.unitPrice,
          };
        }
        return item;
      })
    );
  };

  // Actualizar precio unitario
  const handleUpdatePrice = (productId: string, newPrice: number) => {
    setSelectedProducts((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const unitPrice = Math.max(0, newPrice);
          return {
            ...item,
            unitPrice,
            subtotal: item.quantity * unitPrice,
          };
        }
        return item;
      })
    );
  };

  // Eliminar producto
  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.filter((item) => item.productId !== productId)
    );
  };

  // Handler para cuando se crea un nuevo proveedor
  const handleSupplierCreated = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    toast.success('Proveedor seleccionado para esta compra');
  };

  // Submit del formulario
  const onSubmit = async (data: PurchaseFormData, shouldReceive: boolean) => {
    if (!selectedSupplierId) {
      toast.error('Debes seleccionar un proveedor');
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error('Debes agregar al menos un producto a la compra');
      return;
    }

    if (!user) {
      toast.error('Usuario no autenticado');
      return;
    }

    try {
      const purchaseItems = selectedProducts.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      }));

      const purchaseData = {
        supplierId: selectedSupplierId,
        organizationId,
        purchaseDate: parseLocalDateTime(data.purchaseDate),
        notes: data.notes || null,
        total: totals.total,
        status: 'PENDING' as const,
        receivedDate: null,
      };

      const purchase = await createPurchaseMutation.mutateAsync({
        purchaseData,
        purchaseItems,
      });

      // Si se eligió "Guardar y Recibir", recibir la compra inmediatamente
      if (shouldReceive && purchase) {
        await receivePurchaseMutation.mutateAsync({
          purchaseId: purchase.id,
        });
        toast.success(
          'Compra creada y recibida correctamente. Inventario actualizado.'
        );
      } else {
        toast.success('Compra creada exitosamente');
      }

      router.push('/dashboard/purchases');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al crear la compra'
      );
    }
  };

  // Handlers para los botones de submit
  const handleSaveAsPending = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      const data = form.getValues();
      await onSubmit(data, false);
    }
  };

  const handleSaveAndReceive = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      const data = form.getValues();
      await onSubmit(data, true);
    }
  };

  // Efectos
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const isProcessing =
    createPurchaseMutation.isPending || receivePurchaseMutation.isPending;

  return (
    <Form {...form}>
      <form className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={'/dashboard/purchases'}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Volver a la lista de compras"
          >
            <IconArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <IconFileInvoice className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">
              Crear Nueva Orden de Compra
            </h1>
          </div>
        </div>

        {/* Purchase Details Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconFileInvoice className="h-5 w-5 text-primary" />
              Información de la Compra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control as unknown as Control<PurchaseFormData>}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <IconCalendar className="h-4 w-4" />
                      Fecha de Compra
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="purchaseDate"
                        type="datetime-local"
                        aria-label="Seleccionar fecha de compra"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Supplier Selection Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconTruck className="h-5 w-5 text-primary" />
              Proveedor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <SupplierCombobox
                  value={selectedSupplierId}
                  onValueChange={setSelectedSupplierId}
                  onCreateClick={() => setCreateSupplierDialogOpen(true)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateSupplierDialogOpen(true)}
                className="flex-shrink-0"
              >
                <IconPlus className="h-4 w-4 mr-2" />
                Crear Proveedor
              </Button>
            </div>
            {selectedSupplierId && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-sm">
                <IconTruck className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-blue-900 dark:text-blue-100">
                  Esta compra se asociará con el proveedor seleccionado. Puedes
                  cambiar o quitar el proveedor en cualquier momento.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconShoppingCart className="h-5 w-5 text-primary" />
              Productos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Search */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label
                  htmlFor="product-search"
                  className="flex items-center gap-1"
                >
                  <IconSearch className="h-4 w-4" />
                  Buscar Productos
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateProductDialogOpen(true)}
                >
                  <IconPlus className="h-4 w-4 mr-2" />
                  Crear Producto
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="product-search"
                  className="w-full pl-9"
                  placeholder="Buscar producto por nombre, código o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Buscar productos"
                  aria-describedby="search-hint"
                />
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <p
                id="search-hint"
                className="text-xs text-muted-foreground mt-1"
              >
                Escribe para buscar productos disponibles
              </p>

              {/* Search Loading State */}
              {products.isFetching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground my-2">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Buscando productos...
                </div>
              )}

              {/* Search Results */}
              {!products.isFetching &&
                products.data &&
                products.data.length > 0 && (
                  <ScrollArea className="h-64 border rounded-lg mt-2 bg-muted/30">
                    <div
                      className="p-2 space-y-1"
                      role="list"
                      aria-label="Resultados de búsqueda"
                    >
                      {products.data.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          className="flex items-center justify-between gap-2 w-full p-3 hover:bg-muted rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                          aria-label={`Agregar ${product.name} a la compra`}
                          role="listitem"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Image
                              className="rounded-md object-cover flex-shrink-0 border"
                              src={product.image ?? '/placeholder-product.png'}
                              alt=""
                              width={40}
                              height={40}
                            />
                            <div className="text-left min-w-0">
                              <p className="font-medium truncate">
                                {product.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {product.sku && (
                                  <span className="mr-2">
                                    SKU: {product.sku}
                                  </span>
                                )}
                                <span className="mr-2">
                                  Costo:{' '}
                                  {new Intl.NumberFormat('es-CO', {
                                    style: 'currency',
                                    currency: 'COP',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(product.costPrice ?? 0)}
                                </span>
                                <span className="text-muted-foreground">
                                  Stock: {product.currentStock}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="font-semibold text-sm">
                              {new Intl.NumberFormat('es-CO', {
                                style: 'currency',
                                currency: 'COP',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(product.costPrice ?? 0)}
                            </span>
                            <IconPlus className="h-4 w-4 text-primary" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}

              {/* Empty State */}
              {!products.isFetching &&
                searchTerm &&
                products.data?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <IconSearch className="h-12 w-12 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No se encontraron productos</p>
                    <p className="text-xs">
                      Intenta con otro término de búsqueda
                    </p>
                  </div>
                )}
            </div>

            {/* Selected Products List */}
            {selectedProducts.length > 0 ? (
              <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <IconShoppingCart className="h-4 w-4" />
                    Productos Seleccionados ({selectedProducts.length})
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Total:{' '}
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      minimumFractionDigits: 0,
                    }).format(totals.subtotal)}
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedProducts.map((item, index) => (
                    <div
                      key={item.productId}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-background rounded-lg border"
                    >
                      <Image
                        className="rounded-md object-cover flex-shrink-0 border"
                        src={item.product.image ?? '/placeholder-product.png'}
                        alt=""
                        width={50}
                        height={50}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.product.sku && (
                            <span className="mr-2">
                              SKU: {item.product.sku}
                            </span>
                          )}
                          • Stock actual: {item.product.currentStock}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                        <div className="flex flex-col gap-1 w-20">
                          <Label
                            htmlFor={`quantity-${index}`}
                            className="text-xs"
                          >
                            Cantidad
                          </Label>
                          <Input
                            id={`quantity-${index}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(
                                item.productId,
                                Number(e.target.value)
                              )
                            }
                            className="w-20 h-9"
                            aria-label={`Cantidad de ${item.product.name}`}
                          />
                        </div>
                        <div className="flex flex-col gap-1 w-28">
                          <Label htmlFor={`price-${index}`} className="text-xs">
                            Precio Unit.
                          </Label>
                          <NumericFormat
                            id={`price-${index}`}
                            value={item.unitPrice}
                            onValueChange={(values: NumberFormatValues) => {
                              handleUpdatePrice(
                                item.productId,
                                values.floatValue ?? 0
                              );
                            }}
                            customInput={Input}
                            placeholder="$0"
                            prefix="$"
                            thousandSeparator="."
                            decimalSeparator=","
                            className="w-28 h-9"
                            aria-label={`Precio unitario de ${item.product.name}`}
                          />
                        </div>
                        <div className="flex flex-col gap-1 w-28">
                          <Label className="text-xs">Subtotal</Label>
                          <p className="font-semibold text-sm h-9 flex items-center">
                            {new Intl.NumberFormat('es-CO', {
                              style: 'currency',
                              currency: 'COP',
                              minimumFractionDigits: 0,
                            }).format(item.subtotal)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProduct(item.productId)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9"
                          aria-label={`Eliminar ${item.product.name} de la compra`}
                        >
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                <IconShoppingCart className="h-16 w-16 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No hay productos agregados</p>
                <p className="text-sm">
                  Busca y selecciona productos para agregar a la compra
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Resumen y Finalizar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Notes Section */}
              <div className="space-y-2">
                <FormField
                  control={
                    form.control as unknown as Control<PurchaseFormData>
                  }
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          id="notes"
                          placeholder="Agrega cualquier observación o nota sobre esta compra..."
                          rows={5}
                          {...field}
                          value={field.value ?? ''}
                          aria-label="Notas adicionales de la compra"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Totals Section */}
              <div className="space-y-4">
                {/* Totals Breakdown */}
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                      }).format(totals.subtotal)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>
                      {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                      }).format(totals.total)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={handleSaveAndReceive}
                    disabled={
                      isProcessing ||
                      selectedProducts.length === 0 ||
                      !selectedSupplierId
                    }
                    className="w-full h-11"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <IconCheck className="h-5 w-5 mr-2" />
                        Guardar y Recibir
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveAsPending}
                    disabled={
                      isProcessing ||
                      selectedProducts.length === 0 ||
                      !selectedSupplierId
                    }
                    className="w-full h-11"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <IconPlus className="h-5 w-5 mr-2" />
                        Guardar como Pendiente
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      router.push('/dashboard/purchases');
                    }}
                    disabled={isProcessing}
                    className="w-full h-11"
                    size="lg"
                  >
                    Cancelar
                  </Button>
                </div>

                {/* Info Text */}
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-sm">
                  <IconAlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-900 dark:text-blue-100 space-y-1">
                    <p className="font-medium">
                      Guardar y Recibir: Actualiza el inventario
                      inmediatamente
                    </p>
                    <p className="text-xs">
                      Guardar como Pendiente: Crea la orden sin afectar el
                      inventario (puedes recibirla después)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Supplier Dialog */}
        <CreateSupplierDialog
          open={createSupplierDialogOpen}
          onOpenChange={setCreateSupplierDialogOpen}
          onSupplierCreated={handleSupplierCreated}
        />

        {/* Create Product Dialog */}
        <CreateProductDialog
          open={createProductDialogOpen}
          onOpenChange={setCreateProductDialogOpen}
          onProductCreated={() => {
            setCreateProductDialogOpen(false);
            toast.success('Producto creado. Ya está disponible en el buscador.');
          }}
        />
      </form>
    </Form>
  );
}
