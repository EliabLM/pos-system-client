'use client';

import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  loading?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function KpiCard({
  title,
  value,
  icon,
  trend,
  loading = false,
  prefix = '',
  suffix = '',
  className,
}: KpiCardProps) {
  // Format value helper
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      return val.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
    return val;
  };

  // Render trend helper
  const renderTrend = () => {
    if (!trend) return null;

    const isPositive = trend.value > 0;
    const isNegative = trend.value < 0;
    const isNeutral = trend.value === 0;

    // Choose icon and color based on trend direction
    let TrendIcon = IconMinus;
    let colorClass = 'text-gray-600 dark:text-gray-400';

    if (isPositive) {
      TrendIcon = IconTrendingUp;
      colorClass = 'text-green-600 dark:text-green-500';
    } else if (isNegative) {
      TrendIcon = IconTrendingDown;
      colorClass = 'text-red-600 dark:text-red-500';
    }

    // Format trend value with sign
    const formattedTrend = isNeutral
      ? '0%'
      : `${isPositive ? '+' : ''}${trend.value.toLocaleString('es-CO', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        })}%`;

    const ariaLabel = `${isPositive ? 'Aumento' : isNegative ? 'Disminución' : 'Sin cambio'} de ${Math.abs(trend.value)}% ${trend.label}`;

    return (
      <div
        className={cn('flex items-center gap-1 text-sm font-medium', colorClass)}
        aria-label={ariaLabel}
      >
        <TrendIcon className="h-4 w-4" />
        <span className="tabular-nums">{formattedTrend}</span>
        <span className="text-muted-foreground font-normal ml-1">{trend.label}</span>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-5 w-28" />
        </CardContent>
      </Card>
    );
  }

  // Format the display value with prefix and suffix
  const formattedValue = `${prefix}${formatValue(value)}${suffix}`;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tabular-nums tracking-tight">{formattedValue}</div>
        {trend && <div className="mt-2">{renderTrend()}</div>}
      </CardContent>
    </Card>
  );
}
