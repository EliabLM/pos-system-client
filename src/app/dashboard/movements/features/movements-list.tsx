'use client';

import React, { useState } from 'react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '../features/data-table';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconFilter, IconPlus, IconX } from '@tabler/icons-react';
import { ProductFilterCombobox } from '@/components/product-filter-combobox';

import { useStockMovements } from '@/hooks/useStockMovement';
import { StockMovementType } from '@/generated/prisma';

import NewMovement from './new-movement';

const MovementsList = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const [filters, setFilters] = useState<{
    productId?: string;
    type?: StockMovementType;
    search?: string;
  }>({});

  const movements = useStockMovements(filters);

  const handleClearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some((value) => value);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="@container/card">
            <CardHeader>
              <CardTitle>Movimientos de Inventario</CardTitle>
              <CardDescription>
                <span className="hidden @[540px]/card:block">
                  Historial de todos los movimientos de inventario
                </span>
                <span className="@[540px]/card:hidden">Movimientos</span>
              </CardDescription>

              <CardAction>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2 mr-2"
                >
                  <IconFilter className="size-4" />
                  <span className="hidden sm:inline">Filtros</span>
                </Button>
                <Button
                  onClick={() => {
                    setSheetOpen(true);
                  }}
                  className="gap-2"
                >
                  <IconPlus className="size-4" />
                  <span className="hidden sm:inline">Nuevo movimiento</span>
                  <span className="sm:hidden">Nuevo</span>
                </Button>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <NewMovement setSheetOpen={setSheetOpen} />
                </Sheet>
              </CardAction>
            </CardHeader>

            {showFilters && (
              <div className="border-t border-border bg-muted/50 px-6 py-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <ProductFilterCombobox
                    selectedProductId={filters.productId}
                    onProductSelect={(productId) =>
                      setFilters((prev) => ({
                        ...prev,
                        productId,
                      }))
                    }
                  />

                  <div className="space-y-2">
                    <Label htmlFor="filter-type">Tipo de movimiento</Label>
                    <Select
                      value={filters.type || 'all'}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          type:
                            value === 'all'
                              ? undefined
                              : (value as StockMovementType),
                        }))
                      }
                    >
                      <SelectTrigger id="filter-type">
                        <SelectValue placeholder="Todos los tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        <SelectItem value="IN">Entrada</SelectItem>
                        <SelectItem value="OUT">Salida</SelectItem>
                        <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filter-search">Buscar</Label>
                    <Input
                      id="filter-search"
                      placeholder="Buscar por razón o referencia..."
                      value={filters.search || ''}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          search: e.target.value || undefined,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      onClick={handleClearFilters}
                      disabled={!hasActiveFilters}
                      className="w-full gap-2"
                    >
                      <IconX className="size-4" />
                      Limpiar filtros
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <CardContent>
              <DataTable
                loading={movements.isLoading}
                data={movements.data?.movements ?? []}
                showFilters={showFilters}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MovementsList;
