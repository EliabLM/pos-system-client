'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MovementsDataTable } from './movements-data-table';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { IconFilter, IconPlus } from '@tabler/icons-react';

import { useStockMovements } from '@/hooks/useStockMovement';
import { StockMovementType } from '@/generated/prisma';
import { MovementFormSheet } from './movement-form-sheet';
import { MovementsFilters } from './movements-filters';

const MovementsList = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<StockMovementType | 'all'>(
    'all'
  );
  const [productFilter, setProductFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  // Debounce search term (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Build filters for API
  const apiFilters = useMemo(() => {
    const filters: {
      productId?: string;
      type?: StockMovementType;
      userId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
    } = {};

    if (debouncedSearchTerm) {
      filters.search = debouncedSearchTerm;
    }

    if (typeFilter !== 'all') {
      filters.type = typeFilter;
    }

    if (productFilter) {
      filters.productId = productFilter;
    }

    if (userFilter) {
      filters.userId = userFilter;
    }

    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      fromDate.setHours(0, 0, 0, 0);
      filters.dateFrom = fromDate;
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filters.dateTo = toDate;
    }

    return filters;
  }, [
    debouncedSearchTerm,
    typeFilter,
    productFilter,
    userFilter,
    dateFromFilter,
    dateToFilter,
  ]);

  const movements = useStockMovements(apiFilters);

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setTypeFilter('all');
    setProductFilter('');
    setUserFilter('');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const hasActiveFilters =
    searchTerm ||
    typeFilter !== 'all' ||
    productFilter ||
    userFilter ||
    dateFromFilter ||
    dateToFilter;

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="@container/card">
            <CardHeader>
              <CardTitle>Movimientos de Inventario</CardTitle>
              <CardDescription>
                <span className="hidden @[540px]/card:block">
                  Historial completo de todos los movimientos de stock
                </span>
                <span className="@[540px]/card:hidden">
                  Historial de movimientos
                </span>
              </CardDescription>

              <CardAction>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2 mr-2"
                  aria-label="Mostrar u ocultar filtros"
                  aria-expanded={showFilters}
                >
                  <IconFilter className="size-4" />
                  <span className="hidden sm:inline">Filtros</span>
                </Button>
                <Button
                  onClick={() => {
                    setSheetOpen(true);
                  }}
                  className="gap-2"
                  aria-label="Crear nuevo ajuste de stock"
                >
                  <IconPlus className="size-4" />
                  <span className="hidden sm:inline">Nuevo ajuste</span>
                  <span className="sm:hidden">Nuevo</span>
                </Button>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <MovementFormSheet setSheetOpen={setSheetOpen} />
                </Sheet>
              </CardAction>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Filters */}
              {showFilters && (
                <MovementsFilters
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  typeFilter={typeFilter}
                  onTypeChange={setTypeFilter}
                  productFilter={productFilter}
                  onProductChange={setProductFilter}
                  userFilter={userFilter}
                  onUserChange={setUserFilter}
                  dateFromFilter={dateFromFilter}
                  onDateFromChange={setDateFromFilter}
                  dateToFilter={dateToFilter}
                  onDateToChange={setDateToFilter}
                  onClearFilters={handleClearFilters}
                />
              )}

              {/* Data Table */}
              <MovementsDataTable
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
