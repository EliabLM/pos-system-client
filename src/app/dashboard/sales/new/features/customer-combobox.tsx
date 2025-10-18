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
  IconUserHeart,
  IconPlus,
  IconMail,
} from '@tabler/icons-react';
import { useActiveCustomers } from '@/hooks/useCustomers';
import { cn } from '@/lib/utils';

interface CustomerComboboxProps {
  value: string | null;
  onValueChange: (customerId: string | null) => void;
  onCreateClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function CustomerCombobox({
  value,
  onValueChange,
  onCreateClick,
  disabled = false,
  className,
}: CustomerComboboxProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<{
    id: string;
    name: string;
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

  // Fetch customers with debounced search
  const { data: customersData, isLoading } = useActiveCustomers(
    {
      search: debouncedSearchTerm || undefined,
    },
    { page: 1, limit: 15 }
  );

  const customers = customersData?.customers || [];

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

  // Find selected customer when value changes
  React.useEffect(() => {
    if (value && customers) {
      const customer = customers.find((c) => c.id === value);
      if (customer) {
        setSelectedCustomer({
          id: customer.id,
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
        });
      }
    } else {
      setSelectedCustomer(null);
    }
  }, [value, customers]);

  const handleCustomerSelect = (customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  }) => {
    const customerData = {
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
    };
    setSelectedCustomer(customerData);
    onValueChange(customer.id);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomer(null);
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
    if (searchTerm || !selectedCustomer) {
      setIsOpen(true);
    }
  };

  const handleCreateCustomer = () => {
    setIsOpen(false);
    onCreateClick();
  };

  // Filter customers to show max 15 results
  const displayedCustomers = React.useMemo(() => {
    if (!customers) return [];
    return customers.slice(0, 15);
  }, [customers]);

  return (
    <div ref={containerRef} className={cn('space-y-2', className)}>
      <Label htmlFor="customer-filter" className="text-sm font-medium">
        Cliente (Opcional)
      </Label>

      {selectedCustomer ? (
        <Badge
          variant="outline"
          className="flex h-10 w-full items-center justify-between gap-2 px-3 py-2 text-sm font-normal"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <IconUserHeart className="size-5 shrink-0 text-primary" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate font-medium">
                {selectedCustomer.name}
              </span>
              {selectedCustomer.email && (
                <span className="text-xs text-muted-foreground truncate">
                  {selectedCustomer.email}
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
            aria-label="Limpiar selección de cliente"
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
              id="customer-filter"
              type="text"
              placeholder="Buscar cliente por nombre, email o documento..."
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              disabled={disabled}
              className="pl-9"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={dropdownId}
              aria-autocomplete="list"
              aria-label="Buscar cliente"
            />
            {isLoading && searchTerm && (
              <IconLoader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground animate-spin" />
            )}
          </div>

          {isOpen && (
            <div
              id={dropdownId}
              role="listbox"
              aria-label="Lista de clientes"
              className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
            >
              {isLoading && searchTerm ? (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                  <IconLoader2 className="size-4 animate-spin" />
                  <span>Buscando clientes...</span>
                </div>
              ) : displayedCustomers.length > 0 ? (
                <>
                  <ScrollArea className="max-h-[320px]">
                    <div className="p-1 space-y-0.5">
                      {displayedCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          role="option"
                          aria-selected={value === customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm hover:bg-accent focus:bg-accent outline-none transition-colors min-h-[44px]"
                        >
                          <IconUserHeart className="size-5 shrink-0 text-primary" />
                          <div className="flex flex-col items-start min-w-0 flex-1">
                            <span className="font-medium truncate w-full text-left">
                              {customer.firstName} {customer.lastName}
                            </span>
                            {customer.email && (
                              <span className="text-xs text-muted-foreground truncate w-full text-left flex items-center gap-1">
                                <IconMail className="size-3" />
                                {customer.email}
                              </span>
                            )}
                            {customer.document && (
                              <span className="text-xs text-muted-foreground truncate w-full text-left">
                                {customer.documentType}: {customer.document}
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
                      onClick={handleCreateCustomer}
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent focus:bg-accent outline-none transition-colors"
                      aria-label="Crear nuevo cliente"
                    >
                      <IconPlus className="size-4" />
                      Crear Nuevo Cliente
                    </button>
                  </div>
                </>
              ) : searchTerm ? (
                <>
                  <div className="flex flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                    <IconUserHeart className="size-8 opacity-50" />
                    <span>No se encontraron clientes</span>
                    <span className="text-xs">
                      Intenta con otro término de búsqueda
                    </span>
                  </div>
                  <div className="border-t p-1">
                    <button
                      type="button"
                      onClick={handleCreateCustomer}
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent focus:bg-accent outline-none transition-colors"
                      aria-label="Crear nuevo cliente"
                    >
                      <IconPlus className="size-4" />
                      Crear Nuevo Cliente
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                    <IconSearch className="size-8 opacity-50" />
                    <span>Escribe para buscar clientes</span>
                  </div>
                  <div className="border-t p-1">
                    <button
                      type="button"
                      onClick={handleCreateCustomer}
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent focus:bg-accent outline-none transition-colors"
                      aria-label="Crear nuevo cliente"
                    >
                      <IconPlus className="size-4" />
                      Crear Nuevo Cliente
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
          ? 'Buscando clientes'
          : displayedCustomers.length > 0
          ? `${displayedCustomers.length} clientes encontrados`
          : searchTerm
          ? 'No se encontraron clientes'
          : ''}
      </span>
    </div>
  );
}
