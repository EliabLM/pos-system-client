'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sale, SaleStatus } from '@/generated/prisma';
import { parseLocalDateStart, parseLocalDateEnd } from '@/lib/date-utils';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from '@/components/ui/card';
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

import { useSales } from '@/hooks/useSales';
import { useActiveStores } from '@/hooks/useStores';
import { useActiveCustomers } from '@/hooks/useCustomers';
import { DataTable } from './data-table';

// Interfaces para filtros locales
interface SaleFiltersState {
  search?: string;
  status?: SaleStatus;
  storeId?: string;
  customerId?: string;
  dateFrom?: string; // ISO string para inputs de tipo date
  dateTo?: string;
  minTotal?: string;
  maxTotal?: string;
}

export const SaleList = () => {
  const router = useRouter();

  const [itemSelected, setItemSelected] = useState<Sale | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Estado local de filtros
  const [filters, setFilters] = useState<SaleFiltersState>({});

  // Convertir filtros locales al formato esperado por el hook
  const salesFilters = {
    search: filters.search,
    status: filters.status,
    storeId: filters.storeId,
    customerId: filters.customerId,
    dateFrom: filters.dateFrom ? parseLocalDateStart(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? parseLocalDateEnd(filters.dateTo) : undefined,
    minAmount: filters.minTotal ? parseFloat(filters.minTotal) : undefined,
    maxAmount: filters.maxTotal ? parseFloat(filters.maxTotal) : undefined,
  };

  const sales = useSales(salesFilters);
  const stores = useActiveStores();
  const customers = useActiveCustomers();

  // Extraer el array de ventas del objeto de respuesta
  const salesData = sales.data?.sales ?? [];
  const customersData = customers.data?.customers ?? [];

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
              <CardTitle>Ventas</CardTitle>
              <CardDescription>
                <span className="hidden @[540px]/card:block">
                  Listado de todas las ventas
                </span>
                <span className="@[540px]/card:hidden">Ventas</span>
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
                    setItemSelected(null);
                    router.push('/dashboard/sales/new');
                  }}
                  className="gap-2"
                >
                  <IconPlus className="size-4" />
                  <span className="hidden sm:inline">Crear nueva venta</span>
                  <span className="sm:hidden">Nueva</span>
                </Button>
              </CardAction>
            </CardHeader>

            {showFilters && (
              <div className="border-t border-border bg-muted/50 px-6 py-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {/* Búsqueda de texto */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-search">Buscar</Label>
                    <Input
                      id="filter-search"
                      placeholder="Número de venta o cliente..."
                      value={filters.search || ''}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          search: e.target.value || undefined,
                        }))
                      }
                      aria-describedby="filter-search-description"
                    />
                    <span id="filter-search-description" className="sr-only">
                      Buscar por número de venta o nombre de cliente
                    </span>
                  </div>

                  {/* Estado de venta */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-status">Estado</Label>
                    <Select
                      value={filters.status || 'all'}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          status:
                            value === 'all' ? undefined : (value as SaleStatus),
                        }))
                      }
                    >
                      <SelectTrigger id="filter-status">
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="PAID">Pagada</SelectItem>
                        <SelectItem value="PENDING">Pendiente</SelectItem>
                        <SelectItem value="OVERDUE">Vencida</SelectItem>
                        <SelectItem value="CANCELLED">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tienda */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-store">Tienda</Label>
                    <Select
                      value={filters.storeId || 'all'}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          storeId: value === 'all' ? undefined : value,
                        }))
                      }
                    >
                      <SelectTrigger id="filter-store">
                        <SelectValue placeholder="Todas las tiendas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las tiendas</SelectItem>
                        {stores.data?.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cliente */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-customer">Cliente</Label>
                    <Select
                      value={filters.customerId || 'all'}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          customerId: value === 'all' ? undefined : value,
                        }))
                      }
                    >
                      <SelectTrigger id="filter-customer">
                        <SelectValue placeholder="Todos los clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los clientes</SelectItem>
                        {customersData.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.firstName} {customer.lastName}
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
                      value={filters.dateFrom || ''}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateFrom: e.target.value || undefined,
                        }))
                      }
                      max={filters.dateTo || undefined}
                      aria-describedby="filter-date-from-description"
                    />
                    <span id="filter-date-from-description" className="sr-only">
                      Filtrar ventas desde esta fecha
                    </span>
                  </div>

                  {/* Fecha hasta */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-date-to">Fecha hasta</Label>
                    <Input
                      id="filter-date-to"
                      type="date"
                      value={filters.dateTo || ''}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateTo: e.target.value || undefined,
                        }))
                      }
                      min={filters.dateFrom || undefined}
                      aria-describedby="filter-date-to-description"
                    />
                    <span id="filter-date-to-description" className="sr-only">
                      Filtrar ventas hasta esta fecha
                    </span>
                  </div>

                  {/* Monto mínimo */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-min-total">Monto mínimo</Label>
                    <Input
                      id="filter-min-total"
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={filters.minTotal || ''}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          minTotal: e.target.value || undefined,
                        }))
                      }
                      aria-describedby="filter-min-total-description"
                    />
                    <span id="filter-min-total-description" className="sr-only">
                      Filtrar ventas con monto mínimo
                    </span>
                  </div>

                  {/* Monto máximo */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-max-total">Monto máximo</Label>
                    <Input
                      id="filter-max-total"
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={filters.maxTotal || ''}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          maxTotal: e.target.value || undefined,
                        }))
                      }
                      aria-describedby="filter-max-total-description"
                    />
                    <span id="filter-max-total-description" className="sr-only">
                      Filtrar ventas con monto máximo
                    </span>
                  </div>

                  {/* Botón limpiar filtros */}
                  <div className="flex items-end sm:col-span-2 lg:col-span-3 xl:col-span-1">
                    <Button
                      variant="ghost"
                      onClick={handleClearFilters}
                      disabled={!hasActiveFilters}
                      className="w-full gap-2"
                      aria-label="Limpiar todos los filtros"
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
                loading={sales.isLoading}
                data={salesData}
                showFilters={showFilters}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
