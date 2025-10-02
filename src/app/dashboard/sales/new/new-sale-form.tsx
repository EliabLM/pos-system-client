'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { ArrowLeftIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

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

import { useStore } from '@/store';

import { useStores } from '@/hooks/useStores';
import { useProducts } from '@/hooks/useProducts';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

export const NewSaleForm = () => {
  const router = useRouter();

  const stores = useStores();
  const user = useStore((state) => state.user);

  const storeSelected: string = useMemo(() => {
    if (!user || !stores.data) return '';

    const store = stores.data.find((item) => item.id === user.storeId);

    return store?.id ?? '';
  }, [user, stores]);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const products = useProducts({ search: debouncedSearchTerm });

  const form = useForm({
    criteriaMode: 'firstError',
    defaultValues: {
      store: storeSelected ?? '',
      saleDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      notes: '',
    },
    mode: 'all',
    reValidateMode: 'onChange',
    // resolver: yupResolver(schema),
  });

  const onSubmit = (data: unknown) => {
    console.log('🚀 ~ onSubmit ~ data:', data);
    //
  };

  useEffect(() => {
    if (storeSelected === '') {
      form.resetField('store');
      return;
    }

    form.setValue('store', storeSelected);
  }, [storeSelected]);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(() => {
    console.log('🚀 ~ NewSaleForm ~ products.data:', products.data);
  }, [products.data]);

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
                        <SelectTrigger>
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
            </div>

            <Separator />
            <Label className="mb-4 text-lg text-primary">
              Detalle de productos
            </Label>
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

              {products.data && products.data.length > 0 && (
                <ScrollArea className="border rounded p-2 mt-2 max-h-60">
                  {products.data.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-2 cursor-pointer p-2 hover:bg-muted rounded"
                    >
                      <Image
                        className="rounded-sm object-cover"
                        src={product.image ?? ''}
                        alt={''}
                        width={25}
                        height={25}
                      />
                      {product.name} -
                      {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(product.salePrice)}
                    </div>
                  ))}
                </ScrollArea>
              )}
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
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Descuento (0%)</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>$0.00</span>
                </div>
                <div className="flex gap-2 w-full items-center">
                  <Button type="submit">Crear factura</Button>
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
