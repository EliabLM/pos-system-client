'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  IconSearch,
  IconX,
  IconLoader2,
  IconTruck,
  IconPlus,
  IconMail,
} from '@tabler/icons-react';
import { useActiveSuppliers } from '@/hooks/useSuppliers';
import { cn } from '@/lib/utils';

interface SupplierComboboxProps {
  value: string | null;
  onValueChange: (supplierId: string | null) => void;
  onCreateClick: () => void;
  disabled?: boolean;
  className?: string;
}

export default function SupplierCombobox({
  value,
  onValueChange,
  onCreateClick,
  disabled = false,
  className,
}: SupplierComboboxProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedSupplier, setSelectedSupplier] = React.useState<{
    id: string;
    name: string;
    taxId: string | null;
    email: string | null;
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

  // Fetch suppliers with debounced search
  const { data: suppliersData, isLoading } = useActiveSuppliers(
    {
      search: debouncedSearchTerm || undefined,
    },
    
  );

  const suppliers = React.useMemo(
    () => suppliersData?.suppliers || [],
    [suppliersData?.suppliers]
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

  // Find selected supplier when value changes
  React.useEffect(() => {
    if (value && suppliers) {
      const supplier = suppliers.find((c) => c.id === value);
      if (supplier) {
        setSelectedSupplier({
          id: supplier.id,
          name: supplier.name,
          taxId: supplier.taxId,
          email: supplier.email,
        });
      }
    } else {
      setSelectedSupplier(null);
    }
  }, [value, suppliers]);

  const handleSupplierSelect = (supplier: {
    id: string;
    name: string;
    taxId: string | null;
    
    email: string | null;
  }) => {
    const supplierData = {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      taxId: supplier.taxId,
    };
    setSelectedSupplier(supplierData);
    onValueChange(supplier.id);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSupplier(null);
    onValueChange(null);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen && e.target.value) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (searchTerm || !selectedSupplier) {
      setIsOpen(true);
    }
  };

  const handleCreateSupplier = () => {
    setIsOpen(false);
    onCreateClick();
  };

  // Filter suppliers to show max 15 results
  const displayedSuppliers = React.useMemo(() => {
    if (!suppliers) return [];
    return suppliers.slice(0, 15);
  }, [suppliers]);

  return (
    <div ref={containerRef} className={cn('space-y-2', className)}>
      <Label htmlFor="supplier-filter" className="text-sm font-medium">
        Proveedor *
      </Label>

      {selectedSupplier ? (
        <Badge
          variant="outline"
          className="flex h-10 w-full items-center justify-between gap-2 px-3 py-2 text-sm font-normal"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <IconTruck className="size-5 shrink-0 text-primary" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate font-medium">
                {selectedSupplier.name}
              </span>
              {selectedSupplier.email && (
                <span className="text-xs text-muted-foreground truncate">
                  {selectedSupplier.email}
                </span>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            disabled={disabled}
            className="h-5 w-5 p-0 hover:bg-destructive/10 shrink-0"
            aria-label="Limpiar selección de proveedor"
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
              id="supplier-filter"
              type="text"
              placeholder="Buscar proveedor por nombre, email o NIT..."
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              disabled={disabled}
              className="pl-9"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={dropdownId}
              aria-autocomplete="list"
              aria-label="Buscar proveedor"
            />
            {isLoading && searchTerm && (
              <IconLoader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground animate-spin" />
            )}
          </div>

          {isOpen && (
            <div
              id={dropdownId}
              role="listbox"
              aria-label="Lista de proveedores"
              className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
            >
              {isLoading && searchTerm ? (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                  <IconLoader2 className="size-4 animate-spin" />
                  <span>Buscando proveedores...</span>
                </div>
              ) : displayedSuppliers.length > 0 ? (
                <>
                  <ScrollArea className="max-h-[320px]">
                    <div className="p-1 space-y-0.5">
                      {displayedSuppliers.map((supplier) => (
                        <button
                          key={supplier.id}
                          type="button"
                          role="option"
                          aria-selected={value === supplier.id}
                          onClick={() => handleSupplierSelect(supplier)}
                          className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm hover:bg-accent focus:bg-accent outline-none transition-colors min-h-[44px]"
                        >
                          <IconTruck className="size-5 shrink-0 text-primary" />
                          <div className="flex flex-col items-start min-w-0 flex-1">
                            <span className="font-medium truncate w-full text-left">
                              {supplier.name}
                            </span>
                            {supplier.email && (
                              <span className="text-xs text-muted-foreground truncate w-full text-left flex items-center gap-1">
                                <IconMail className="size-3" />
                                {supplier.email}
                              </span>
                            )}
                            {supplier.taxId && (
                              <span className="text-xs text-muted-foreground truncate w-full text-left">
                                {supplier.taxId}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="border-t p-1">
                    <button
                      type="button"
                      onClick={handleCreateSupplier}
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent focus:bg-accent outline-none transition-colors"
                      aria-label="Crear nuevo proveedor"
                    >
                      <IconPlus className="size-4" />
                      Crear Nuevo Proveedor
                    </button>
                  </div>
                </>
              ) : searchTerm ? (
                <>
                  <div className="flex flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                    <IconTruck className="size-8 opacity-50" />
                    <span>No se encontraron proveedores</span>
                    <span className="text-xs">
                      Intenta con otro término de búsqueda
                    </span>
                  </div>
                  <div className="border-t p-1">
                    <button
                      type="button"
                      onClick={handleCreateSupplier}
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent focus:bg-accent outline-none transition-colors"
                      aria-label="Crear nuevo proveedor"
                    >
                      <IconPlus className="size-4" />
                      Crear Nuevo Proveedor
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                    <IconSearch className="size-8 opacity-50" />
                    <span>Escribe para buscar proveedores</span>
                  </div>
                  <div className="border-t p-1">
                    <button
                      type="button"
                      onClick={handleCreateSupplier}
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent focus:bg-accent outline-none transition-colors"
                      aria-label="Crear nuevo proveedor"
                    >
                      <IconPlus className="size-4" />
                      Crear Nuevo Proveedor
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading && searchTerm
          ? 'Buscando proveedores'
          : displayedSuppliers.length > 0
          ? `${displayedSuppliers.length} proveedores encontrados`
          : searchTerm
          ? 'No se encontraron proveedores'
          : ''}
      </span>
    </div>
  );
}
