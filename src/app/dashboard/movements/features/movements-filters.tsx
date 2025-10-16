'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { IconX, IconFilter } from '@tabler/icons-react';
import { ProductFilterCombobox } from '@/components/product-filter-combobox';
import { useActiveUsers } from '@/hooks/useUsers';
import { StockMovementType } from '@/generated/prisma';
import { Badge } from '@/components/ui/badge';

interface MovementsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  typeFilter: StockMovementType | 'all';
  onTypeChange: (value: StockMovementType | 'all') => void;
  productFilter: string;
  onProductChange: (value: string) => void;
  userFilter: string;
  onUserChange: (value: string) => void;
  dateFromFilter: string;
  onDateFromChange: (value: string) => void;
  dateToFilter: string;
  onDateToChange: (value: string) => void;
  onClearFilters: () => void;
}

export function MovementsFilters({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeChange,
  productFilter,
  onProductChange,
  userFilter,
  onUserChange,
  dateFromFilter,
  onDateFromChange,
  dateToFilter,
  onDateToChange,
  onClearFilters,
}: MovementsFiltersProps) {
  const users = useActiveUsers();

  // Count active filters
  const activeFiltersCount = [
    searchTerm,
    typeFilter !== 'all' ? typeFilter : null,
    productFilter,
    userFilter,
    dateFromFilter,
    dateToFilter,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconFilter className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Filtros</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          className="gap-2"
          aria-label="Limpiar todos los filtros"
        >
          <IconX className="size-4" />
          <span className="hidden sm:inline">Limpiar</span>
        </Button>
      </div>

      {/* Filter Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Búsqueda de texto */}
        <div className="space-y-2">
          <Label htmlFor="filter-search">Buscar</Label>
          <Input
            id="filter-search"
            placeholder="Razón o referencia..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-describedby="filter-search-description"
          />
          <span id="filter-search-description" className="sr-only">
            Buscar por razón del movimiento o referencia
          </span>
        </div>

        {/* Tipo de movimiento */}
        <div className="space-y-2">
          <Label htmlFor="filter-type">Tipo de movimiento</Label>
          <Select
            value={typeFilter}
            onValueChange={(value) =>
              onTypeChange(value as StockMovementType | 'all')
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

        {/* Producto */}
        <div className="space-y-2">
          <Label>Producto</Label>
          <ProductFilterCombobox
            selectedProductId={productFilter || undefined}
            onProductSelect={(productId) =>
              onProductChange(productId || '')
            }
          />
        </div>

        {/* Usuario */}
        <div className="space-y-2">
          <Label htmlFor="filter-user">Usuario</Label>
          <Select
            value={userFilter || 'all'}
            onValueChange={(value) =>
              onUserChange(value === 'all' ? '' : value)
            }
          >
            <SelectTrigger id="filter-user">
              <SelectValue placeholder="Todos los usuarios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los usuarios</SelectItem>
              {users.data?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fecha desde */}
        <div className="space-y-2">
          <Label htmlFor="filter-date-from">Fecha desde</Label>
          <Input
            id="filter-date-from"
            type="date"
            value={dateFromFilter}
            onChange={(e) => onDateFromChange(e.target.value)}
            max={dateToFilter || undefined}
            aria-describedby="filter-date-from-description"
          />
          <span id="filter-date-from-description" className="sr-only">
            Filtrar movimientos desde esta fecha
          </span>
        </div>

        {/* Fecha hasta */}
        <div className="space-y-2">
          <Label htmlFor="filter-date-to">Fecha hasta</Label>
          <Input
            id="filter-date-to"
            type="date"
            value={dateToFilter}
            onChange={(e) => onDateToChange(e.target.value)}
            min={dateFromFilter || undefined}
            aria-describedby="filter-date-to-description"
          />
          <span id="filter-date-to-description" className="sr-only">
            Filtrar movimientos hasta esta fecha
          </span>
        </div>
      </div>
    </div>
  );
}
