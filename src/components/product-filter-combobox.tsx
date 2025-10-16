'use client';

import * as React from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  IconSearch,
  IconX,
  IconLoader2,
  IconPackage,
} from '@tabler/icons-react';
import { useProducts } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

interface ProductFilterComboboxProps {
  selectedProductId?: string;
  onProductSelect: (productId: string | undefined) => void;
  disabled?: boolean;
  className?: string;
}

export function ProductFilterCombobox({
  selectedProductId,
  onProductSelect,
  disabled = false,
  className,
}: ProductFilterComboboxProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<{
    id: string;
    name: string;
    image: string | null;
  } | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownId = React.useId();

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch products with debounced search
  const { data: products, isLoading } = useProducts(
    {
      search: debouncedSearchTerm || undefined,
    },
    false
  );

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Find selected product when selectedProductId changes
  React.useEffect(() => {
    if (selectedProductId && products) {
      const product = products.find((p) => p.id === selectedProductId);
      if (product) {
        setSelectedProduct({
          id: product.id,
          name: product.name,
          image: product.image,
        });
      }
    } else {
      setSelectedProduct(null);
    }
  }, [selectedProductId, products]);

  const handleProductSelect = (product: {
    id: string;
    name: string;
    image: string | null;
  }) => {
    setSelectedProduct(product);
    onProductSelect(product.id);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProduct(null);
    onProductSelect(undefined);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen && e.target.value) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (searchTerm || !selectedProduct) {
      setIsOpen(true);
    }
  };

  // Filter products to show max 15 results
  const displayedProducts = React.useMemo(() => {
    if (!products) return [];
    return products.slice(0, 15);
  }, [products]);

  return (
    <div ref={containerRef} className={cn('space-y-2', className)}>
      <Label htmlFor="product-filter">Producto</Label>

      {selectedProduct ? (
        <Badge
          variant="outline"
          className="flex h-9 w-full items-center justify-between gap-2 px-3 py-2 text-sm font-normal"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedProduct.image ? (
              <Image
                src={selectedProduct.image}
                alt={selectedProduct.name}
                width={20}
                height={20}
                className="rounded object-cover size-5 shrink-0"
              />
            ) : (
              <IconPackage className="size-5 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{selectedProduct.name}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            disabled={disabled}
            className="h-5 w-5 p-0 hover:bg-destructive/10 shrink-0"
            aria-label="Limpiar selección de producto"
          >
            <IconX className="size-3" />
          </Button>
        </Badge>
      ) : (
        <div className="relative">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              id="product-filter"
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              disabled={disabled}
              className="pl-9"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={dropdownId}
              aria-autocomplete="list"
              aria-label="Buscar producto para filtrar"
            />
            {isLoading && searchTerm && (
              <IconLoader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground animate-spin" />
            )}
          </div>

          {isOpen && (
            <div
              id={dropdownId}
              role="listbox"
              aria-label="Lista de productos"
              className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
            >
              {isLoading && searchTerm ? (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                  <IconLoader2 className="size-4 animate-spin" />
                  <span>Buscando productos...</span>
                </div>
              ) : displayedProducts.length > 0 ? (
                <ScrollArea className="h-[360px]">
                  <div className="p-1 space-y-0.5">
                    {displayedProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        role="option"
                        aria-selected={selectedProductId === product.id}
                        onClick={() =>
                          handleProductSelect({
                            id: product.id,
                            name: product.name,
                            image: product.image,
                          })
                        }
                        className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm hover:bg-accent focus:bg-accent outline-none transition-colors min-h-[44px]"
                      >
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={32}
                            height={32}
                            className="rounded object-cover size-8 shrink-0"
                          />
                        ) : (
                          <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
                            <IconPackage className="size-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className="font-medium truncate w-full text-left">
                            {product.name}
                          </span>
                          {product.sku && (
                            <span className="text-xs text-muted-foreground truncate w-full text-left">
                              SKU: {product.sku}
                            </span>
                          )}
                        </div>
                        {product.currentStock !== null && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            Stock: {product.currentStock}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : searchTerm ? (
                <div className="flex flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                  <IconPackage className="size-8 opacity-50" />
                  <span>No se encontraron productos</span>
                  <span className="text-xs">
                    Intenta con otro término de búsqueda
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                  <IconSearch className="size-8 opacity-50" />
                  <span>Escribe para buscar productos</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading && searchTerm
          ? 'Buscando productos'
          : displayedProducts.length > 0
          ? `${displayedProducts.length} productos encontrados`
          : searchTerm
          ? 'No se encontraron productos'
          : ''}
      </span>
    </div>
  );
}
