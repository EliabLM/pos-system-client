# KPI Card Visual Reference

## Component Layout

```
┌────────────────────────────────────┐
│ Ventas del Día            [💰]    │  ← Title (text-sm text-muted-foreground)
│                                    │     Icon (h-10 w-10 rounded-lg bg-primary/10)
│                                    │
│ $1.250.000                        │  ← Value (text-3xl font-bold tabular-nums)
│                                    │
│ ↑ +15,5% vs ayer                  │  ← Trend (text-sm with color indicator)
└────────────────────────────────────┘
```

## Visual States

### Positive Trend (Green)
```
┌────────────────────────────────────┐
│ Ventas del Día            [💰]    │
│                                    │
│ $1.250.000                        │
│                                    │
│ ↗ +15,5% vs ayer                  │  ← text-green-600 dark:text-green-500
└────────────────────────────────────┘
```

### Negative Trend (Red)
```
┌────────────────────────────────────┐
│ Transacciones             [🛒]    │
│                                    │
│ 45                                │
│                                    │
│ ↘ -8,2% vs semana pasada          │  ← text-red-600 dark:text-red-500
└────────────────────────────────────┘
```

### Neutral Trend (Gray)
```
┌────────────────────────────────────┐
│ Clientes Nuevos           [👥]    │
│                                    │
│ 12                                │
│                                    │
│ − 0% vs mes anterior              │  ← text-gray-600 dark:text-gray-400
└────────────────────────────────────┘
```

### No Trend
```
┌────────────────────────────────────┐
│ Productos Vendidos        [📦]    │
│                                    │
│ 237                               │
│                                    │
└────────────────────────────────────┘
```

### Loading State
```
┌────────────────────────────────────┐
│ ▭▭▭▭▭▭▭▭              [▭▭▭▭]      │  ← Skeleton animations
│                                    │
│ ▭▭▭▭▭▭▭▭▭                         │
│                                    │
│ ▭▭▭▭▭▭▭▭▭                         │
└────────────────────────────────────┘
```

## Responsive Grid Layout

### Mobile (1 column)
```
┌────────────────────┐
│ KPI Card 1         │
└────────────────────┘

┌────────────────────┐
│ KPI Card 2         │
└────────────────────┘

┌────────────────────┐
│ KPI Card 3         │
└────────────────────┘
```

### Tablet (2 columns at md breakpoint)
```
┌────────────────┐  ┌────────────────┐
│ KPI Card 1     │  │ KPI Card 2     │
└────────────────┘  └────────────────┘

┌────────────────┐  ┌────────────────┐
│ KPI Card 3     │  │ KPI Card 4     │
└────────────────┘  └────────────────┘
```

### Desktop (4 columns at lg breakpoint)
```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Card 1   │  │ Card 2   │  │ Card 3   │  │ Card 4   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

## Color Palette

### Trend Colors
- **Positive**: `text-green-600` / `dark:text-green-500`
- **Negative**: `text-red-600` / `dark:text-red-500`
- **Neutral**: `text-gray-600` / `dark:text-gray-400`

### Text Colors
- **Title**: `text-muted-foreground`
- **Value**: Default text color (inherits from theme)
- **Trend Label**: `text-muted-foreground`

### Background Colors
- **Card**: Default card background (from theme)
- **Icon Container**: `bg-primary/10 text-primary`

## Spacing & Typography

### Spacing
- Card padding: Default from Card component
- Header padding bottom: `pb-2`
- Content padding: Default from CardContent
- Trend margin top: `mt-2`
- Icon size: `h-10 w-10` (container), `h-5 w-5` (icon itself)
- Trend icon size: `h-4 w-4`

### Typography
- **Title**: `text-sm font-medium`
- **Value**: `text-3xl font-bold tabular-nums tracking-tight`
- **Trend**: `text-sm font-medium`
- **Trend Label**: `text-sm font-normal`

## Number Formatting Examples

### Spanish Colombia (es-CO) Locale

| Input | Formatted Output |
|-------|-----------------|
| 1250000 | 1.250.000 |
| 1250000.5 | 1.250.000,5 |
| 68.5 | 68,5 |
| 0.75 | 0,75 |
| -500 | -500 |

### With Prefix/Suffix

| Input | Prefix | Suffix | Output |
|-------|--------|--------|--------|
| 1250000 | $ | - | $1.250.000 |
| 68.5 | - | % | 68,5% |
| 3.14 | ~ | pts | ~3,14pts |

## Icon Usage

### Recommended Tabler Icons

```tsx
import {
  IconCash,           // Money/Sales
  IconShoppingCart,   // Transactions/Orders
  IconUsers,          // Customers/People
  IconPackage,        // Products/Inventory
  IconTrendingUp,     // Growth/Increase
  IconChartBar,       // Analytics/Reports
  IconCreditCard,     // Payments
  IconReceipt,        // Invoices/Bills
} from '@tabler/icons-react';
```

### Icon Size
Always use `className="h-5 w-5"` for icons passed to the component:
```tsx
icon={<IconCash className="h-5 w-5" />}
```

## Accessibility Features

### ARIA Labels
Trend indicators include descriptive ARIA labels:
- Positive: "Aumento de 15,5% vs ayer"
- Negative: "Disminución de 8,2% vs ayer"
- Neutral: "Sin cambio de 0% vs ayer"

### Semantic HTML
- Title uses `<h3>` tag for proper heading hierarchy
- Trend uses `<div>` with aria-label for screen readers

### Keyboard Navigation
- Card is keyboard accessible (inherited from Card component)
- Focus states are visible (shadcn/ui default styling)

## Dark Mode Support

All colors automatically adapt to dark mode:
- Trend colors use `dark:` variants
- Card background adapts to theme
- Icon container opacity adjusts for readability
- Text colors maintain proper contrast

## Implementation Checklist

When using the KPI Card component, ensure:

- ✅ Import from `@/components/dashboard/kpi-card` or `@/components/dashboard`
- ✅ Use Tabler Icons (not Lucide)
- ✅ Icon size is `h-5 w-5`
- ✅ Trend value is a number (positive, negative, or zero)
- ✅ Trend label is descriptive (e.g., "vs ayer", "vs mes anterior")
- ✅ Prefix/suffix are applied correctly for currency/percentage
- ✅ Loading state is handled when fetching data
- ✅ Grid layout uses responsive breakpoints (md:grid-cols-2 lg:grid-cols-4)
