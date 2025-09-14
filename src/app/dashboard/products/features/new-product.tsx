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

import {
  useCreateProduct,
  useProductById,
  useUpdateProduct,
} from '@/hooks/useProducts';
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

      form.reset();
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
  }, [itemSelected]);

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
          <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 auto-rows-min gap-6 px-4">
            <div className="space-y-6">
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

              <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
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

              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo</FormLabel>
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
                    <FormLabel>Precio de venta</FormLabel>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        id="description"
                        placeholder="Descripción"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ImagePicker onImageChange={setFile} url={itemSelected?.image} />
            </div>

            <div className="space-y-6">
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

              <div className="grid gap-3">
                <FormField
                  control={form.control}
                  name="minStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock mínimo</FormLabel>
                      <FormControl>
                        <Input
                          id="minStock"
                          type="number"
                          placeholder="Stock mínimo"
                          disabled={!!itemSelected}
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
                  name="currentStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock actual</FormLabel>
                      <FormControl>
                        <Input
                          id="currentStock"
                          type="number"
                          placeholder="Stock actual"
                          disabled={!!itemSelected}
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
