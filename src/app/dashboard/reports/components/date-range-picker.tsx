/**
 * Date Range Picker Component
 *
 * Reusable date range selector with presets for common periods.
 * Note: Requires shadcn/ui calendar and popover components to be installed.
 *
 * TODO: Run `npx shadcn@latest add calendar popover` to install dependencies
 *
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React, { useMemo } from 'react';
import { IconCalendar } from '@tabler/icons-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import type { DateRangeFilter, DateRangePickerProps, DateRangePreset } from '@/interfaces/reports';

/**
 * Date Range Picker Component
 *
 * This is a placeholder component. It will work fully once calendar and popover
 * components are installed via shadcn/ui.
 */
export function DateRangePicker({
  value,
  onChange,
  presets,
  minDate,
  maxDate,
  disabled = false,
  className = '',
}: DateRangePickerProps): React.ReactElement {
  // Default presets if none provided
  const defaultPresets: DateRangePreset[] = useMemo(
    () => [
      {
        label: 'Hoy',
        getValue: () => ({
          startDate: new Date(),
          endDate: new Date(),
        }),
      },
      {
        label: 'Ayer',
        getValue: () => ({
          startDate: subDays(new Date(), 1),
          endDate: subDays(new Date(), 1),
        }),
      },
      {
        label: 'Últimos 7 días',
        getValue: () => ({
          startDate: subDays(new Date(), 6),
          endDate: new Date(),
        }),
      },
      {
        label: 'Últimos 30 días',
        getValue: () => ({
          startDate: subDays(new Date(), 29),
          endDate: new Date(),
        }),
      },
      {
        label: 'Este mes',
        getValue: () => ({
          startDate: startOfMonth(new Date()),
          endDate: endOfMonth(new Date()),
        }),
      },
      {
        label: 'Mes pasado',
        getValue: () => {
          const lastMonth = subMonths(new Date(), 1);
          return {
            startDate: startOfMonth(lastMonth),
            endDate: endOfMonth(lastMonth),
          };
        },
      },
    ],
    []
  );

  const activePresets = presets || defaultPresets;

  const formatDateRange = (): string => {
    const { startDate, endDate } = value;
    const startStr = format(startDate, 'dd MMM yyyy', { locale: es });
    const endStr = format(endDate, 'dd MMM yyyy', { locale: es });

    if (startStr === endStr) {
      return startStr;
    }

    return `${startStr} - ${endStr}`;
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Date Display Button */}
      <Button
        variant="outline"
        disabled={disabled}
        className="w-full justify-start gap-2 text-left font-normal sm:w-auto"
      >
        <IconCalendar className="size-4" />
        <span>{formatDateRange()}</span>
      </Button>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {activePresets.map((preset) => (
          <Button
            key={preset.label}
            variant="ghost"
            size="sm"
            onClick={() => onChange(preset.getValue())}
            disabled={disabled}
            className="text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Note for developers */}
      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs dark:border-yellow-900 dark:bg-yellow-950">
        <p className="font-semibold">Nota para desarrolladores:</p>
        <p className="mt-1">
          Este componente requiere calendar y popover de shadcn/ui.
        </p>
        <p className="mt-1">
          Ejecutar: <code className="rounded bg-yellow-100 px-1 py-0.5 dark:bg-yellow-900">npx shadcn@latest add calendar popover</code>
        </p>
      </div>
    </div>
  );
}

/**
 * Simple Date Range Picker (without calendar UI)
 *
 * Fallback version using only preset buttons until calendar is installed
 */
export function SimpleDateRangePicker({
  value,
  onChange,
  className = '',
}: {
  value: DateRangeFilter;
  onChange: (range: DateRangeFilter) => void;
  className?: string;
}): React.ReactElement {
  const presets: DateRangePreset[] = useMemo(
    () => [
      {
        label: 'Hoy',
        getValue: () => ({
          startDate: new Date(),
          endDate: new Date(),
        }),
      },
      {
        label: 'Últimos 7 días',
        getValue: () => ({
          startDate: subDays(new Date(), 6),
          endDate: new Date(),
        }),
      },
      {
        label: 'Últimos 30 días',
        getValue: () => ({
          startDate: subDays(new Date(), 29),
          endDate: new Date(),
        }),
      },
      {
        label: 'Este mes',
        getValue: () => ({
          startDate: startOfMonth(new Date()),
          endDate: endOfMonth(new Date()),
        }),
      },
      {
        label: 'Mes pasado',
        getValue: () => {
          const lastMonth = subMonths(new Date(), 1);
          return {
            startDate: startOfMonth(lastMonth),
            endDate: endOfMonth(lastMonth),
          };
        },
      },
    ],
    []
  );

  const formatDateRange = (): string => {
    const { startDate, endDate } = value;
    const startStr = format(startDate, 'dd MMM yyyy', { locale: es });
    const endStr = format(endDate, 'dd MMM yyyy', { locale: es });

    if (startStr === endStr) {
      return startStr;
    }

    return `${startStr} - ${endStr}`;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <IconCalendar className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{formatDateRange()}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => onChange(preset.getValue())}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
