'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  IconDashboard,
  IconRefresh,
  IconPlus,
  IconFileAnalytics,
} from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useStore } from '@/store';
import { useActiveStores } from '@/hooks/useStores';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardHeaderProps {
  onRefresh?: () => void;
  lastUpdated?: Date;
  showStoreSelector?: boolean;
}

export function DashboardHeader({
  onRefresh,
  lastUpdated,
  showStoreSelector = true,
}: DashboardHeaderProps) {
  const user = useStore((state) => state.user);
  const globalStoreId = useStore((state) => state.storeId);
  const setGlobalStoreId = useStore((state) => state.setStoreId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [relativeTime, setRelativeTime] = useState<string>('');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // Fetch active stores for the organization
  const { data: stores, isLoading: isLoadingStores } = useActiveStores();

  // Initialize selected store from user's storeId or global store state
  useEffect(() => {
    if (globalStoreId) {
      // If there's a global store ID in Zustand, use it
      setSelectedStoreId(globalStoreId);
    } else if (user?.storeId) {
      // Otherwise fall back to user's default store
      setSelectedStoreId(user.storeId);
      setGlobalStoreId(user.storeId);
    } else if (stores && stores.length === 1) {
      // Auto-select if only one store available
      setSelectedStoreId(stores[0].id);
      setGlobalStoreId(stores[0].id);
    }
  }, [user?.storeId, stores, globalStoreId, setGlobalStoreId]);

  // Update relative time every minute
  useEffect(() => {
    const updateRelativeTime = () => {
      if (lastUpdated) {
        const formatted = formatDistanceToNow(lastUpdated, {
          addSuffix: true,
          locale: es,
        });
        setRelativeTime(formatted);
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Handle manual refresh
  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        // Add a minimum delay to show the animation
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  // Handle store selection change
  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId);
    // Update Zustand store so all dashboard components refetch with new storeId
    setGlobalStoreId(storeId);
  };

  // Determine if we should show the store selector
  const shouldShowStoreSelector =
    showStoreSelector && stores && stores.length > 1 && !isLoadingStores;

  // Get current store name for display
  const currentStoreName =
    stores?.find((s) => s.id === selectedStoreId)?.name || 'Todas las tiendas';

  return (
    <div className="flex flex-col gap-4 border-b bg-background pb-4 mb-6">
      {/* Title and Breadcrumb Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconDashboard className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Dashboard
          </h1>
        </div>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Inicio</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Filters and Actions Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left side: Global Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Store Selector */}
          {shouldShowStoreSelector && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Tienda:
              </span>
              <Select
                value={selectedStoreId || undefined}
                onValueChange={handleStoreChange}
              >
                <SelectTrigger
                  className="w-[200px]"
                  aria-label="Seleccionar tienda"
                >
                  <SelectValue placeholder="Seleccionar tienda">
                    {currentStoreName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Store Selector Loading State */}
          {isLoadingStores && showStoreSelector && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Tienda:
              </span>
              <Skeleton className="h-9 w-[200px]" />
            </div>
          )}

          {/* Refresh Button with Tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label="Actualizar datos del dashboard"
                className="shrink-0"
              >
                <IconRefresh
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Actualizar datos</p>
            </TooltipContent>
          </Tooltip>

          {/* Last Updated Timestamp */}
          {lastUpdated && relativeTime && (
            <span className="text-sm text-muted-foreground">
              Actualizado {relativeTime}
            </span>
          )}
        </div>

        {/* Right side: Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild className="gap-2">
            <Link href="/dashboard/sales/new">
              <IconPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva Venta</span>
              <span className="sm:hidden">Venta</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="gap-2">
            <Link href="#">
              <IconFileAnalytics className="h-4 w-4" />
              <span className="hidden sm:inline">Ver Reportes</span>
              <span className="sm:hidden">Reportes</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
