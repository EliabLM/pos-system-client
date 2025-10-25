'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  IconUser,
  IconMail,
  IconAt,
  IconShieldCheck,
  IconBuilding,
  IconBuildingStore,
  IconCalendar,
  IconClock,
  IconCircleCheck,
  IconCircleX,
  IconShieldCheckFilled,
} from '@tabler/icons-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useStore } from '@/store';

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileModal({
  open,
  onOpenChange,
}: UserProfileModalProps) {
  const user = useStore((state) => state.user);

  console.log('user', user);

  // Get user initials for avatar
  const getUserInitials = (): string => {
    if (!user?.firstName && !user?.lastName) return 'U';
    const firstInitial = user.firstName?.charAt(0).toUpperCase() || '';
    const lastInitial = user.lastName?.charAt(0).toUpperCase() || '';
    return `${firstInitial}${lastInitial}`;
  };

  // Format date for display
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  // Loading state
  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mi Perfil</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground text-sm">
              Cargando información del perfil...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mi Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Personal Information Section */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 rounded-lg">
                <AvatarFallback className="rounded-lg text-lg font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-semibold">
                  {user.firstName} {user.lastName}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconMail className="h-4 w-4" />
                  {user.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconAt className="h-4 w-4" />
                  {user.username}
                </div>
              </div>
            </div>
          </div>

          {/* Role & Access Section */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <IconShieldCheck className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-semibold">Rol y Acceso</h4>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rol</span>
                <Badge
                  variant={user.role === 'ADMIN' ? 'info' : 'secondary'}
                  className="gap-1"
                >
                  <IconShieldCheckFilled className="h-3 w-3" />
                  {user.role === 'ADMIN' ? 'Administrador' : 'Vendedor'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <IconBuilding className="h-4 w-4" />
                  Organización
                </span>
                <span className="text-sm font-medium">
                  {user.organization?.name || 'No asignada'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <IconBuildingStore className="h-4 w-4" />
                  Tienda
                </span>
                <span className="text-sm font-medium">
                  {user.store?.name || 'No asignada'}
                </span>
              </div>
            </div>
          </div>

          {/* Account Details Section */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <IconUser className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-semibold">Detalles de la Cuenta</h4>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado</span>
                <Badge
                  variant={user.isActive ? 'default' : 'destructive'}
                  className="gap-1"
                >
                  {user.isActive ? (
                    <IconCircleCheck className="h-3 w-3" />
                  ) : (
                    <IconCircleX className="h-3 w-3" />
                  )}
                  {user.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Email Verificado
                </span>
                <Badge
                  variant={user.emailVerified ? 'default' : 'outline'}
                  className="gap-1"
                >
                  {user.emailVerified ? (
                    <IconCircleCheck className="h-3 w-3" />
                  ) : (
                    <IconCircleX className="h-3 w-3" />
                  )}
                  {user.emailVerified ? 'Verificado' : 'No verificado'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <IconCalendar className="h-4 w-4" />
                  Fecha de Creación
                </span>
                <span className="text-sm font-medium">
                  {formatDate(user.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <IconClock className="h-4 w-4" />
                  Última Actualización
                </span>
                <span className="text-sm font-medium">
                  {formatDate(user.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
