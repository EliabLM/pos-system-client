'use client';

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
import { IconX, IconSearch } from '@tabler/icons-react';
import { useActiveStores } from '@/hooks/useStores';
import { UserRole } from '@/generated/prisma';

interface UsersFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  storeFilter: string;
  onStoreChange: (value: string) => void;
  emailVerifiedFilter: string;
  onEmailVerifiedChange: (value: string) => void;
  onClearFilters: () => void;
}

export function UsersFilters({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleChange,
  statusFilter,
  onStatusChange,
  storeFilter,
  onStoreChange,
  emailVerifiedFilter,
  onEmailVerifiedChange,
  onClearFilters,
}: UsersFiltersProps) {
  const { data: activeStores } = useActiveStores();

  const hasActiveFilters =
    searchTerm ||
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    storeFilter !== 'all' ||
    emailVerifiedFilter !== 'all';

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="filter-search" className="text-sm font-medium">
          Buscar
        </Label>
        <div className="relative">
          <IconSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="filter-search"
            placeholder="Nombre, email, usuario..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            aria-describedby="filter-search-description"
          />
          <span id="filter-search-description" className="sr-only">
            Buscar por nombre completo, email o nombre de usuario
          </span>
        </div>
      </div>

      {/* Role Filter */}
      <div className="space-y-2">
        <Label htmlFor="filter-role" className="text-sm font-medium">
          Rol
        </Label>
        <Select value={roleFilter} onValueChange={onRoleChange}>
          <SelectTrigger id="filter-role">
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="ADMIN">Administrador</SelectItem>
            <SelectItem value="SELLER">Vendedor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <Label htmlFor="filter-status" className="text-sm font-medium">
          Estado
        </Label>
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

      {/* Store Filter */}
      <div className="space-y-2">
        <Label htmlFor="filter-store" className="text-sm font-medium">
          Tienda
        </Label>
        <Select value={storeFilter} onValueChange={onStoreChange}>
          <SelectTrigger id="filter-store">
            <SelectValue placeholder="Todas las tiendas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las tiendas</SelectItem>
            <SelectItem value="none">Sin tienda asignada</SelectItem>
            {activeStores?.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Email Verified Filter */}
      <div className="space-y-2">
        <Label htmlFor="filter-email-verified" className="text-sm font-medium">
          Verificación de Email
        </Label>
        <Select value={emailVerifiedFilter} onValueChange={onEmailVerifiedChange}>
          <SelectTrigger id="filter-email-verified">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="verified">Verificados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters Button */}
      <div className="flex items-end sm:col-span-2 lg:col-span-3 xl:col-span-1">
        <Button
          variant="ghost"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          className="w-full gap-2"
          aria-label="Limpiar todos los filtros"
        >
          <IconX className="size-4" />
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
