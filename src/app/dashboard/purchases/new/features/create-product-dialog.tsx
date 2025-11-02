'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'sonner';
import {
  IconPackage,
  IconTag,
  IconBuildingStore,
  IconCurrencyDollar,
  IconBarcode,
  IconAlertCircle,
  IconFileText,
  IconX,
  IconRuler,
  IconPalette,
  IconBottle,
  IconDroplet,
  IconRulerMeasure,
} from '@tabler/icons-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ImagePicker } from '@/components/ui/image-picker';

import { useStore } from '@/store';
import { useCreateProduct } from '@/hooks/useProducts';
import { useActiveCategories } from '@/hooks/useCategories';
import { useActiveBrands } from '@/hooks/useBrands';
import { useActiveUnitMeasures } from '@/hooks/useUnitMeasures';
import { useBusinessType } from '@/hooks/useSystemConfig';
import { uploadImage } from '@/actions/product';

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreated: (productId: string) => void;
}

interface ProductFormData {
  name: string;
  categoryId: string;
  brandId: string;
  unitMeasureId: string;
  costPrice: number;
  salePrice: number;
  barcode?: string;
  sku?: string;
  description?: string;
  image?: string | null;
  // Campos específicos por tipo de negocio
  alcoholGrade?: number | null;
  volume?: number | null;
  size?: string | null;
  color?: string | null;
  model?: string | null;
}

// Base schema shared by all business types
const baseSchema = {
  name: yup
    .string()
    .required('El nombre es requerido')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre debe tener máximo 100 caracteres'),
  categoryId: yup.string().required('La categoría es requerida'),
  brandId: yup.string().required('La marca es requerida'),
  unitMeasureId: yup.string().required('La unidad de medida es requerida'),
  costPrice: yup
    .number()
    .required('El precio de costo es requerido')
    .min(0, 'El precio de costo no puede ser negativo')
    .typeError('Ingresa un precio válido'),
  salePrice: yup
    .number()
    .required('El precio de venta es requerido')
    .min(0, 'El precio de venta no puede ser negativo')
    .typeError('Ingresa un precio válido'),
  barcode: yup.string().nullable().optional(),
  sku: yup.string().nullable().optional(),
  description: yup.string().nullable().optional(),
  image: yup.string().nullable().optional(),
};

// Liquor store specific fields (optional for non-liquor stores)
const liquorFieldsOptional = {
  alcoholGrade: yup
    .number()
    .nullable()
    .notRequired()
    .transform((value, originalValue) => (originalValue === '' ? null : value))
    .min(0, 'El grado alcohólico mínimo es 0%')
    .max(100, 'El grado alcohólico máximo es 100%'),
  volume: yup
    .number()
    .nullable()
    .notRequired()
    .transform((value, originalValue) => (originalValue === '' ? null : value))
    .positive('El volumen debe ser un número positivo')
    .min(1, 'El volumen mínimo es 1ml'),
};

// Liquor store specific fields (REQUIRED for liquor stores)
const liquorFieldsRequired = {
  alcoholGrade: yup
    .number()
    .required('El grado alcohólico es obligatorio para licoreras')
    .typeError('Debe ingresar un valor válido')
    .min(0, 'El grado alcohólico mínimo es 0%')
    .max(100, 'El grado alcohólico máximo es 100%'),
  volume: yup
    .number()
    .required('El volumen es obligatorio para licoreras')
    .typeError('Debe ingresar un valor válido')
    .positive('El volumen debe ser un número positivo')
    .min(1, 'El volumen mínimo es 1ml'),
};

// Footwear store specific fields (optional)
const footwearFields = {
  size: yup.string().nullable().notRequired().defined(),
  color: yup.string().nullable().notRequired().defined(),
  model: yup.string().nullable().notRequired().defined(),
};

// Function to create schema based on business type
const createSchema = (businessType: 'liquor_store' | 'shoe_store' | null) => {
  if (businessType === 'liquor_store') {
    return yup.object().shape({
      ...baseSchema,
      ...liquorFieldsRequired,
    });
  } else if (businessType === 'shoe_store') {
    return yup.object().shape({
      ...baseSchema,
      ...footwearFields,
    });
  }
  // Default to base schema with optional liquor fields
  return yup.object().shape({
    ...baseSchema,
    ...liquorFieldsOptional,
  });
};

export default function CreateProductDialog({
  open,
  onOpenChange,
  onProductCreated,
}: CreateProductDialogProps) {
  const user = useStore((state) => state.user);
  const createMutation = useCreateProduct();
  const { data: categoriesData } = useActiveCategories();
  const { data: brandsData } = useActiveBrands();
  const { data: unitMeasuresData } = useActiveUnitMeasures();
  const { data: businessType } = useBusinessType();

  const categories = categoriesData ?? [];
  const brands = brandsData ?? [];
  const unitMeasures = unitMeasuresData ?? [];

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Create dynamic schema based on business type
  const schema = React.useMemo(() => {
    return createSchema(businessType ?? null);
  }, [businessType]);

  // Create dynamic default values based on business type
  const defaultValues = React.useMemo(() => {
    const baseValues = {
      name: '',
      categoryId: '',
      brandId: '',
      unitMeasureId: '',
      costPrice: 0,
      salePrice: 0,
      barcode: undefined,
      sku: undefined,
      description: undefined,
      image: null,
    };

    if (businessType === 'liquor_store') {
      return {
        ...baseValues,
        alcoholGrade: null,
        volume: null,
      };
    } else if (businessType === 'shoe_store') {
      return {
        ...baseValues,
        size: null,
        color: null,
        model: null,
      };
    }

    return baseValues;
  }, [businessType]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: yupResolver(schema as unknown as yup.ObjectSchema<ProductFormData>) as unknown as Resolver<ProductFormData>,
    defaultValues,
  });

  const costPrice = watch('costPrice');
  const salePrice = watch('salePrice');
  const showPriceWarning = salePrice > 0 && salePrice < costPrice;

  // Handle image file selection
  const handleImageChange = (file: File | null) => {
    setImageFile(file);
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!user?.organizationId) {
      toast.error('No se encontró la organización del usuario');
      return;
    }

    setIsUploadingImage(true);

    try {
      // Upload image if selected
      let uploadedImageUrl: string | null = null;
      if (imageFile) {
        const uploadResponse = await uploadImage(imageFile);
        if (uploadResponse?.url) {
          uploadedImageUrl = uploadResponse.url;
          toast.success('Imagen subida correctamente');
        } else {
          toast.error('Error al subir la imagen');
          setIsUploadingImage(false);
          return;
        }
      }

      const productData = {
        name: data.name,
        categoryId: data.categoryId,
        brandId: data.brandId,
        unitMeasureId: data.unitMeasureId,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        barcode: data.barcode ?? null,
        sku: data.sku ?? null,
        description: data.description ?? null,
        currentStock: 0, // Initial stock is 0, will be updated by purchase
        minStock: 0,
        isActive: true,
        image: uploadedImageUrl,
        // Conditional fields based on business type - with explicit typing
        alcoholGrade: (businessType === 'liquor_store' && 'alcoholGrade' in data ? data.alcoholGrade : null) as number | null,
        volume: (businessType === 'liquor_store' && 'volume' in data ? data.volume : null) as number | null,
        size: (businessType === 'shoe_store' && 'size' in data ? data.size : null) as string | null,
        color: (businessType === 'shoe_store' && 'color' in data ? data.color : null) as string | null,
        model: (businessType === 'shoe_store' && 'model' in data ? data.model : null) as string | null,
      };

      createMutation.mutate(productData, {
        onSuccess: (responseData) => {
          if (responseData) {
            toast.success('Producto creado correctamente');
            onProductCreated(responseData.id);
            handleClose();
          }
        },
        onError: (error) => {
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Error al crear el producto';
          toast.error(errorMessage);
        },
        onSettled: () => {
          setIsUploadingImage(false);
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error inesperado';
      toast.error(errorMessage);
      setIsUploadingImage(false);
    }
  };

  const handleClose = () => {
    reset();
    setImageFile(null);
    setImageUrl(null);
    onOpenChange(false);
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset();
      setImageFile(null);
      setImageUrl(null);
    }
  }, [open, reset]);

  const isSubmitting = createMutation.isPending || isUploadingImage;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
              <IconPackage className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                Crear Nuevo Producto
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Completa la información del producto. El stock inicial será 0 y
                se actualizará con la compra.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4">
            <div className="space-y-6">
              {/* Image Upload Section */}
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Image Picker */}
                    <div className="flex-shrink-0 w-full md:w-64">
                      <ImagePicker
                        onImageChange={handleImageChange}
                        url={imageUrl}
                        className="w-full"
                      />
                    </div>

                    {/* Product Name - Prominent placement next to image */}
                    <div className="flex-1 space-y-2">
                      <Label
                        htmlFor="name"
                        className="flex items-center gap-2 text-base font-semibold"
                      >
                        <IconTag className="h-4 w-4" />
                        Nombre del Producto
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        {...register('name')}
                        placeholder="Ej: Cerveza Corona 355ml"
                        className="text-lg"
                        aria-required="true"
                        aria-invalid={!!errors.name}
                        aria-describedby={
                          errors.name ? 'name-error' : undefined
                        }
                      />
                      {errors.name && (
                        <p
                          id="name-error"
                          className="text-sm text-destructive flex items-center gap-1"
                        >
                          <IconAlertCircle className="h-3.5 w-3.5" />
                          {errors.name.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Ingresa un nombre descriptivo y fácil de identificar
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Classification Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <IconBuildingStore className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-base">Clasificación</h3>
                </div>
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Category */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="categoryId"
                          className="flex items-center gap-1"
                        >
                          Categoría
                          <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          onValueChange={(value) =>
                            setValue('categoryId', value)
                          }
                        >
                          <SelectTrigger
                            id="categoryId"
                            aria-label="Seleccionar categoría"
                            aria-required="true"
                            aria-invalid={!!errors.categoryId}
                          >
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories && categories.length > 0 ? (
                              categories.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id}
                                >
                                  {category.name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-muted-foreground">
                                No hay categorías disponibles
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {errors.categoryId && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <IconAlertCircle className="h-3.5 w-3.5" />
                            {errors.categoryId.message}
                          </p>
                        )}
                      </div>

                      {/* Brand */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="brandId"
                          className="flex items-center gap-1"
                        >
                          Marca
                          <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          onValueChange={(value) => setValue('brandId', value)}
                        >
                          <SelectTrigger
                            id="brandId"
                            aria-label="Seleccionar marca"
                            aria-required="true"
                            aria-invalid={!!errors.brandId}
                          >
                            <SelectValue placeholder="Selecciona una marca" />
                          </SelectTrigger>
                          <SelectContent>
                            {brands && brands.length > 0 ? (
                              brands.map((brand) => (
                                <SelectItem key={brand.id} value={brand.id}>
                                  {brand.name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-muted-foreground">
                                No hay marcas disponibles
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {errors.brandId && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <IconAlertCircle className="h-3.5 w-3.5" />
                            {errors.brandId.message}
                          </p>
                        )}
                      </div>

                      {/* Unit Measure - Now required for all products */}
                      <div className="space-y-2 col-span-2">
                        <Label
                          htmlFor="unitMeasureId"
                          className="flex items-center gap-1"
                        >
                          <IconRulerMeasure className="h-4 w-4" />
                          Unidad de Medida
                          <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          onValueChange={(value) =>
                            setValue('unitMeasureId', value)
                          }
                        >
                          <SelectTrigger
                            id="unitMeasureId"
                            aria-label="Seleccionar unidad de medida"
                            aria-required="true"
                            aria-invalid={!!errors.unitMeasureId}
                          >
                            <SelectValue placeholder="Selecciona una unidad" />
                          </SelectTrigger>
                          <SelectContent>
                            {unitMeasures && unitMeasures.length > 0 ? (
                              unitMeasures.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  {unit.name} ({unit.abbreviation})
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-muted-foreground">
                                No hay unidades de medida disponibles
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {errors.unitMeasureId && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <IconAlertCircle className="h-3.5 w-3.5" />
                            {errors.unitMeasureId.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pricing Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <IconCurrencyDollar className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-base">Precios</h3>
                </div>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cost Price */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="costPrice"
                          className="flex items-center gap-1"
                        >
                          Precio de Costo
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="costPrice"
                          type="number"
                          step="0.01"
                          {...register('costPrice', { valueAsNumber: true })}
                          placeholder="0.00"
                          aria-required="true"
                          aria-invalid={!!errors.costPrice}
                          aria-describedby={
                            errors.costPrice ? 'costPrice-error' : undefined
                          }
                        />
                        {errors.costPrice && (
                          <p
                            id="costPrice-error"
                            className="text-sm text-destructive flex items-center gap-1"
                          >
                            <IconAlertCircle className="h-3.5 w-3.5" />
                            {errors.costPrice.message}
                          </p>
                        )}
                      </div>

                      {/* Sale Price */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="salePrice"
                          className="flex items-center gap-1"
                        >
                          Precio de Venta
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="salePrice"
                          type="number"
                          step="0.01"
                          {...register('salePrice', { valueAsNumber: true })}
                          placeholder="0.00"
                          aria-required="true"
                          aria-invalid={!!errors.salePrice}
                          aria-describedby={
                            errors.salePrice ? 'salePrice-error' : undefined
                          }
                        />
                        {errors.salePrice && (
                          <p
                            id="salePrice-error"
                            className="text-sm text-destructive flex items-center gap-1"
                          >
                            <IconAlertCircle className="h-3.5 w-3.5" />
                            {errors.salePrice.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price Warning Alert */}
                    {showPriceWarning && (
                      <Alert variant="destructive">
                        <IconAlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          El precio de venta es menor que el precio de costo.
                          Esto resultará en pérdidas.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Specific Fields Section - Conditional based on business type */}
              {(businessType === 'liquor_store' || businessType === 'shoe_store') && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    {businessType === 'liquor_store' ? (
                      <IconBottle className="h-5 w-5 text-primary" />
                    ) : (
                      <IconRuler className="h-5 w-5 text-primary" />
                    )}
                    <h3 className="font-semibold text-base">
                      Información Específica
                    </h3>
                  </div>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Liquor Store Fields */}
                        {businessType === 'liquor_store' && (
                          <>
                            <div className="space-y-2">
                              <Label
                                htmlFor="volume"
                                className="flex items-center gap-1"
                              >
                                <IconBottle className="h-4 w-4" />
                                Volumen (ml)
                              </Label>
                              <Input
                                id="volume"
                                type="number"
                                {...register('volume', { valueAsNumber: true })}
                                placeholder="Ej: 355"
                                aria-label="Volumen en mililitros"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="alcoholGrade"
                                className="flex items-center gap-1"
                              >
                                <IconDroplet className="h-4 w-4" />
                                Grado Alcohólico (%)
                              </Label>
                              <Input
                                id="alcoholGrade"
                                type="number"
                                step="0.1"
                                {...register('alcoholGrade', {
                                  valueAsNumber: true,
                                })}
                                placeholder="Ej: 5.0"
                                aria-label="Grado alcohólico"
                              />
                            </div>
                          </>
                        )}

                        {/* Footwear/Shoe Store Fields */}
                        {businessType === 'shoe_store' && (
                          <>
                            <div className="space-y-2">
                              <Label
                                htmlFor="size"
                                className="flex items-center gap-1"
                              >
                                <IconRuler className="h-4 w-4" />
                                Talla / Tamaño
                              </Label>
                              <Input
                                id="size"
                                {...register('size')}
                                placeholder="Ej: 42, M, L, XL"
                                aria-label="Talla o tamaño del producto"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="color"
                                className="flex items-center gap-1"
                              >
                                <IconPalette className="h-4 w-4" />
                                Color
                              </Label>
                              <Input
                                id="color"
                                {...register('color')}
                                placeholder="Ej: Negro, Azul marino"
                                aria-label="Color del producto"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="model">Modelo</Label>
                              <Input
                                id="model"
                                {...register('model')}
                                placeholder="Ej: Air Max 90"
                                aria-label="Modelo del producto"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Identification Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <IconBarcode className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-base">Identificación</h3>
                </div>
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* SKU */}
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU</Label>
                        <Input
                          id="sku"
                          {...register('sku')}
                          placeholder="Código interno del producto"
                          aria-label="SKU del producto"
                        />
                      </div>

                      {/* Barcode */}
                      <div className="space-y-2">
                        <Label htmlFor="barcode">Código de Barras</Label>
                        <Input
                          id="barcode"
                          {...register('barcode')}
                          placeholder="EAN, UPC, etc."
                          aria-label="Código de barras"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Description Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <IconFileText className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-base">Descripción</h3>
                </div>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <Label htmlFor="description">
                        Descripción del Producto
                      </Label>
                      <Textarea
                        id="description"
                        {...register('description')}
                        placeholder="Agrega detalles adicionales sobre el producto..."
                        rows={4}
                        className="resize-none"
                        aria-label="Descripción del producto"
                      />
                      <p className="text-xs text-muted-foreground">
                        Incluye características, especificaciones o cualquier
                        información relevante
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </ScrollArea>

        <Separator />

        <DialogFooter className="px-6 py-4">
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              <IconX className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {isUploadingImage
                    ? 'Subiendo imagen...'
                    : 'Creando producto...'}
                </>
              ) : (
                <>
                  <IconPackage className="h-4 w-4 mr-2" />
                  Crear Producto
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
