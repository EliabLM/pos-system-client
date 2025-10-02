'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ArrowLeftIcon, Trash2Icon, XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { NumberFormatValues, NumericFormat } from 'react-number-format';

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
import { useProducts } from '@/hooks/useProducts';
import { useActivePaymentMethods } from '@/hooks/usePaymentMethods';
import { useCreateSale } from '@/hooks/useSales';
import type { Product, SaleStatus } from '@/generated/prisma';

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
  notes: yup.string().nullable().notRequired().defined(),
});

type SaleFormValues = yup.InferType<typeof schema>;

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
  const paymentMethods = useActivePaymentMethods();
  const createSaleMutation = useCreateSale();

  // Estado para productos seleccionados y pagos
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    []
  );
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const products = useProducts({ search: debouncedSearchTerm });

  const storeSelected: string = useMemo(() => {
    if (!user || !stores.data) return '';
    const store = stores.data.find((item) => item.id === user.storeId);
    return store?.id ?? '';
  }, [user, stores]);

  const form = useForm<SaleFormValues>({
    resolver: yupResolver(schema),
    criteriaMode: 'firstError',
    defaultValues: {
      store: storeSelected ?? '',
      saleDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      status: 'PAID',
      notes: '',
    },
    mode: 'all',
    reValidateMode: 'onChange',
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
  const onSubmit = async (data: SaleFormValues) => {
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
          saleDate: new Date(data.saleDate),
          dueDate: data.status === 'PENDING' ? new Date() : null,
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
    if (storeSelected === '') {
      form.resetField('store');
      return;
    }
    form.setValue('store', storeSelected);
  }, [storeSelected, form]);

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
        className="w-full p-4 space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Link href={'/dashboard/sales'}>
                <ArrowLeftIcon className="mr-2" />
              </Link>
              Crear nueva factura
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Label className="mb-4 text-lg text-primary">
              Detalle de la factura
            </Label>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="store"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tienda</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value ?? undefined}
                      disabled={!!storeSelected}
                    >
                      <FormControl>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecciona una tienda" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
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
                control={form.control}
                name="saleDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input
                        className="w-fit"
                        id="saleDate"
                        type="datetime-local"
                        placeholder="Fecha de venta"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value ?? 'PAID'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PAID">
                          {SALE_STATUS_LABELS['PAID']}
                        </SelectItem>
                        <SelectItem value="PENDING">
                          {SALE_STATUS_LABELS['PENDING']}
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            <Label className="mb-4 text-lg text-primary">
              Detalle de productos
            </Label>

            {/* Buscador de productos */}
            <div>
              <Label className="mb-2">Buscar productos</Label>
              <Input
                className="w-full"
                placeholder="Buscar producto por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {products.isFetching && (
                <p className="text-sm my-2">Buscando...</p>
              )}

              {searchTerm && products.data && products.data.length > 0 && (
                <ScrollArea className="border rounded p-2 mt-2 max-h-60">
                  {products.data.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-2 cursor-pointer p-2 hover:bg-muted rounded"
                      onClick={() => handleAddProduct(product)}
                    >
                      <div className="flex items-center gap-2">
                        <Image
                          className="rounded-sm object-cover"
                          src={product.image ?? ''}
                          alt={''}
                          width={25}
                          height={25}
                        />
                        <span>{product.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Stock: {product.currentStock}
                        </span>
                        <span className="font-medium">
                          {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format(product.salePrice)}
                        </span>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              )}
            </div>

            {/* Lista de productos seleccionados */}
            {selectedProducts.length > 0 && (
              <div className="border rounded-lg p-4 space-y-2">
                <Label className="text-sm font-medium">
                  Productos seleccionados
                </Label>
                {selectedProducts.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-2 p-2 bg-muted rounded"
                  >
                    <Image
                      className="rounded-sm object-cover"
                      src={item.product.image ?? ''}
                      alt={''}
                      width={40}
                      height={40}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Stock disponible: {item.product.currentStock}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Cantidad</Label>
                        <Input
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
                          className="w-20"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Precio Unit.</Label>
                        <NumericFormat
                          value={item.unitPrice}
                          onValueChange={(values: NumberFormatValues) => {
                            handleUpdatePrice(
                              item.productId,
                              values.floatValue ?? 0
                            );
                          }}
                          customInput={Input}
                          placeholder="$0.00"
                          prefix="$"
                          thousandSeparator="."
                          decimalSeparator=","
                          className="w-28"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">Subtotal</Label>
                        <p className="font-medium text-sm">
                          {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                          }).format(item.subtotal)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveProduct(item.productId)}
                      >
                        <Trash2Icon className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />
            <Label className="mb-4 text-lg text-primary">Métodos de pago</Label>

            {/* Lista de pagos */}
            <div className="space-y-2">
              {payments.map((payment, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={payment.paymentMethodId}
                    onValueChange={(value) =>
                      handleUpdatePayment(index, 'paymentMethodId', value)
                    }
                  >
                    <SelectTrigger className="flex-1">
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
                  <NumericFormat
                    value={payment.amount}
                    onValueChange={(values: NumberFormatValues) => {
                      handleUpdatePayment(
                        index,
                        'amount',
                        values.floatValue ?? 0
                      );
                    }}
                    customInput={Input}
                    placeholder="$0.00"
                    prefix="$"
                    thousandSeparator="."
                    decimalSeparator=","
                    className="w-40"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePayment(index)}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddPayment}
                disabled={
                  !paymentMethods.data || paymentMethods.data.length === 0
                }
              >
                Agregar método de pago
              </Button>
            </div>

            <Separator />
            <Label className="mb-4 text-lg text-primary">
              Resumen de venta
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          id="notes"
                          placeholder="Notas adicionales"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-2 flex flex-col justify-end space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Estado:</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      form.watch('status') === 'PAID'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {SALE_STATUS_LABELS[form.watch('status') ?? 'PAID']}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                    }).format(totals.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total pagos</span>
                  <span>
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                    }).format(totals.totalPayments)}
                  </span>
                </div>
                <div
                  className={`flex justify-between font-semibold ${
                    totals.remaining !== 0
                      ? 'text-destructive'
                      : 'text-green-600'
                  }`}
                >
                  <span>{totals.remaining > 0 ? 'Restante' : 'Total'}</span>
                  <span>
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                    }).format(Math.abs(totals.remaining))}
                  </span>
                </div>
                <div className="flex gap-2 w-full items-center">
                  <Button
                    type="submit"
                    disabled={
                      createSaleMutation.isPending ||
                      selectedProducts.length === 0
                    }
                  >
                    {createSaleMutation.isPending
                      ? 'Creando...'
                      : 'Crear factura'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      router.push('/dashboard/sales');
                    }}
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
