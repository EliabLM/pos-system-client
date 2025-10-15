'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { NumericFormat } from 'react-number-format';
import {
  IconX,
  IconEdit,
  IconTag,
  IconCurrency,
  IconPackage,
  IconCalendar,
  IconBarcode,
  IconAlertCircle,
  IconBuildingStore,
  IconTrendingUp,
  IconTrendingDown,
  IconAdjustments,
} from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductById } from '@/hooks/useProducts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductWithIncludes } from '@/interfaces';
import { StockAdjustmentDialog } from '@/components/products/stock-adjustment-dialog';

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  onEdit?: () => void;
}

export const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  open,
  onOpenChange,
  productId,
  onEdit,
}) => {
  const { data: rawProduct, isLoading, error } = useProductById(productId);
  const [stockAdjustmentOpen, setStockAdjustmentOpen] = useState(false);

  // Cast to ProductWithIncludes since the API includes relations
  const product = rawProduct as ProductWithIncludes | null | undefined;

  // Calculate margin
  const margin = React.useMemo(() => {
    if (!product) return null;
    const salePrice = Number(product.salePrice);
    const costPrice = Number(product.costPrice);
    const marginAmount = salePrice - costPrice;
    const marginPercent = (marginAmount / costPrice) * 100;
    return {
      amount: marginAmount,
      percent: marginPercent,
    };
  }, [product]);

  // Get stock status
  const getStockStatus = () => {
    if (!product) return null;
    const { currentStock, minStock } = product;

    if (currentStock < minStock) {
      return {
        label: 'Bajo (Crítico)',
        color: 'bg-red-500',
        textColor: 'text-red-600',
        variant: 'destructive' as const,
      };
    }
    if (currentStock < minStock * 1.5) {
      return {
        label: 'Medio (Alerta)',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-600',
        variant: 'default' as const,
      };
    }
    if (currentStock < minStock * 3) {
      return {
        label: 'Bueno',
        color: 'bg-orange-500',
        textColor: 'text-orange-600',
        variant: 'secondary' as const,
      };
    }
    return {
      label: 'Alto',
      color: 'bg-green-500',
      textColor: 'text-green-600',
      variant: 'outline' as const,
    };
  };

  const stockStatus = getStockStatus();

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Error al cargar el producto</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12">
            <IconAlertCircle className="text-destructive mb-4 size-16" />
            <p className="text-muted-foreground text-center">
              No se pudo cargar la información del producto.
              <br />
              Por favor, intenta de nuevo más tarde.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle>Detalle del Producto</DialogTitle>
          <DialogDescription>
            Información completa del producto en el inventario
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-6 py-4">
            {/* Image and main info skeleton */}
            <div className="flex gap-6">
              <Skeleton className="h-64 w-64 rounded-lg" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </div>
            <Separator />
            {/* Additional info skeleton */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
        ) : product ? (
          <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
            <div className="space-y-6 py-4">
              {/* Image and Main Info */}
              <div className="flex flex-col gap-6 md:flex-row">
                <div className="flex items-center justify-center md:w-64">
                  <div className="relative h-64 w-64 overflow-hidden rounded-lg border">
                    <Image
                      src={product.image ?? '/placeholder-product.png'}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="256px"
                    />
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-2xl font-semibold">{product.name}</h3>
                    {product.description && (
                      <p className="text-muted-foreground mt-1">
                        {product.description}
                      </p>
                    )}
                  </div>

                  {product.sku && (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-xs"
                      >
                        SKU: {product.sku}
                      </Badge>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {product.category && (
                      <Badge variant="info" className="gap-1">
                        <IconTag className="size-3" />
                        {product.category.name}
                      </Badge>
                    )}
                    {product.brand && (
                      <Badge variant="secondary" className="gap-1">
                        <IconBuildingStore className="size-3" />
                        {product.brand.name}
                      </Badge>
                    )}
                    <Badge
                      variant={product.isActive ? 'default' : 'outline'}
                      className="gap-1"
                    >
                      {product.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Información Básica */}
              <div className="space-y-3">
                <h4 className="font-semibold">Información Básica</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {product.barcode && (
                    <div className="flex items-start gap-3">
                      <IconBarcode className="text-muted-foreground mt-0.5 size-5" />
                      <div>
                        <p className="text-muted-foreground text-sm">
                          Código de Barras
                        </p>
                        <p className="font-mono font-medium">
                          {product.barcode}
                        </p>
                      </div>
                    </div>
                  )}
                  {product.unitMeasure && (
                    <div className="flex items-start gap-3">
                      <IconPackage className="text-muted-foreground mt-0.5 size-5" />
                      <div>
                        <p className="text-muted-foreground text-sm">
                          Unidad de Medida
                        </p>
                        <p className="font-medium">
                          {product.unitMeasure.name} (
                          {product.unitMeasure.abbreviation})
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Precios y Margen */}
              <div className="space-y-3">
                <h4 className="font-semibold">Precios y Margen</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="flex items-start gap-3">
                    <IconCurrency className="text-muted-foreground mt-0.5 size-5" />
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Precio de Costo
                      </p>
                      <p className="text-lg font-semibold">
                        <NumericFormat
                          value={Number(product.costPrice)}
                          prefix="$"
                          thousandSeparator="."
                          decimalSeparator=","
                          displayType="text"
                        />
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <IconCurrency className="text-muted-foreground mt-0.5 size-5" />
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Precio de Venta
                      </p>
                      <p className="text-lg font-semibold text-green-600">
                        <NumericFormat
                          value={Number(product.salePrice)}
                          prefix="$"
                          thousandSeparator="."
                          decimalSeparator=","
                          displayType="text"
                        />
                      </p>
                    </div>
                  </div>

                  {margin && (
                    <div className="flex items-start gap-3">
                      {margin.amount >= 0 ? (
                        <IconTrendingUp className="text-green-600 mt-0.5 size-5" />
                      ) : (
                        <IconTrendingDown className="text-red-600 mt-0.5 size-5" />
                      )}
                      <div>
                        <p className="text-muted-foreground text-sm">
                          Margen de Ganancia
                        </p>
                        <p
                          className={`text-lg font-semibold ${
                            margin.amount >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          <NumericFormat
                            value={margin.amount}
                            prefix="$"
                            thousandSeparator="."
                            decimalSeparator=","
                            displayType="text"
                          />{' '}
                          ({margin.percent.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Inventario */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Inventario</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStockAdjustmentOpen(true)}
                  >
                    <IconAdjustments className="size-4 mr-2" />
                    Ajustar Stock
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="flex items-start gap-3">
                    <IconPackage className="text-muted-foreground mt-0.5 size-5" />
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Stock Actual
                      </p>
                      <p className="text-lg font-semibold">
                        {product.currentStock} unidades
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <IconAlertCircle className="text-muted-foreground mt-0.5 size-5" />
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Stock Mínimo
                      </p>
                      <p className="text-lg font-semibold">
                        {product.minStock} unidades
                      </p>
                    </div>
                  </div>

                  {stockStatus && (
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 size-5 rounded-full ${stockStatus.color}`}
                      />
                      <div>
                        <p className="text-muted-foreground text-sm">
                          Estado del Stock
                        </p>
                        <Badge variant={stockStatus.variant} className="mt-1">
                          {stockStatus.label}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Información del Sistema */}
              <div className="space-y-3">
                <h4 className="font-semibold">Información del Sistema</h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <IconCalendar className="text-muted-foreground mt-0.5 size-5" />
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Fecha de Creación
                      </p>
                      <p className="font-medium">
                        {new Date(product.createdAt).toLocaleDateString(
                          'es-ES',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <IconCalendar className="text-muted-foreground mt-0.5 size-5" />
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Última Actualización
                      </p>
                      <p className="font-medium">
                        {new Date(product.updatedAt).toLocaleDateString(
                          'es-ES',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Últimos Movimientos de Stock */}
              {product.stockMovements && product.stockMovements.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold">
                      Últimos Movimientos de Stock
                    </h4>
                    <div className="space-y-2">
                      {product.stockMovements.slice(0, 5).map((movement) => (
                        <div
                          key={movement.id}
                          className="bg-muted/50 flex items-center justify-between rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                movement.type === 'IN'
                                  ? 'default'
                                  : movement.type === 'OUT'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {movement.type === 'IN'
                                ? 'Entrada'
                                : movement.type === 'OUT'
                                  ? 'Salida'
                                  : 'Ajuste'}
                            </Badge>
                            <div>
                              <p className="text-sm font-medium">
                                {movement.quantity > 0 ? '+' : ''}
                                {movement.quantity} unidades
                              </p>
                              {movement.reason && (
                                <p className="text-muted-foreground text-xs">
                                  {movement.reason}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {new Date(movement.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <IconX className="size-4" />
            Cerrar
          </Button>
          {onEdit && product && (
            <Button onClick={onEdit}>
              <IconEdit className="size-4" />
              Editar Producto
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Stock Adjustment Dialog */}
      {product && (
        <StockAdjustmentDialog
          open={stockAdjustmentOpen}
          onOpenChange={setStockAdjustmentOpen}
          productId={product.id}
          productName={product.name}
          currentStock={product.currentStock}
        />
      )}
    </Dialog>
  );
};
