/**
 * Chart Wrapper Component
 *
 * Reusable wrapper for Recharts with loading, error, and empty states.
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IconChartBar } from '@tabler/icons-react';
import type { ChartWrapperProps } from '@/interfaces/reports';

export function ChartWrapper({
  title,
  description,
  loading = false,
  error = null,
  isEmpty = false,
  emptyMessage = 'No hay datos disponibles',
  children,
  chartId,
  className = '',
}: ChartWrapperProps): React.ReactElement {
  return (
    <Card className={className} id={chartId}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-[300px] w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!loading && !error && isEmpty && (
          <div className="flex h-[300px] flex-col items-center justify-center text-center">
            <IconChartBar className="mb-4 size-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        )}

        {/* Chart Content */}
        {!loading && !error && !isEmpty && children}
      </CardContent>
    </Card>
  );
}

/**
 * Chart Wrapper Skeleton
 *
 * Loading state for ChartWrapper
 */
export function ChartWrapperSkeleton(): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}
