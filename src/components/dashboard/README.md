# Dashboard Components

This directory contains reusable dashboard components for displaying metrics, KPIs, and dashboard layouts.

## Table of Contents

1. [DashboardHeader](#dashboardheader-component)
2. [KpiCard](#kpicard-component)
3. [PeriodSelector](#periodselector-component)

---

## DashboardHeader Component

A comprehensive dashboard header component that provides navigation, filtering, quick actions, and store selection.

### Location
`src/components/dashboard/dashboard-header.tsx`

### Features

- ✅ Title with icon and breadcrumb navigation
- ✅ Multi-store selector with automatic detection
- ✅ Manual refresh button with loading animation
- ✅ Auto-updating "last updated" timestamp
- ✅ Quick action buttons (New Sale, View Reports)
- ✅ Fully responsive (mobile-first design)
- ✅ Accessibility compliant (ARIA labels, keyboard navigation)
- ✅ Integration with Zustand store and React Query
- ✅ Spanish locale date formatting
- ✅ Uses Tabler Icons (not Lucide)

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onRefresh` | `() => void` | No | - | Callback function triggered when refresh button is clicked |
| `lastUpdated` | `Date` | No | - | Date object showing when data was last refreshed |
| `showStoreSelector` | `boolean` | No | `true` | Control visibility of store selector |

### Usage Examples

#### Basic Usage

```tsx
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

function Dashboard() {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const handleRefresh = async () => {
    // Fetch fresh data from your API
    await refetchDashboardData();
    setLastUpdated(new Date());
  };

  return (
    <div>
      <DashboardHeader
        onRefresh={handleRefresh}
        lastUpdated={lastUpdated}
      />
      {/* Dashboard content */}
    </div>
  );
}
```

#### With React Query Integration

```tsx
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { useQueryClient } from '@tanstack/react-query';

function Dashboard() {
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const handleRefresh = async () => {
    // Invalidate all dashboard queries
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    await queryClient.invalidateQueries({ queryKey: ['kpis'] });
    setLastUpdated(new Date());
  };

  return (
    <DashboardHeader
      onRefresh={handleRefresh}
      lastUpdated={lastUpdated}
      showStoreSelector={true}
    />
  );
}
```

#### Minimal Header (No Refresh)

```tsx
<DashboardHeader />
// All props are optional
```

#### Without Store Selector

```tsx
<DashboardHeader
  showStoreSelector={false}
  lastUpdated={lastUpdated}
/>
```

### Store Selection Behavior

The component intelligently handles store selection:

1. **Single Store**: If user has access to only one store, selector is hidden and that store is auto-selected
2. **Multiple Stores**: Dropdown selector appears allowing user to switch between stores
3. **No Store Assigned**: Uses user's default `storeId` from session
4. **Loading State**: Shows skeleton loader while fetching stores

**Note:** Store selection currently updates local component state. To persist selection across pages, extend the Zustand store with a `setStoreId` action.

### Responsive Breakpoints

- **Mobile (<640px)**:
  - Stacked vertical layout
  - Shortened button labels ("Venta" instead of "Nueva Venta")
  - Full-width elements

- **Tablet (≥640px)**:
  - Flexible wrapping layout
  - Full button labels visible
  - Inline filters and actions

- **Desktop (≥1024px)**:
  - Horizontal layout with `justify-between`
  - All elements on single row
  - Optimal spacing

### Integration Points

**Zustand Store:**
- Reads `user.organizationId` for fetching stores
- Reads `user.storeId` for default store selection

**React Query Hooks:**
- Uses `useActiveStores()` to fetch available stores
- Integrates with query invalidation for refresh

**Navigation:**
- Links to `/dashboard/sales/new` for New Sale
- Links to `/dashboard/reports` for Reports
- Breadcrumb links to `/dashboard` for home

### Accessibility Features

- ARIA labels on all interactive elements
- Full keyboard navigation support
- Semantic HTML with proper heading hierarchy
- Screen reader friendly timestamp updates
- Visible focus indicators
- WCAG AA color contrast compliance

### Timestamp Behavior

The "last updated" timestamp:
- Updates automatically every 60 seconds
- Displays relative time in Spanish (e.g., "hace 2 minutos")
- Uses `date-fns` with Spanish locale (`es`)
- Formats using `formatDistanceToNow` function

### Quick Actions

Two prominent action buttons are included:

1. **Nueva Venta (New Sale)**:
   - Primary styled button
   - Icon: `IconPlus` from Tabler
   - Links to: `/dashboard/sales/new`
   - Mobile label: "Venta"
   - Desktop label: "Nueva Venta"

2. **Ver Reportes (View Reports)**:
   - Outline styled button
   - Icon: `IconFileAnalytics` from Tabler
   - Links to: `/dashboard/reports`
   - Mobile label: "Reportes"
   - Desktop label: "Ver Reportes"

### Future Enhancements

- [ ] Persistent store selection in Zustand store
- [ ] sessionStorage persistence for selected store
- [ ] Date range picker integration
- [ ] Export actions (PDF/Excel)
- [ ] Notification badge for pending tasks
- [ ] Low stock alert indicator

### See Also

- Example implementations: `src/components/dashboard/dashboard-header.example.tsx`
- Stores hook: `src/hooks/useStores.ts`
- Zustand store: `src/store/index.ts`

---

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

---

## PeriodSelector Component

A period selection component for filtering dashboard data by time range.

### Location
`src/components/dashboard/period-selector.tsx`

### Features

- ✅ Predefined periods (Today, Week, Month, Year)
- ✅ Custom date range picker
- ✅ Responsive tabs layout
- ✅ Integration with date-fns
- ✅ Spanish locale support
- ✅ Accessibility compliant

### See Also

- Example implementations: `src/components/dashboard/period-selector.example.tsx`

---

## File Structure

```
src/components/dashboard/
├── README.md                           # This documentation file
├── dashboard-header.tsx                # Dashboard header component
├── dashboard-header.example.tsx        # Header usage examples
├── kpi-card.tsx                        # KPI metric card
├── kpi-card.example.tsx               # KPI usage examples
├── period-selector.tsx                # Date range selector
└── period-selector.example.tsx        # Period selector examples
```

## Design System Compliance

All dashboard components follow the project's design system:

- **Icons:** Tabler Icons React (NOT Lucide)
- **UI Components:** shadcn/ui (New York style)
- **Styling:** Tailwind CSS v4
- **State Management:** Zustand + React Query
- **Forms:** React Hook Form + Yup/Zod
- **Date Handling:** date-fns with Spanish locale

## Best Practices

### 1. Always Use Tabler Icons

```tsx
✅ Correct:
import { IconDashboard } from '@tabler/icons-react';

❌ Wrong:
import { Dashboard } from 'lucide-react';
```

### 2. Maintain Responsive Design

```tsx
✅ Mobile-first approach:
className="flex flex-col sm:flex-row sm:items-center"
```

### 3. Provide Loading States

```tsx
✅ Show skeletons while loading:
{isLoading ? <Skeleton className="h-9 w-[200px]" /> : <ActualContent />}
```

### 4. Include Accessibility

```tsx
✅ Add ARIA labels:
<Button aria-label="Actualizar datos del dashboard">
```

### 5. Use Spanish Locale

```tsx
✅ Format dates in Spanish:
formatDistanceToNow(date, { locale: es })
```

## Component Testing Checklist

When using dashboard components, verify:

- [ ] Responsive behavior on mobile (320px), tablet (768px), desktop (1024px+)
- [ ] Keyboard navigation works correctly (Tab, Enter, Escape)
- [ ] Loading states display properly
- [ ] Error states are handled gracefully
- [ ] ARIA labels present for screen readers
- [ ] Color contrast meets WCAG AA standards (4.5:1 for text)
- [ ] Icons are from Tabler Icons React
- [ ] Links navigate to correct routes
- [ ] Store selector appears/hides appropriately
- [ ] Refresh button shows loading animation
- [ ] Timestamps update automatically
- [ ] Touch targets are at least 44x44px

## Contributing

When adding new dashboard components:

1. **Follow Naming Conventions**: Use PascalCase for components
2. **Include TypeScript Types**: All props must be typed
3. **Create Example Files**: Add `.example.tsx` file with usage examples
4. **Mobile-First Design**: Start with mobile layout, enhance for larger screens
5. **Include Loading/Error States**: Handle async operations properly
6. **Add Accessibility**: ARIA labels, keyboard navigation, semantic HTML
7. **Update README**: Document the new component in this file
8. **Use Tabler Icons**: Never use Lucide icons
9. **Test Responsiveness**: Verify on multiple screen sizes
10. **Follow Project Patterns**: Check existing components for established patterns

## Common Patterns

### Data Fetching with React Query

```tsx
import { useQuery } from '@tanstack/react-query';
import { getDashboardData } from '@/actions/dashboard';

const { data, isLoading, error } = useQuery({
  queryKey: ['dashboard'],
  queryFn: getDashboardData,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Manual Refresh with Query Invalidation

```tsx
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const handleRefresh = async () => {
  await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  setLastUpdated(new Date());
};
```

### Store Integration

```tsx
import { useStore } from '@/store';

const user = useStore((state) => state.user);
const organizationId = user?.organizationId;
```

### Responsive Grid Layout

```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {/* Dashboard components */}
</div>
```

## Troubleshooting

### Store Selector Not Appearing

- Verify user has multiple stores assigned
- Check `useActiveStores()` hook is fetching correctly
- Ensure `showStoreSelector` prop is not set to `false`

### Timestamps Not Updating

- Verify `lastUpdated` prop is a valid Date object
- Check browser console for errors
- Ensure component is mounted (useEffect cleanup)

### Refresh Not Working

- Verify `onRefresh` callback is provided
- Check async operations complete properly
- Ensure query invalidation is called

### Icons Not Displaying

- Verify using Tabler Icons: `@tabler/icons-react`
- Check icon component is properly imported
- Ensure icon has proper className for sizing

## Additional Resources

- [Tabler Icons](https://tabler.io/icons) - Icon library
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [date-fns](https://date-fns.org/) - Date utility library
- [React Query](https://tanstack.com/query) - Data fetching
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
