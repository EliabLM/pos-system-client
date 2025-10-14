'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm, Control } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  IconArrowLeft,
  IconTrash,
  IconX,
  IconPlus,
  IconSearch,
  IconShoppingCart,
  IconCreditCard,
  IconFileInvoice,
  IconCalendar,
  IconAlertCircle,
  IconCheck,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useStore } from '@/store';
import { useStores } from '@/hooks/useStores';
import { useActiveProducts } from '@/hooks/useProducts';
import { useActivePaymentMethods } from '@/hooks/usePaymentMethods';
import { useCreateSale } from '@/hooks/useSales';
import type { Product, SaleStatus } from '@/generated/prisma';
import { isSeller } from '@/lib/rbac';

// Mapeo de estados en español
const SALE_STATUS_LABELS: Record<string, string> = {
  PAID: 'Pagado',
  PENDING: 'Pendiente',
};

// Esquema de validación con Yup
const schema = yup.object().shape({
  store: yup
    .string()
    .required('La tienda es requerida')
    .min(1, 'Debes seleccionar una tienda'),
  saleDate: yup
    .string()
    .required('La fecha de venta es requerida')
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
  status: yup
    .string()
    .oneOf(['PAID', 'PENDING'], 'Estado inválido')
    .required('El estado es requerido'),
  dueDate: yup
    .string()
    .nullable()
    .when('status', {
      is: 'PENDING',
      then: (schema) =>
        schema
          .required(
            'La fecha de vencimiento es requerida para ventas pendientes'
          )
          .test('is-valid-date', 'Fecha inválida', (value) => {
            if (!value) return false;
            const date = new Date(value);
            return !isNaN(date.getTime());
          })
          .test(
            'is-future',
            'La fecha de vencimiento debe ser futura',
            (value) => {
              if (!value) return true;
              const date = new Date(value);
              const now = new Date();
              return date > now;
            }
          ),
      otherwise: (schema) => schema.nullable().notRequired(),
    }),
  notes: yup.string().nullable().notRequired().defined(),
});

type SaleFormData = yup.InferType<typeof schema>;

// Tipos locales para el formulario
interface SelectedProduct {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  unitMeasureId: string | null;
  subtotal: number;
}

interface PaymentEntry {
  paymentMethodId: string;
  paymentMethodName: string;
  amount: number;
}

export const NewSaleForm = () => {
  const router = useRouter();
  const stores = useStores();
  const user = useStore((state) => state.user);
  const userRole = user?.role || '';
  const paymentMethods = useActivePaymentMethods();
  const createSaleMutation = useCreateSale();

  // Estado para productos seleccionados y pagos
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    []
  );
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const products = useActiveProducts({ search: debouncedSearchTerm });

  const storeSelected: { id: string; name: string } | null = useMemo(() => {
    if (!user || !stores.data) return null;
    const store = stores.data.find((item) => item.id === user.storeId);
    return { id: store?.id ?? '', name: store?.name ?? '' };
  }, [user, stores]);

  const form = useForm({
    resolver: yupResolver(schema),
    criteriaMode: 'firstError' as const,
    defaultValues: {
      store: storeSelected?.id ?? '',
      saleDate: formatDateTimeLocal(new Date()),
      status: 'PAID' as const,
      dueDate: null as string | null,
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
    const totalPayments = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    const remaining = subtotal - totalPayments;

    return { subtotal, totalPayments, remaining };
  }, [selectedProducts, payments]);

  // Agregar producto seleccionado
  const handleAddProduct = (product: Product) => {
    const existing = selectedProducts.find((p) => p.productId === product.id);

    if (existing) {
      toast.info(
        `${product.name} ya está agregado. Modifica la cantidad si deseas.`
      );
      return;
    }

    if (product.currentStock <= 0) {
      toast.error(`${product.name} no tiene stock disponible`);
      return;
    }

    const newProduct: SelectedProduct = {
      productId: product.id,
      product,
      quantity: 1,
      unitPrice: product.salePrice,
      unitMeasureId: product.unitMeasureId ?? null,
      subtotal: product.salePrice,
    };

    setSelectedProducts((prev) => [...prev, newProduct]);
    setSearchTerm('');
    toast.success(`${product.name} agregado a la venta`);
  };

  // Actualizar cantidad de producto
  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    setSelectedProducts((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const quantity = Math.max(
            1,
            Math.min(newQuantity, item.product.currentStock)
          );
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

  // Agregar pago
  const handleAddPayment = () => {
    if (!paymentMethods.data || paymentMethods.data.length === 0) {
      toast.error('No hay métodos de pago disponibles');
      return;
    }

    const firstPaymentMethod = paymentMethods.data[0];
    const newPayment: PaymentEntry = {
      paymentMethodId: firstPaymentMethod.id,
      paymentMethodName: firstPaymentMethod.name,
      amount: Math.max(0, totals.remaining),
    };

    setPayments((prev) => [...prev, newPayment]);
  };

  // Actualizar pago
  const handleUpdatePayment = (
    index: number,
    field: 'paymentMethodId' | 'amount',
    value: string | number
  ) => {
    setPayments((prev) =>
      prev.map((payment, i) => {
        if (i === index) {
          if (field === 'paymentMethodId') {
            const method = paymentMethods.data?.find((m) => m.id === value);
            return {
              ...payment,
              paymentMethodId: value as string,
              paymentMethodName: method?.name ?? '',
            };
          } else {
            return {
              ...payment,
              amount: Math.max(0, Number(value)),
            };
          }
        }
        return payment;
      })
    );
  };

  // Eliminar pago
  const handleRemovePayment = (index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit del formulario
  const onSubmit = async (data: SaleFormData) => {
    if (selectedProducts.length === 0) {
      toast.error('Debes agregar al menos un producto a la venta');
      return;
    }

    if (!user) {
      toast.error('Usuario no autenticado');
      return;
    }

    // Solo validar pagos completos si el estado es PAID
    if (data.status === 'PAID') {
      if (totals.remaining !== 0) {
        toast.error(
          totals.remaining > 0
            ? `Falta agregar ${new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
              }).format(totals.remaining)} en pagos`
            : 'El total de pagos excede el total de la venta'
        );
        return;
      }
    }

    try {
      const saleItems = selectedProducts.map((item) => ({
        productId: item.productId,
        unitMeasureId: item.unitMeasureId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      }));

      const salePayments = payments.map((payment) => ({
        paymentMethodId: payment.paymentMethodId,
        amount: payment.amount,
        reference: null,
        notes: null,
        paymentDate: new Date(),
      }));

      await createSaleMutation.mutateAsync({
        saleData: {
          storeId: data.store,
          userId: user.id,
          customerId: null,
          subtotal: totals.subtotal,
          total: totals.subtotal,
          status: data.status as SaleStatus,
          saleDate: parseLocalDateTime(data.saleDate),
          dueDate:
            data.status === 'PENDING' && data.dueDate
              ? parseLocalDateTime(data.dueDate + 'T00:00')
              : null,
          paidDate: data.status === 'PAID' ? new Date() : null,
          notes: data.notes || null,
        },
        saleItems,
        salePayments: salePayments.length > 0 ? salePayments : undefined,
      });

      toast.success('Venta creada exitosamente');
      router.push('/dashboard/sales');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al crear la venta'
      );
    }
  };

  // Efectos
  useEffect(() => {
    if (storeSelected === null) {
      form.resetField('store');
      return;
    }

    if (isSeller(userRole)) {
      form.setValue('store', storeSelected.id);
    }
  }, [storeSelected, form, userRole]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Agregar método de pago "Efectivo" por defecto cuando se carguen los métodos de pago
  useEffect(() => {
    if (
      paymentMethods.data &&
      paymentMethods.data.length > 0 &&
      payments.length === 0
    ) {
      // Buscar método de pago "Efectivo"
      const efectivo = paymentMethods.data.find(
        (method) => method.name.toLowerCase() === 'efectivo'
      );

      // Si existe "Efectivo", usarlo; si no, usar el primer método disponible
      const defaultPaymentMethod = efectivo || paymentMethods.data[0];

      setPayments([
        {
          paymentMethodId: defaultPaymentMethod.id,
          paymentMethodName: defaultPaymentMethod.name,
          amount: 0,
        },
      ]);
    }
  }, [paymentMethods.data, payments.length]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={'/dashboard/sales'}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Volver a la lista de ventas"
          >
            <IconArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <IconFileInvoice className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">Crear Nueva Factura</h1>
          </div>
        </div>

        {/* Invoice Details Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconFileInvoice className="h-5 w-5 text-primary" />
              Información de la Factura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control as unknown as Control<SaleFormData>}
                name="store"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Tienda
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value ?? undefined}
                      disabled={isSeller(userRole)}
                    >
                      <FormControl>
                        <SelectTrigger aria-label="Seleccionar tienda">
                          <SelectValue placeholder="Selecciona una tienda" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stores.data?.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as unknown as Control<SaleFormData>}
                name="saleDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <IconCalendar className="h-4 w-4" />
                      Fecha de Venta
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="saleDate"
                        type="datetime-local"
                        aria-label="Seleccionar fecha de venta"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as unknown as Control<SaleFormData>}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Estado
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value ?? 'PAID'}
                    >
                      <FormControl>
                        <SelectTrigger aria-label="Seleccionar estado de la venta">
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PAID">
                          <div className="flex items-center gap-2">
                            <IconCheck className="h-4 w-4 text-green-600" />
                            {SALE_STATUS_LABELS['PAID']}
                          </div>
                        </SelectItem>
                        <SelectItem value="PENDING">
                          <div className="flex items-center gap-2">
                            <IconAlertCircle className="h-4 w-4 text-yellow-600" />
                            {SALE_STATUS_LABELS['PENDING']}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditional Due Date Field */}
              {form.watch('status') === 'PENDING' && (
                <FormField
                  control={form.control as unknown as Control<SaleFormData>}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <IconCalendar className="h-4 w-4" />
                        Fecha de Vencimiento
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="dueDate"
                          type="date"
                          aria-label="Seleccionar fecha de vencimiento"
                          aria-required="true"
                          aria-describedby="dueDate-description"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <p
                        id="dueDate-description"
                        className="text-xs text-muted-foreground"
                      >
                        Fecha límite para el pago
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
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
              <Label
                htmlFor="product-search"
                className="mb-2 flex items-center gap-1"
              >
                <IconSearch className="h-4 w-4" />
                Buscar Productos
              </Label>
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
              {searchTerm &&
                !products.isFetching &&
                products.data &&
                products.data.length > 0 && (
                  <ScrollArea className="border rounded-lg mt-2 max-h-64 bg-muted/30 overflow-y-scroll overflow-hidden">
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
                          aria-label={`Agregar ${product.name} a la venta`}
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
                                {product.currentStock > 0 ? (
                                  <span className="text-green-600">
                                    Stock: {product.currentStock}
                                  </span>
                                ) : (
                                  <span className="text-destructive">
                                    Sin stock
                                  </span>
                                )}
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
                              }).format(product.salePrice)}
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
                          Stock disponible: {item.product.currentStock}
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
                            max={item.product.currentStock}
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
                          aria-label={`Eliminar ${item.product.name} de la venta`}
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
                  Busca y selecciona productos para agregar a la venta
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconCreditCard className="h-5 w-5 text-primary" />
              Métodos de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment List */}
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-muted/50 rounded-lg border"
                >
                  <div className="flex-1 w-full sm:w-auto">
                    <Label
                      htmlFor={`payment-method-${index}`}
                      className="text-xs mb-1 block"
                    >
                      Método de Pago
                    </Label>
                    <Select
                      value={payment.paymentMethodId}
                      onValueChange={(value) =>
                        handleUpdatePayment(index, 'paymentMethodId', value)
                      }
                    >
                      <SelectTrigger
                        id={`payment-method-${index}`}
                        className="w-full"
                        aria-label={`Método de pago ${index + 1}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.data?.map((method) => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-40">
                    <Label
                      htmlFor={`payment-amount-${index}`}
                      className="text-xs mb-1 block"
                    >
                      Monto
                    </Label>
                    <NumericFormat
                      id={`payment-amount-${index}`}
                      value={payment.amount}
                      onValueChange={(values: NumberFormatValues) => {
                        handleUpdatePayment(
                          index,
                          'amount',
                          values.floatValue ?? 0
                        );
                      }}
                      customInput={Input}
                      placeholder="$0"
                      prefix="$"
                      thousandSeparator="."
                      decimalSeparator=","
                      className="w-full"
                      aria-label={`Monto para ${payment.paymentMethodName}`}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePayment(index)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 self-end sm:self-center"
                    aria-label={`Eliminar método de pago ${payment.paymentMethodName}`}
                  >
                    <IconX className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add Payment Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleAddPayment}
              disabled={
                !paymentMethods.data || paymentMethods.data.length === 0
              }
              className="w-full sm:w-auto"
            >
              <IconPlus className="h-4 w-4 mr-2" />
              Agregar Método de Pago
            </Button>

            {/* Payment Info/Help Text */}
            {form.watch('status') === 'PAID' && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-sm">
                <IconAlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-blue-900 dark:text-blue-100">
                  Para ventas pagadas, el total de los pagos debe coincidir con
                  el total de la venta.
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
                  control={form.control as unknown as Control<SaleFormData>}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          id="notes"
                          placeholder="Agrega cualquier observación o nota sobre esta venta..."
                          rows={5}
                          {...field}
                          value={field.value ?? ''}
                          aria-label="Notas adicionales de la venta"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Totals Section */}
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">
                    Estado de la Venta:
                  </span>
                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                      form.watch('status') === 'PAID'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}
                  >
                    {form.watch('status') === 'PAID' ? (
                      <IconCheck className="h-3.5 w-3.5" />
                    ) : (
                      <IconAlertCircle className="h-3.5 w-3.5" />
                    )}
                    {SALE_STATUS_LABELS[form.watch('status') ?? 'PAID']}
                  </span>
                </div>

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
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Pagos:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                      }).format(totals.totalPayments)}
                    </span>
                  </div>
                  <Separator />
                  <div
                    className={`flex justify-between text-lg font-bold ${
                      totals.remaining !== 0
                        ? 'text-destructive'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    <span>
                      {totals.remaining > 0 ? 'Saldo Pendiente:' : 'Total:'}
                    </span>
                    <span>
                      {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                      }).format(Math.abs(totals.remaining))}
                    </span>
                  </div>
                </div>

                {/* Validation Warning */}
                {totals.remaining !== 0 && form.watch('status') === 'PAID' && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                    <IconAlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-destructive">
                      {totals.remaining > 0
                        ? 'El total de pagos debe cubrir el monto de la venta para estado "Pagado".'
                        : 'El total de pagos excede el monto de la venta.'}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={
                      createSaleMutation.isPending ||
                      selectedProducts.length === 0
                    }
                    className="flex-1 h-11"
                    size="lg"
                  >
                    {createSaleMutation.isPending ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Creando Venta...
                      </>
                    ) : (
                      <>
                        <IconCheck className="h-5 w-5 mr-2" />
                        Crear Factura
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      router.push('/dashboard/sales');
                    }}
                    disabled={createSaleMutation.isPending}
                    className="flex-1 sm:flex-none h-11"
                    size="lg"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
};
