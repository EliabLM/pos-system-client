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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconX, IconSearch } from '@tabler/icons-react';

import { useAllSuppliers } from '@/hooks/useSuppliers';
import { Supplier } from '@/generated/prisma';

import SupplierForm from './supplier-form';

// Type for Supplier with includes from API
type SupplierWithIncludes = Supplier & {
  purchases?: unknown[];
  _count?: {
    purchases: number;
  };
};

const SuppliersList = () => {
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Sheet states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [itemSelected, setItemSelected] = useState<SupplierWithIncludes | null>(null);

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
      city?: string;
      department?: string;
      isActive?: boolean;
    } = {};

    if (debouncedSearchTerm) {
      filters.search = debouncedSearchTerm;
    }

    if (cityFilter !== 'all') {
      filters.city = cityFilter;
    }

    if (departmentFilter !== 'all') {
      filters.department = departmentFilter;
    }

    if (statusFilter === 'active') {
      filters.isActive = true;
    } else if (statusFilter === 'inactive') {
      filters.isActive = false;
    }

    return filters;
  }, [debouncedSearchTerm, cityFilter, departmentFilter, statusFilter]);

  // Fetch suppliers with filters
  const { data: suppliersResponse, isLoading } = useAllSuppliers(apiFilters);

  // Extract suppliers array from response
  const suppliers = useMemo(() => {
    return suppliersResponse?.suppliers ?? [];
  }, [suppliersResponse]);

  // Get unique cities and departments for filters
  const uniqueCities = useMemo(() => {
    if (!suppliers || suppliers.length === 0) return [];
    const cities = suppliers
      .map((s) => s.city)
      .filter((city): city is string => !!city);
    return Array.from(new Set(cities)).sort();
  }, [suppliers]);

  const uniqueDepartments = useMemo(() => {
    if (!suppliers || suppliers.length === 0) return [];
    const departments = suppliers
      .map((s) => s.department)
      .filter((dept): dept is string => !!dept);
    return Array.from(new Set(departments)).sort();
  }, [suppliers]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setCityFilter('all');
    setDepartmentFilter('all');
    setStatusFilter('all');
  };

  // Check if any filter is active
  const hasActiveFilters =
    searchTerm ||
    cityFilter !== 'all' ||
    departmentFilter !== 'all' ||
    statusFilter !== 'all';

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="@container/card">
            <CardHeader>
              <CardTitle>Proveedores</CardTitle>
              <CardDescription>
                <span className="hidden @[540px]/card:block">
                  Gestiona tu base de datos de proveedores
                </span>
              </CardDescription>

              <CardAction>
                <Button
                  onClick={() => {
                    setItemSelected(null);
                    setSheetOpen(true);
                  }}
                >
                  Crear nuevo proveedor
                </Button>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SupplierForm
                    setSheetOpen={setSheetOpen}
                    itemSelected={itemSelected}
                    setItemSelected={setItemSelected}
                  />
                </Sheet>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filters */}
              <div className="space-y-4">
                <div className="flex flex-col gap-4 @[800px]/card:flex-row">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, contacto, email, teléfono o NIT..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* City Filter */}
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger className="w-full @[800px]/card:w-[180px]">
                      <SelectValue placeholder="Ciudad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las ciudades</SelectItem>
                      {uniqueCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Department Filter */}
                  <Select
                    value={departmentFilter}
                    onValueChange={setDepartmentFilter}
                  >
                    <SelectTrigger className="w-full @[800px]/card:w-[180px]">
                      <SelectValue placeholder="Departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        Todos los departamentos
                      </SelectItem>
                      {uniqueDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full @[800px]/card:w-[180px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <div className="flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                    >
                      <IconX className="size-4" />
                      Limpiar filtros
                    </Button>
                  </div>
                )}
              </div>

              {/* Data Table */}
              <DataTable
                loading={isLoading}
                data={suppliers}
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

export default SuppliersList;
