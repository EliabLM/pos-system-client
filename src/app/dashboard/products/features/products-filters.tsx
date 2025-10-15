'use client';

import React from 'react';
import { IconSearch, IconX, IconFilter } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useActiveCategories } from '@/hooks/useCategories';
import { useActiveBrands } from '@/hooks/useBrands';

interface ProductsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  brandFilter: string;
  onBrandChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  stockFilter: string;
  onStockChange: (value: string) => void;
  onClearFilters: () => void;
}

export const ProductsFilters: React.FC<ProductsFiltersProps> = ({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  brandFilter,
  onBrandChange,
  statusFilter,
  onStatusChange,
  stockFilter,
  onStockChange,
  onClearFilters,
}) => {
  const { data: categories, isLoading: categoriesLoading } = useActiveCategories();
  const { data: brands, isLoading: brandsLoading } = useActiveBrands();

  // Calculate active filters count
  const activeFiltersCount = [
    searchTerm,
    categoryFilter !== 'all',
    brandFilter !== 'all',
    statusFilter !== 'all',
    stockFilter !== 'all',
  ].filter(Boolean).length;

  const hasActiveFilters = activeFiltersCount > 0;

  const removeFilter = (filterType: string) => {
    switch (filterType) {
      case 'search':
        onSearchChange('');
        break;
      case 'category':
        onCategoryChange('all');
        break;
      case 'brand':
        onBrandChange('all');
        break;
      case 'status':
        onStatusChange('all');
        break;
      case 'stock':
        onStockChange('all');
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Clear Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex-1 space-y-2">
          <Label htmlFor="search-products">Buscar productos</Label>
          <div className="relative">
            <IconSearch className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              id="search-products"
              placeholder="Buscar por nombre, SKU o código de barras..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                onClick={() => onSearchChange('')}
              >
                <IconX className="size-4" />
                <span className="sr-only">Limpiar búsqueda</span>
              </Button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="md:mb-0"
          >
            <IconX className="size-4" />
            Limpiar filtros ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Filter Selects */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Category Filter */}
        <div className="space-y-2">
          <Label htmlFor="filter-category">Categoría</Label>
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger id="filter-category">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categoriesLoading ? (
                <SelectItem value="loading" disabled>
                  Cargando...
                </SelectItem>
              ) : (
                categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Brand Filter */}
        <div className="space-y-2">
          <Label htmlFor="filter-brand">Marca</Label>
          <Select value={brandFilter} onValueChange={onBrandChange}>
            <SelectTrigger id="filter-brand">
              <SelectValue placeholder="Todas las marcas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las marcas</SelectItem>
              {brandsLoading ? (
                <SelectItem value="loading" disabled>
                  Cargando...
                </SelectItem>
              ) : (
                brands?.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="filter-status">Estado</Label>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger id="filter-status">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stock Level Filter */}
        <div className="space-y-2">
          <Label htmlFor="filter-stock">Nivel de Stock</Label>
          <Select value={stockFilter} onValueChange={onStockChange}>
            <SelectTrigger id="filter-stock">
              <SelectValue placeholder="Todos los niveles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los niveles</SelectItem>
              <SelectItem value="low">Bajo (Crítico)</SelectItem>
              <SelectItem value="medium">Medio (Alerta)</SelectItem>
              <SelectItem value="good">Bueno</SelectItem>
              <SelectItem value="high">Alto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <IconFilter className="size-4" />
            <span>Filtros activos:</span>
          </div>

          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Búsqueda: {searchTerm}
              <button
                onClick={() => removeFilter('search')}
                className="hover:text-foreground ml-1"
              >
                <IconX className="size-3" />
              </button>
            </Badge>
          )}

          {categoryFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Categoría:{' '}
              {categories?.find((c) => c.id === categoryFilter)?.name}
              <button
                onClick={() => removeFilter('category')}
                className="hover:text-foreground ml-1"
              >
                <IconX className="size-3" />
              </button>
            </Badge>
          )}

          {brandFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Marca: {brands?.find((b) => b.id === brandFilter)?.name}
              <button
                onClick={() => removeFilter('brand')}
                className="hover:text-foreground ml-1"
              >
                <IconX className="size-3" />
              </button>
            </Badge>
          )}

          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Estado: {statusFilter === 'active' ? 'Activos' : 'Inactivos'}
              <button
                onClick={() => removeFilter('status')}
                className="hover:text-foreground ml-1"
              >
                <IconX className="size-3" />
              </button>
            </Badge>
          )}

          {stockFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Stock:{' '}
              {stockFilter === 'low'
                ? 'Bajo'
                : stockFilter === 'medium'
                  ? 'Medio'
                  : stockFilter === 'good'
                    ? 'Bueno'
                    : 'Alto'}
              <button
                onClick={() => removeFilter('stock')}
                className="hover:text-foreground ml-1"
              >
                <IconX className="size-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
