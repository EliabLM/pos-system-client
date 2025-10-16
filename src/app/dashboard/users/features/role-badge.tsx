'use client';

import { IconShield, IconUser } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/generated/prisma';

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const roleConfig = {
    ADMIN: {
      icon: <IconShield className="size-3 sm:size-3.5" aria-hidden="true" />,
      label: 'Administrador',
      className:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    },
    SELLER: {
      icon: <IconUser className="size-3 sm:size-3.5" aria-hidden="true" />,
      label: 'Vendedor',
      className:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    },
  };

  const config = roleConfig[role];

  return (
    <Badge
      variant="outline"
      className={`gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 text-xs sm:text-sm font-medium ${config.className} ${className}`}
    >
      {config.icon}
      <span className="hidden sm:inline">{config.label}</span>
      <span className="sm:hidden">{role}</span>
    </Badge>
  );
}
