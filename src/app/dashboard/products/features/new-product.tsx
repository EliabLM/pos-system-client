import React, { useEffect, useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { NumberFormatValues, NumericFormat } from 'react-number-format';

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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ImagePicker } from '@/components/ui/image-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  IconInfoCircle,
  IconPercentage,
  IconCurrencyDollar,
  IconTrendingUp,
  IconAlertTriangle,
} from '@tabler/icons-react';

import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import { deleteImageFromUploadThing, uploadImage } from '@/actions/product';
import { useActiveCategories } from '@/hooks/useCategories';
import { useActiveBrands } from '@/hooks/useBrands';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductWithIncludesNumberPrice } from '@/interfaces';

const schema = yup.object().shape({
  name: yup
    .string()
    .min(3, 'Debe ingresar mínimo 3 caracteres')
    .required('El nombre es requerido'),
  description: yup.string().nullable().notRequired().defined(),
  image: yup.string().nullable().notRequired().defined(),
  barcode: yup.string().nullable().notRequired().defined(),
  sku: yup.string().nullable().notRequired().defined(),
  categoryId: yup.string().nullable().notRequired().defined(),
  brandId: yup.string().required('La marca es requerida'),
  costPrice: yup
    .number()
    .typeError('Debe ingresar un valor válido')
    .required('El costo es requerido')
    .positive('Solo se permite ingresar números positivos')
    .min(0, 'El valor mínimo permitido es $0'),
  salePrice: yup
    .number()
    .typeError('Debe ingresar un valor válido')
    .required('El precio de venta es requerido')
    .positive('Solo se permite ingresar números positivos')
    .min(0, 'El valor mínimo permitido es $0'),
  minStock: yup
    .number()
    .typeError('Debe ingresar un valor válido')
    .required('El stock mínimo es requerido')
    .min(0, 'El valor mínimo permitido es 0')
    .integer('Solo se permite ingresar números enteros'),
  currentStock: yup
    .number()
    .typeError('Debe ingresar un valor válido')
    .required('El stock actual es requerido')
    .min(0, 'El valor mínimo permitido es 0')
    .integer('Solo se permite ingresar números enteros'),
  active: yup.bool().default(true),
});

type StoreFormData = yup.InferType<typeof schema>;

const NewProduct = ({
  setSheetOpen,
  itemSelected,
  setItemSelected,
}: {
  setSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setItemSelected: React.Dispatch<
    React.SetStateAction<ProductWithIncludesNumberPrice | null>
  >;
  itemSelected: ProductWithIncludesNumberPrice | null;
}) => {
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const { data: activeCategories } = useActiveCategories();
  const { data: activeBrands } = useActiveBrands();

  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const form = useForm<StoreFormData>({
    criteriaMode: 'firstError',
    defaultValues: {
      name: itemSelected?.name ?? '',
      description: itemSelected?.description ?? '',
      image: itemSelected?.image ?? '',
      barcode: itemSelected?.barcode ?? '',
      sku: itemSelected?.sku ?? '',
      categoryId: itemSelected?.categoryId ?? '',
      brandId: itemSelected?.brandId ?? '',
      costPrice: Number(itemSelected?.costPrice),
      salePrice: Number(itemSelected?.salePrice),
      minStock: itemSelected?.minStock,
      currentStock: itemSelected?.currentStock,
      active: itemSelected?.isActive ?? true,
    },
    mode: 'all',
    reValidateMode: 'onChange',
    resolver: yupResolver(schema),
  });

  // Watch cost and sale price for margin calculation
  const costPrice = form.watch('costPrice');
  const salePrice = form.watch('salePrice');

  // Calculate margin
  const margin = (salePrice || 0) - (costPrice || 0);
  const marginPercentage =
    costPrice && costPrice > 0 ? ((margin / costPrice) * 100).toFixed(2) : '0';
  const hasNegativeMargin = margin < 0;
  const hasLowMargin = margin > 0 && parseFloat(marginPercentage) < 20;

  const onSubmit = async (data: StoreFormData) => {
    let imageUrl: string | undefined;

    try {
      setIsLoading(true);

      //* Upload image and get the url
      if (file) {
        const response = await uploadImage(file);
        imageUrl = response?.ufsUrl;
      }

      //* Create product
      if (itemSelected) {
        await updateMutation.mutateAsync({
          productId: itemSelected.id,
          updateData: {
            name: data.name,
            description: data.description,
            barcode: data.barcode,
            sku: data.sku,
            categoryId: data.categoryId,
            brandId: data.brandId,
            costPrice: data.costPrice,
            salePrice: data.salePrice,
            isActive: data.active,
          },
        });

        toast.success('Producto actualizado exitosamente');
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          description: data.description,
          barcode: data.barcode,
          sku: data.sku,
          categoryId: data.categoryId,
          brandId: data.brandId,
          costPrice: data.costPrice,
          salePrice: data.salePrice,
          currentStock: data.currentStock,
          minStock: data.minStock,
          image: imageUrl ?? null,
          unitMeasureId: null, //TODO Crear unidad de medida por defecto (UN)
          isActive: data.active,
          alcoholGrade: null,
          color: null,
          model: null,
          size: null,
          volume: null,
        });

        toast.success('Producto creado exitosamente');
      }

      form.resetField('name');
      form.resetField('description');
      form.resetField('description');
      form.resetField('image');
      form.resetField('barcode');
      form.resetField('sku');
      form.resetField('costPrice');
      form.resetField('salePrice');
      form.resetField('minStock');
      form.resetField('currentStock');
      form.resetField('categoryId');
      form.resetField('brandId');
      form.resetField('active');
      setSheetOpen(false);
      setItemSelected(null);
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);

      if (imageUrl) {
        await deleteImageFromUploadThing(imageUrl);
      }

      toast.error('Ha ocurrido un error creando el producto');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!itemSelected) {
      form.resetField('name');
      form.resetField('description');
      form.resetField('description');
      form.resetField('image');
      form.resetField('barcode');
      form.resetField('sku');
      form.resetField('costPrice');
      form.resetField('salePrice');
      form.resetField('minStock');
      form.resetField('currentStock');
      form.resetField('categoryId');
      form.resetField('brandId');
      form.resetField('active');
      return;
    }

    form.setValue('name', itemSelected.name);
    form.setValue('description', itemSelected.description);
    form.setValue('description', itemSelected.description);
    form.setValue('image', itemSelected.image);
    form.setValue('barcode', itemSelected.barcode);
    form.setValue('sku', itemSelected.sku);
    form.setValue('costPrice', Number(itemSelected.costPrice));
    form.setValue('salePrice', Number(itemSelected.salePrice));
    form.setValue('minStock', itemSelected.minStock);
    form.setValue('currentStock', itemSelected.currentStock);
    form.setValue('categoryId', itemSelected.categoryId);
    form.setValue('brandId', itemSelected.brandId ?? '');
    form.setValue('active', itemSelected.isActive);
  }, [itemSelected, form]);

  return (
    <SheetContent className="sm:max-w-xl overflow-y-scroll">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <SheetHeader>
            <SheetTitle>
              {itemSelected ? 'Actualizar producto' : 'Nuevo producto'}
            </SheetTitle>
            <SheetDescription>
              Ingresa la información del producto y presiona guardar para
              aplicar los cambios.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-6 px-4 py-6">
            {/* SECTION 1: Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <IconInfoCircle className="h-5 w-5" />
                  Información Básica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del producto *</FormLabel>
                      <FormControl>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Ej: Nike Air Max 90 Rojo"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de barras</FormLabel>
                        <FormControl>
                          <Input
                            id="barcode"
                            type="text"
                            placeholder="Código de barras"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input
                            id="sku"
                            type="text"
                            placeholder="SKU"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value ?? undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeCategories?.map((item) => (
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
                    name="brandId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value ?? undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una marca" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeBrands?.map((item) => (
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
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          id="description"
                          placeholder="Descripción detallada del producto"
                          {...field}
                          value={field.value ?? ''}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel className="mb-2 block">
                    Imagen del producto
                  </FormLabel>
                  <ImagePicker
                    onImageChange={setFile}
                    url={itemSelected?.image}
                  />
                </div>
              </CardContent>
            </Card>

            {/* SECTION 2: Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <IconCurrencyDollar className="h-5 w-5" />
                  Precios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Costo *</FormLabel>
                        <FormControl>
                          <NumericFormat
                            value={field.value}
                            onValueChange={(values: NumberFormatValues) => {
                              field.onChange(values.floatValue);
                            }}
                            customInput={Input}
                            placeholder="$0.00"
                            prefix="$"
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="salePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio de venta *</FormLabel>
                        <FormControl>
                          <NumericFormat
                            value={field.value}
                            onValueChange={(values: NumberFormatValues) => {
                              field.onChange(values.floatValue);
                            }}
                            customInput={Input}
                            placeholder="$0.00"
                            prefix="$"
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Margin Calculation Feedback */}
                {costPrice > 0 && salePrice > 0 && (
                  <div className="space-y-3">
                    <Separator />
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <IconTrendingUp className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Margen de ganancia
                          </span>
                          <Badge
                            variant={
                              hasNegativeMargin ? 'destructive' : 'secondary'
                            }
                            className="font-mono"
                          >
                            <IconPercentage className="h-3 w-3 mr-1" />
                            {marginPercentage}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Ganancia por unidad</span>
                          <span
                            className={`font-medium ${
                              hasNegativeMargin
                                ? 'text-destructive'
                                : 'text-foreground'
                            }`}
                          >
                            ${margin.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Warnings */}
                    {hasNegativeMargin && (
                      <Alert variant="destructive">
                        <IconAlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          El precio de venta es menor que el costo. Esto
                          resultará en pérdidas.
                        </AlertDescription>
                      </Alert>
                    )}

                    {hasLowMargin && (
                      <Alert>
                        <IconInfoCircle className="h-4 w-4" />
                        <AlertDescription>
                          El margen de ganancia es bajo (menos del 20%).
                          Considera ajustar el precio de venta.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SECTION 3: Inventory */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <IconInfoCircle className="h-5 w-5" />
                  Inventario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock mínimo *</FormLabel>
                        <FormControl>
                          <Input
                            id="minStock"
                            type="number"
                            placeholder="Stock mínimo"
                            disabled={!!itemSelected}
                            {...field}
                          />
                        </FormControl>
                        {itemSelected && (
                          <p className="text-xs text-muted-foreground">
                            No se puede editar en productos existentes
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock actual *</FormLabel>
                        <FormControl>
                          <Input
                            id="currentStock"
                            type="number"
                            placeholder="Stock actual"
                            disabled={!!itemSelected}
                            {...field}
                          />
                        </FormControl>
                        {itemSelected && (
                          <p className="text-xs text-muted-foreground">
                            Use movimientos de stock para ajustar inventario
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Estado del producto
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          {field.value
                            ? 'El producto está activo y disponible para la venta'
                            : 'El producto está inactivo y no aparecerá en ventas'}
                        </p>
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
              </CardContent>
            </Card>
          </div>
          <SheetFooter>
            <div className="flex gap-4 flex-row-reverse">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Cargando...' : 'Guardar cambios'}
              </Button>
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setItemSelected(null)}
                  disabled={isLoading}
                >
                  Cerrar
                </Button>
              </SheetClose>
            </div>
          </SheetFooter>
        </form>
      </Form>
    </SheetContent>
  );
};

export default NewProduct;
