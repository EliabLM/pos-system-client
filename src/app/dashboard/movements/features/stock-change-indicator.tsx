'use client';

import { IconArrowRight } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface StockChangeIndicatorProps {
  previousStock: number;
  newStock: number;
  className?: string;
  showArrow?: boolean;
}

export function StockChangeIndicator({
  previousStock,
  newStock,
  className = '',
  showArrow = true
}: StockChangeIndicatorProps) {
  const isIncrease = newStock > previousStock;
  const isDecrease = newStock < previousStock;
  const difference = Math.abs(newStock - previousStock);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground font-mono">
        {previousStock}
      </span>
      {showArrow && (
        <IconArrowRight className="size-3 sm:size-4 text-muted-foreground shrink-0" />
      )}
      <span
        className={cn(
          'text-sm font-mono font-medium',
          isIncrease && 'text-green-600 dark:text-green-400',
          isDecrease && 'text-red-600 dark:text-red-400',
          !isIncrease && !isDecrease && 'text-muted-foreground'
        )}
      >
        {newStock}
      </span>
      {(isIncrease || isDecrease) && (
        <span
          className={cn(
            'text-xs font-medium px-1.5 py-0.5 rounded',
            isIncrease && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            isDecrease && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}
          aria-label={`Cambio de ${difference} unidades`}
        >
          {isIncrease && '+'}
          {isDecrease && '-'}
          {difference}
        </span>
      )}
    </div>
  );
}
