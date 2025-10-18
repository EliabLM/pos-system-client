/**
 * Report Filters Component
 *
 * Reusable filter component for reports with date range and store selectors.
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React from 'react';
import { SimpleDateRangePicker } from './date-range-picker';
import { Card, CardContent } from '@/components/ui/card';
import type { ReportFiltersProps } from '@/interfaces/reports';

export function ReportFilters({
  dateRange,
  onDateRangeChange,
  storeId,
  onStoreChange,
  showStoreFilter = false,
  additionalFilters,
  className = '',
}: ReportFiltersProps): React.ReactElement {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Período</label>
            <SimpleDateRangePicker
              value={dateRange}
              onChange={onDateRangeChange}
            />
          </div>

          {/* Store Filter (if enabled) */}
          {showStoreFilter && onStoreChange && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Tienda</label>
              <select
                value={storeId || ''}
                onChange={(e) => onStoreChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Todas las tiendas</option>
                {/* Store options will be populated dynamically */}
              </select>
            </div>
          )}

          {/* Additional Filters Slot */}
          {additionalFilters && (
            <div className="md:col-span-2 lg:col-span-1">
              {additionalFilters}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
