# Dashboard Components

This directory contains reusable dashboard components for displaying metrics and KPIs.

## KpiCard Component

A reusable card component for displaying key performance indicators (KPIs) with optional trend indicators.

### Location
`src/components/dashboard/kpi-card.tsx`

### Features

- ✅ Display numerical or text values with optional prefix/suffix
- ✅ Trend indicators (positive, negative, neutral) with icons and colors
- ✅ Loading skeleton state
- ✅ Responsive design (mobile-first)
- ✅ Dark mode support
- ✅ Spanish locale number formatting (es-CO)
- ✅ Accessibility compliant (ARIA labels, screen reader friendly)
- ✅ Uses Tabler Icons (not Lucide)
- ✅ Built with shadcn/ui components

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | - | Card title/label |
| `value` | `string \| number` | Yes | - | Main value to display |
| `icon` | `React.ReactNode` | Yes | - | Icon component (use Tabler Icons) |
| `trend` | `{ value: number; label: string }` | No | - | Trend indicator with percentage and label |
| `loading` | `boolean` | No | `false` | Show loading skeleton |
| `prefix` | `string` | No | `''` | Prefix for value (e.g., "$") |
| `suffix` | `string` | No | `''` | Suffix for value (e.g., "%") |
| `className` | `string` | No | - | Additional CSS classes |

### Trend Behavior

The trend indicator automatically adjusts based on the `trend.value`:

- **Positive** (value > 0): Green color with up arrow (IconTrendingUp)
- **Negative** (value < 0): Red color with down arrow (IconTrendingDown)
- **Neutral** (value = 0): Gray color with minus icon (IconMinus)

### Usage Examples

#### Basic KPI Card

```tsx
import { KpiCard } from '@/components/dashboard/kpi-card';
import { IconCash } from '@tabler/icons-react';

<KpiCard
  title="Ventas del Día"
  value={1250000}
  prefix="$"
  icon={<IconCash className="h-5 w-5" />}
/>
```

#### With Positive Trend

```tsx
<KpiCard
  title="Ventas del Día"
  value={1250000}
  prefix="$"
  icon={<IconCash className="h-5 w-5" />}
  trend={{ value: 15.5, label: 'vs ayer' }}
/>
```

#### With Negative Trend

```tsx
<KpiCard
  title="Transacciones"
  value={45}
  icon={<IconShoppingCart className="h-5 w-5" />}
  trend={{ value: -8.2, label: 'vs semana pasada' }}
/>
```

#### Percentage Value

```tsx
<KpiCard
  title="Tasa de Conversión"
  value={68.5}
  suffix="%"
  icon={<IconTrendingUp className="h-5 w-5" />}
  trend={{ value: 3.2, label: 'vs mes anterior' }}
/>
```

#### String Value

```tsx
<KpiCard
  title="Estado del Sistema"
  value="Activo"
  icon={<IconCircleCheck className="h-5 w-5" />}
/>
```

#### Loading State

```tsx
<KpiCard
  title="Ventas del Día"
  value={0}
  icon={<IconCash className="h-5 w-5" />}
  loading={true}
/>
```

### Dashboard Grid Layout

Typical usage in a dashboard page with responsive grid:

```tsx
import { KpiCard } from '@/components/dashboard/kpi-card';
import {
  IconCash,
  IconShoppingCart,
  IconUsers,
  IconPackage,
} from '@tabler/icons-react';

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Ventas del Día"
        value={1250000}
        prefix="$"
        icon={<IconCash className="h-5 w-5" />}
        trend={{ value: 15.5, label: 'vs ayer' }}
      />

      <KpiCard
        title="Transacciones"
        value={45}
        icon={<IconShoppingCart className="h-5 w-5" />}
        trend={{ value: -8.2, label: 'vs semana pasada' }}
      />

      <KpiCard
        title="Clientes Nuevos"
        value={12}
        icon={<IconUsers className="h-5 w-5" />}
        trend={{ value: 0, label: 'vs mes anterior' }}
      />

      <KpiCard
        title="Productos Vendidos"
        value={237}
        icon={<IconPackage className="h-5 w-5" />}
      />
    </div>
  );
}
```

### Integration with React Query

Example with data fetching and loading state:

```tsx
import { KpiCard } from '@/components/dashboard/kpi-card';
import { IconCash } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardMetrics } from '@/actions/dashboard';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: getDashboardMetrics,
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Ventas del Día"
        value={data?.todaySales ?? 0}
        prefix="$"
        icon={<IconCash className="h-5 w-5" />}
        trend={{
          value: data?.salesTrend ?? 0,
          label: 'vs ayer',
        }}
        loading={isLoading}
      />
    </div>
  );
}
```

### Number Formatting

Numbers are formatted using Spanish Colombia locale (`es-CO`):

- `1250000` → `"1.250.000"`
- `1250000.50` → `"1.250.000,5"`
- `68.5` with `suffix="%"` → `"68,5%"`
- Trend percentages: `15.5` → `"+15,5%"`

### Accessibility Features

- Semantic HTML with proper heading tags
- ARIA labels for trend indicators
- Screen reader friendly trend descriptions
- Keyboard navigation support through Card component
- High contrast colors for trend indicators
- Tabular numbers for consistent digit width

### Responsive Breakpoints

The component adapts to container width. Recommended grid layout:

```tsx
// Mobile: 1 column
// Tablet (md): 2 columns
// Desktop (lg): 4 columns
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {/* KPI cards */}
</div>
```

### Styling Customization

Use the `className` prop for custom styling:

```tsx
<KpiCard
  title="Ventas del Día"
  value={1250000}
  prefix="$"
  icon={<IconCash className="h-5 w-5" />}
  className="border-primary/20 shadow-lg"
/>
```

### Common Use Cases

1. **Sales Dashboard**: Display daily/weekly/monthly sales metrics
2. **E-commerce Analytics**: Show conversion rates, average order value
3. **Inventory Metrics**: Track stock levels, product counts
4. **Customer Metrics**: Display customer counts, retention rates
5. **System Status**: Show system health indicators

### Edge Cases Handled

- ✅ Zero values (displays "0")
- ✅ Very large numbers (formatted with thousands separators)
- ✅ Negative values (formatted with minus sign)
- ✅ String values (displayed as-is without formatting)
- ✅ Missing trend (trend section not rendered)
- ✅ Zero trend (displays neutral indicator)
- ✅ Long titles (wrap to multiple lines)
- ✅ Null/undefined values (handled gracefully)

### See Also

- Example implementations: `src/components/dashboard/kpi-card.example.tsx`
- shadcn/ui Card: `src/components/ui/card.tsx`
- shadcn/ui Skeleton: `src/components/ui/skeleton.tsx`
