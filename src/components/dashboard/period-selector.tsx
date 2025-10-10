'use client';

import {
  IconCalendar,
  IconCalendarWeek,
  IconCalendarMonth,
  IconCalendarStats,
} from '@tabler/icons-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type PeriodValue = 'day' | 'week' | 'month' | 'year';

interface PeriodSelectorProps {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
}

const PERIODS = [
  {
    value: 'day' as const,
    label: 'Hoy',
    icon: IconCalendar,
    ariaLabel: 'Ver datos de hoy',
  },
  {
    value: 'week' as const,
    label: 'Semana',
    icon: IconCalendarWeek,
    ariaLabel: 'Ver datos de la semana',
  },
  {
    value: 'month' as const,
    label: 'Mes',
    icon: IconCalendarMonth,
    ariaLabel: 'Ver datos del mes',
  },
  {
    value: 'year' as const,
    label: 'Año',
    icon: IconCalendarStats,
    ariaLabel: 'Ver datos del año',
  },
] as const;

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(newValue) => onChange(newValue as PeriodValue)}
      className="w-fit"
    >
      <TabsList className="grid grid-cols-4 w-fit gap-1">
        {PERIODS.map((period) => {
          const Icon = period.icon;
          return (
            <TabsTrigger
              key={period.value}
              value={period.value}
              aria-label={period.ariaLabel}
              className="gap-1.5 px-3"
            >
              {/* Icon visible on all screen sizes */}
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />

              {/* Text hidden on mobile, visible on sm and up */}
              <span className="hidden sm:inline">{period.label}</span>

              {/* Screen reader only text for mobile */}
              <span className="sr-only sm:hidden">{period.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
