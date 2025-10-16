'use client';

import {
  IconUser,
  IconMail,
  IconShield,
  IconBuildingStore,
  IconCalendar,
  IconCircleCheckFilled,
  IconAlertCircleFilled,
  IconMailCheck,
  IconMailX,
  IconLock,
  IconClock,
  IconAlertTriangle,
} from '@tabler/icons-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserById } from '@/hooks/useUsers';
import { RoleBadge } from './role-badge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
}

export function UserDetailDialog({
  open,
  onOpenChange,
  userId,
}: UserDetailDialogProps) {
  const { data: user, isLoading, error } = useUserById(userId || '');

  // Loading state
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconUser className="size-5" />
              Detalle del Usuario
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Skeleton className="h-8 w-full max-w-64" />
            <Skeleton className="h-4 w-full max-w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state
  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconUser className="size-5" />
              Detalle del Usuario
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 gap-4 px-4">
            <IconAlertCircleFilled className="size-12 text-destructive" />
            <p className="text-muted-foreground text-center text-sm sm:text-base break-words">
              Error al cargar el usuario: {error.message}
            </p>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // No user found
  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconUser className="size-5" />
              Detalle del Usuario
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 gap-4 px-4">
            <p className="text-muted-foreground text-center">
              No se encontró el usuario
            </p>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-3 sm:p-6 pb-3 sm:pb-4 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-2xl">
                <IconUser
                  className="size-5 sm:size-6 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">
                  {user.firstName} {user.lastName}
                </span>
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base flex items-center gap-2">
                <span className="truncate">@{user.username}</span>
                <RoleBadge role={user.role} />
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={`gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 shrink-0 text-xs sm:text-sm ${
                user.isActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
              }`}
            >
              {user.isActive ? (
                <IconCircleCheckFilled className="size-3 sm:size-4 fill-green-500 dark:fill-green-400" />
              ) : (
                <IconAlertCircleFilled className="size-3 sm:size-4 fill-red-500 dark:fill-red-400" />
              )}
              <span className="font-medium">
                {user.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </Badge>
          </div>
        </DialogHeader>

        <Separator className="shrink-0" />

        {/* Content */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            {/* Personal Information */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconUser
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Información Personal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconUser className="size-4" aria-hidden="true" />
                    <span>Nombre Completo</span>
                  </div>
                  <p className="font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconUser className="size-4" aria-hidden="true" />
                    <span>Nombre de Usuario</span>
                  </div>
                  <p className="font-medium">@{user.username}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconMail className="size-4" aria-hidden="true" />
                    <span>Email</span>
                  </div>
                  <p className="font-medium break-all">{user.email}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconShield className="size-4" aria-hidden="true" />
                    <span>Rol</span>
                  </div>
                  <RoleBadge role={user.role} />
                </div>
              </div>
            </section>

            {/* Account Status */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconShield
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Estado de la Cuenta
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Estado de la Cuenta
                  </p>
                  <Badge
                    variant="outline"
                    className={`gap-1.5 w-fit ${
                      user.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
                    }`}
                  >
                    {user.isActive ? (
                      <IconCircleCheckFilled className="size-4" />
                    ) : (
                      <IconAlertCircleFilled className="size-4" />
                    )}
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Verificación de Email
                  </p>
                  <Badge
                    variant="outline"
                    className={`gap-1.5 w-fit ${
                      user.emailVerified
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                    }`}
                  >
                    {user.emailVerified ? (
                      <IconMailCheck className="size-4" />
                    ) : (
                      <IconMailX className="size-4" />
                    )}
                    {user.emailVerified ? 'Verificado' : 'Pendiente'}
                  </Badge>
                </div>
                {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <IconAlertTriangle className="size-4 text-orange-500" />
                      Cuenta Bloqueada
                    </p>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      Bloqueada hasta:{' '}
                      {new Date(user.lockedUntil).toLocaleString('es-ES')}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Intentos de Inicio de Sesión
                  </p>
                  <p className="font-medium">{user.loginAttempts || 0}</p>
                </div>
              </div>
            </section>

            {/* Organization & Store */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconBuildingStore
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Organización y Tienda
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Tienda Asignada
                  </p>
                  <p className="font-medium">
                    {user.storeId ? 'Asignada' : 'Sin tienda asignada'}
                  </p>
                </div>
              </div>
            </section>

            {/* Login Information */}
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <IconClock
                  className="size-4 sm:size-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                Información de Acceso
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconCalendar className="size-4" aria-hidden="true" />
                    <span>Último Acceso</span>
                  </div>
                  <p className="font-medium text-sm">
                    {user.lastLoginAt
                      ? formatDistanceToNow(new Date(user.lastLoginAt), {
                          addSuffix: true,
                          locale: es,
                        })
                      : 'Nunca ha iniciado sesión'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconLock className="size-4" aria-hidden="true" />
                    <span>Última Cambio de Contraseña</span>
                  </div>
                  <p className="font-medium text-sm">
                    {user.passwordChangedAt
                      ? formatDistanceToNow(new Date(user.passwordChangedAt), {
                          addSuffix: true,
                          locale: es,
                        })
                      : 'Nunca'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconCalendar className="size-4" aria-hidden="true" />
                    <span>Creado</span>
                  </div>
                  <p className="font-medium text-sm">
                    {new Date(user.createdAt).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconCalendar className="size-4" aria-hidden="true" />
                    <span>Última Actualización</span>
                  </div>
                  <p className="font-medium text-sm">
                    {formatDistanceToNow(new Date(user.updatedAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* Footer */}
        <Separator className="shrink-0" />
        <div className="p-3 sm:p-6 pt-3 sm:pt-4 flex justify-end shrink-0">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              Cerrar
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
