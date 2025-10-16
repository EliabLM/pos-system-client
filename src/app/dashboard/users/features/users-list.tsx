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
import { IconFilter, IconPlus, IconUserPlus } from '@tabler/icons-react';

import { useUsers } from '@/hooks/useUsers';
import { User, UserRole } from '@/generated/prisma';
import { useStore } from '@/store';

import UserFormSheet from './user-form-sheet';
import { UsersFilters } from './users-filters';
import { UserDetailDialog } from './user-detail-dialog';

const UsersList = () => {
  const currentUser = useStore((state) => state.user);
  const isAdmin = currentUser?.role === 'ADMIN';

  // Sheet and Dialog states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemSelected, setItemSelected] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [emailVerifiedFilter, setEmailVerifiedFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

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
      role?: UserRole;
      isActive?: boolean;
      storeId?: string;
    } = {};

    if (debouncedSearchTerm) {
      filters.search = debouncedSearchTerm;
    }

    if (roleFilter !== 'all') {
      filters.role = roleFilter as UserRole;
    }

    if (statusFilter === 'active') {
      filters.isActive = true;
    } else if (statusFilter === 'inactive') {
      filters.isActive = false;
    }

    if (storeFilter !== 'all' && storeFilter !== 'none') {
      filters.storeId = storeFilter;
    }

    return filters;
  }, [debouncedSearchTerm, roleFilter, statusFilter, storeFilter]);

  // Fetch users with filters
  const users = useUsers(apiFilters);

  // Filter by email verified (client-side)
  const filteredUsers = useMemo(() => {
    if (!users.data) return [];

    let filtered = users.data;

    // Filter by email verification status
    if (emailVerifiedFilter === 'verified') {
      filtered = filtered.filter((user) => user.emailVerified);
    } else if (emailVerifiedFilter === 'pending') {
      filtered = filtered.filter((user) => !user.emailVerified);
    }

    // Filter by "no store" if selected
    if (storeFilter === 'none') {
      filtered = filtered.filter((user) => !user.storeId);
    }

    return filtered;
  }, [users.data, emailVerifiedFilter, storeFilter]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
    setStoreFilter('all');
    setEmailVerifiedFilter('all');
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="@container/card">
            <CardHeader>
              <CardTitle>Usuarios</CardTitle>
              <CardDescription>
                <span className="hidden @[540px]/card:block">
                  Gestiona los usuarios del sistema
                </span>
                <span className="@[540px]/card:hidden">Usuarios</span>
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
                {isAdmin && (
                  <Button
                    onClick={() => {
                      setItemSelected(null);
                      setSheetOpen(true);
                    }}
                    className="gap-2"
                  >
                    <IconPlus className="size-4 sm:hidden" />
                    <IconUserPlus className="size-4 hidden sm:inline" />
                    <span className="hidden sm:inline">Crear nuevo usuario</span>
                    <span className="sm:hidden">Nuevo</span>
                  </Button>
                )}
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <UserFormSheet
                    setSheetOpen={setSheetOpen}
                    itemSelected={itemSelected}
                    setItemSelected={setItemSelected}
                  />
                </Sheet>
              </CardAction>
            </CardHeader>

            {showFilters && (
              <div className="border-t border-border bg-muted/50 px-6 py-4">
                <UsersFilters
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  roleFilter={roleFilter}
                  onRoleChange={setRoleFilter}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  storeFilter={storeFilter}
                  onStoreChange={setStoreFilter}
                  emailVerifiedFilter={emailVerifiedFilter}
                  onEmailVerifiedChange={setEmailVerifiedFilter}
                  onClearFilters={handleClearFilters}
                />
              </div>
            )}

            <CardContent>
              <DataTable
                loading={users.isLoading}
                data={filteredUsers}
                setSheetOpen={setSheetOpen}
                setItemSelected={setItemSelected}
                setDialogOpen={setDialogOpen}
                setSelectedUserId={setSelectedUserId}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Detail Dialog */}
      <UserDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={selectedUserId}
      />
    </div>
  );
};

export default UsersList;
