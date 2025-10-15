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
import { DataTable } from './data-table';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';

import { useProducts } from '@/hooks/useProducts';
import { ProductWithIncludesNumberPrice } from '@/interfaces';

import NewProduct from './new-product';
import { ProductsFilters } from './products-filters';

const ProductsList = () => {
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [itemSelected, setItemSelected] =
    useState<ProductWithIncludesNumberPrice | null>(null);

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
      search?: string;
      categoryId?: string;
      brandId?: string;
      isActive?: boolean;
    } = {};

    if (debouncedSearchTerm) {
      filters.search = debouncedSearchTerm;
    }

    if (categoryFilter !== 'all') {
      filters.categoryId = categoryFilter;
    }

    if (brandFilter !== 'all') {
      filters.brandId = brandFilter;
    }

    if (statusFilter === 'active') {
      filters.isActive = true;
    } else if (statusFilter === 'inactive') {
      filters.isActive = false;
    }

    return filters;
  }, [debouncedSearchTerm, categoryFilter, brandFilter, statusFilter]);

  // Fetch products with filters
  const products = useProducts(apiFilters);

  // Filter by stock level (client-side since API doesn't support this filter)
  const filteredProducts = useMemo(() => {
    if (!products.data || stockFilter === 'all') {
      return products.data ?? [];
    }

    return products.data.filter((product) => {
      const { currentStock, minStock } = product;

      switch (stockFilter) {
        case 'low':
          return currentStock < minStock;
        case 'medium':
          return currentStock >= minStock && currentStock < minStock * 1.5;
        case 'good':
          return currentStock >= minStock * 1.5 && currentStock < minStock * 3;
        case 'high':
          return currentStock >= minStock * 3;
        default:
          return true;
      }
    });
  }, [products.data, stockFilter]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setCategoryFilter('all');
    setBrandFilter('all');
    setStatusFilter('all');
    setStockFilter('all');
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="@container/card">
            <CardHeader>
              <CardTitle>Productos</CardTitle>
              <CardDescription>
                <span className="hidden @[540px]/card:block">
                  Gestiona tu inventario de productos
                </span>
              </CardDescription>

              <CardAction>
                <Button
                  onClick={() => {
                    setItemSelected(null);
                    setSheetOpen(true);
                  }}
                >
                  Crear nuevo producto
                </Button>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <NewProduct
                    setSheetOpen={setSheetOpen}
                    itemSelected={itemSelected}
                    setItemSelected={setItemSelected}
                  />
                </Sheet>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filters */}
              <ProductsFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                categoryFilter={categoryFilter}
                onCategoryChange={setCategoryFilter}
                brandFilter={brandFilter}
                onBrandChange={setBrandFilter}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                stockFilter={stockFilter}
                onStockChange={setStockFilter}
                onClearFilters={handleClearFilters}
              />

              {/* Data Table */}
              <DataTable
                loading={products.isLoading}
                data={filteredProducts}
                setSheetOpen={setSheetOpen}
                setItemSelected={setItemSelected}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductsList;
