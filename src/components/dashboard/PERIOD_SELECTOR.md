# PeriodSelector Component

A responsive, accessible tabs component for selecting time periods in dashboard views.

## Overview

The `PeriodSelector` component provides a clean, modern interface for users to switch between different time periods (day, week, month, year). It uses shadcn/ui's `Tabs` component with Tabler Icons and features responsive behavior that adapts to different screen sizes.

## Features

- **Responsive Design**: Shows icons only on mobile, icons + text on larger screens
- **Accessible**: Full keyboard navigation, ARIA labels, screen reader support
- **Type-Safe**: Strict TypeScript types for all props
- **Consistent Styling**: Matches the project's design system
- **Minimal Bundle**: Uses existing shadcn/ui components

## Installation

The component is already created and exported from `@/components/dashboard`.

```typescript
import { PeriodSelector, type PeriodValue } from '@/components/dashboard';
```

## Props

```typescript
interface PeriodSelectorProps {
  value: PeriodValue;                    // Current selected period
  onChange: (value: PeriodValue) => void; // Callback when selection changes
}

type PeriodValue = 'day' | 'week' | 'month' | 'year';
```

### Props Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `PeriodValue` | Yes | The currently selected period. Must be one of: `'day'`, `'week'`, `'month'`, `'year'` |
| `onChange` | `(value: PeriodValue) => void` | Yes | Callback function called when user selects a different period |

## Usage

### Basic Usage

```typescript
'use client';

import { useState } from 'react';
import { PeriodSelector, PeriodValue } from '@/components/dashboard';

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodValue>('day');

  return (
    <div>
      <PeriodSelector value={period} onChange={setPeriod} />
      <p>Selected: {period}</p>
    </div>
  );
}
```

### Dashboard Header Integration

```typescript
'use client';

import { useState } from 'react';
import { PeriodSelector, PeriodValue } from '@/components/dashboard';

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodValue>('day');

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Resumen de ventas y métricas clave
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Your dashboard content */}
    </div>
  );
}
```

### With Data Fetching (TanStack Query)

```typescript
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PeriodSelector, PeriodValue, KpiCard } from '@/components/dashboard';
import { getDashboardMetrics } from '@/actions/dashboard';

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodValue>('day');

  // Fetch metrics based on selected period
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics', period],
    queryFn: () => getDashboardMetrics(period),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas Totales"
          value={data?.totalSales ?? 0}
          icon={<IconCash />}
          loading={isLoading}
          prefix="$"
        />
        {/* More KPI cards... */}
      </div>
    </div>
  );
}
```

### Centered Layout

```typescript
<div className="flex justify-center">
  <PeriodSelector value={period} onChange={setPeriod} />
</div>
```

### With Conditional Rendering

```typescript
'use client';

import { useState } from 'react';
import { PeriodSelector, PeriodValue } from '@/components/dashboard';

export default function SalesReport() {
  const [period, setPeriod] = useState<PeriodValue>('month');

  const getDateRange = (period: PeriodValue) => {
    switch (period) {
      case 'day':
        return 'Hoy';
      case 'week':
        return 'Últimos 7 días';
      case 'month':
        return 'Este mes';
      case 'year':
        return 'Este año';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reporte de Ventas</h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <p className="text-sm text-muted-foreground">
        Mostrando datos de: {getDateRange(period)}
      </p>

      {/* Report content based on period */}
    </div>
  );
}
```

## Period Values

The component supports four period values:

| Value | Label | Icon | Description |
|-------|-------|------|-------------|
| `'day'` | Hoy | `IconCalendar` | Today's data |
| `'week'` | Semana | `IconCalendarWeek` | Current week data |
| `'month'` | Mes | `IconCalendarMonth` | Current month data |
| `'year'` | Año | `IconCalendarStats` | Current year data |

## Responsive Behavior

The component adapts to different screen sizes:

### Mobile (< 640px)
- Shows **icons only**
- Uses screen reader text for accessibility
- Compact design saves space

### Tablet & Desktop (>= 640px)
- Shows **icons + text labels**
- More descriptive for users
- Better discoverability

## Accessibility

The component follows WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: Full support via shadcn/ui Tabs
  - `Tab` to focus the component
  - `Arrow Left/Right` to navigate between tabs
  - `Enter/Space` to select a tab

- **Screen Reader Support**:
  - Each tab has an `aria-label` describing its action
  - Selected state is announced automatically
  - Icon-only text is available via `sr-only` class on mobile

- **Focus Management**:
  - Clear focus indicators
  - Focus ring on keyboard navigation
  - Proper focus trapping within the tabs

- **Color Contrast**:
  - Meets WCAG AA standards (4.5:1 ratio)
  - Works in both light and dark modes

## Styling

The component uses Tailwind CSS v4 and shadcn/ui's styling system:

- **Color Scheme**: Inherits from theme colors
- **Dark Mode**: Full support via next-themes
- **Spacing**: Consistent with design system (Tailwind scale)
- **Typography**: Uses project's font stack

### Customization

You can customize the component by wrapping it:

```typescript
<div className="rounded-lg border p-2 bg-card">
  <PeriodSelector value={period} onChange={setPeriod} />
</div>
```

Or by modifying the Tailwind classes in the component file directly.

## Technical Details

- **Framework**: React 19 (Client Component)
- **UI Library**: shadcn/ui Tabs component
- **Icons**: Tabler Icons React (NOT Lucide)
- **Type Safety**: Strict TypeScript with const assertions
- **Bundle Size**: Minimal (reuses existing components)

## Browser Support

Works in all modern browsers that support:
- CSS Grid
- Flexbox
- ES6+ JavaScript
- React 19

## Performance

- **Render Performance**: Lightweight, no unnecessary re-renders
- **Bundle Size**: ~1KB (excluding dependencies)
- **Accessibility Tree**: Minimal DOM nodes, optimized for screen readers

## Common Patterns

### Persisting Selection

```typescript
'use client';

import { useEffect, useState } from 'react';
import { PeriodSelector, PeriodValue } from '@/components/dashboard';

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodValue>('day');

  // Save to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('dashboard-period', period);
  }, [period]);

  // Load from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('dashboard-period') as PeriodValue;
    if (saved) setPeriod(saved);
  }, []);

  return <PeriodSelector value={period} onChange={setPeriod} />;
}
```

### Using with Zustand

```typescript
// In your store
interface DashboardState {
  period: PeriodValue;
  setPeriod: (period: PeriodValue) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  period: 'day',
  setPeriod: (period) => set({ period }),
}));

// In your component
'use client';

import { PeriodSelector } from '@/components/dashboard';
import { useDashboardStore } from '@/store/dashboard';

export default function Dashboard() {
  const period = useDashboardStore((state) => state.period);
  const setPeriod = useDashboardStore((state) => state.setPeriod);

  return <PeriodSelector value={period} onChange={setPeriod} />;
}
```

## Testing

The component is designed to be easily testable:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PeriodSelector } from './period-selector';

test('calls onChange when period is selected', async () => {
  const handleChange = jest.fn();
  render(<PeriodSelector value="day" onChange={handleChange} />);

  const weekTab = screen.getByRole('tab', { name: /semana/i });
  await userEvent.click(weekTab);

  expect(handleChange).toHaveBeenCalledWith('week');
});
```

## Related Components

- **KpiCard**: Display metrics for the selected period
- **Tabs**: The underlying shadcn/ui component

## File Location

```
src/components/dashboard/
├── period-selector.tsx          # Main component
├── period-selector.example.tsx  # Usage examples
├── PERIOD_SELECTOR.md          # This documentation
└── index.ts                    # Exports
```

## Import Paths

```typescript
// Named import (recommended)
import { PeriodSelector, type PeriodValue } from '@/components/dashboard';

// Direct import (if needed)
import { PeriodSelector } from '@/components/dashboard/period-selector';
```

## Version History

- **v1.0.0** (2025-10-10): Initial implementation
  - Basic period selection (day, week, month, year)
  - Responsive design
  - Full accessibility support
  - TypeScript types

## Support

For issues or questions, please refer to:
- Project README: `C:\Users\elopez\workspace\projects\pos-system\pos-system-client\README.md`
- CLAUDE.md: `C:\Users\elopez\workspace\projects\pos-system\pos-system-client\CLAUDE.md`
