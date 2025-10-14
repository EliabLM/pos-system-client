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
  IconBuildingStore,
} from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  selectedStoreId?: string;
  onStoreChange?: (storeId: string | undefined) => void;
}

export function DashboardHeader({
  onRefresh,
  lastUpdated,
  selectedStoreId,
  onStoreChange,
}: DashboardHeaderProps) {
  const user = useStore((state) => state.user);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [relativeTime, setRelativeTime] = useState<string>('');

  // Fetch active stores for the organization (only for ADMIN users)
  const { data: stores, isLoading: isLoadingStores } = useActiveStores();

  // RBAC: Determine if user is a SELLER (can only see their assigned store)
  const isAdmin = user?.role === 'ADMIN';
  const isSeller = user?.role === 'SELLER';
  const userStoreName = user?.store?.name;

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

  return (
    <div className="flex flex-col gap-4 border-b bg-background pb-4 mb-6">
      {/* Title and Breadcrumb Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
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
        {/* Left side: Refresh and Timestamp */}
        <div className="flex flex-wrap items-center gap-3">
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

        {/* Right side: Store Selector for ADMIN or Badge for SELLER */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Store Selector for ADMIN */}
          {isAdmin && onStoreChange && (
            <div className="flex items-center gap-2">
              <Label htmlFor="store-filter" className="text-sm whitespace-nowrap">
                Filtrar por:
              </Label>
              <Select
                value={selectedStoreId || 'all'}
                onValueChange={(value) =>
                  onStoreChange(value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger
                  id="store-filter"
                  className="w-[200px]"
                  aria-label="Filtrar dashboard por tienda"
                >
                  <SelectValue placeholder="Seleccionar tienda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <IconBuildingStore className="h-4 w-4" />
                      Toda la organización
                    </div>
                  </SelectItem>
                  {stores?.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Badge for SELLER - showing assigned store */}
          {isSeller && userStoreName && (
            <Badge variant="secondary" className="gap-1.5 text-sm px-3 py-1.5">
              <IconBuildingStore className="h-4 w-4" />
              {userStoreName}
            </Badge>
          )}

          {/* Quick Actions */}
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
