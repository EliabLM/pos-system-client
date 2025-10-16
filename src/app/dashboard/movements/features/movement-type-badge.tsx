'use client';

import { IconArrowDown, IconArrowUp, IconAdjustments } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { StockMovementType } from '@/generated/prisma';

interface MovementTypeBadgeProps {
  type: StockMovementType;
  showIcon?: boolean;
  className?: string;
}

export function MovementTypeBadge({
  type,
  showIcon = true,
  className = ''
}: MovementTypeBadgeProps) {
  const getTypeInfo = () => {
    switch (type) {
      case 'IN':
        return {
          label: 'Entrada',
          icon: <IconArrowDown className="size-3 sm:size-3.5" />,
          className: 'bg-green-500 hover:bg-green-600 text-white border-green-600',
        };
      case 'OUT':
        return {
          label: 'Salida',
          icon: <IconArrowUp className="size-3 sm:size-3.5" />,
          className: 'bg-red-500 hover:bg-red-600 text-white border-red-600',
        };
      case 'ADJUSTMENT':
        return {
          label: 'Ajuste',
          icon: <IconAdjustments className="size-3 sm:size-3.5" />,
          className: 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600',
        };
      default:
        return {
          label: type,
          icon: null,
          className: 'bg-gray-500 hover:bg-gray-600 text-white border-gray-600',
        };
    }
  };

  const typeInfo = getTypeInfo();

  return (
    <Badge
      className={`gap-1 sm:gap-1.5 font-medium ${typeInfo.className} ${className}`}
      aria-label={`Tipo de movimiento: ${typeInfo.label}`}
    >
      {showIcon && typeInfo.icon}
      <span className="text-xs sm:text-sm">{typeInfo.label}</span>
    </Badge>
  );
}
